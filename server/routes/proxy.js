/**
 * routes/proxy.js — ACS API Proxy (Backend-to-Backend)
 *
 * Flow: Frontend → /api/acs/* → THIS PROXY → ACS_BASE_URL/ext/*
 *
 * Auth strategy:
 *   - READ  requests: X-Service-Account: crm_backend  (read-only service)
 *   - WRITE requests: X-Service-Account: ops_console  (admin service)
 *   - Secrets never reach the frontend
 *
 * Features:
 *   - Timeout protection (10s)
 *   - Structured error responses
 *   - JSON response normalization (avoids stream hangs)
 *   - Multipart forwarding for face/fingerprint uploads
 *   - Binary response streaming for images
 */
const router = require('express').Router();
const fetch = require('node-fetch');
const AbortController = require('abort-controller');
const { requireAuth } = require('../middleware/auth');

// ── Config ──────────────────────────────────────────────────────────────────
const ACS_BASE = (process.env.ACS_BASE_URL || 'http://10.100.10.23:8080').replace(/\/$/, '');
const ACS_TIMEOUT = Number(process.env.ACS_TIMEOUT) || 10000; // 10s

// Service accounts
const ACS_SERVICE_ACCOUNT = process.env.ACS_SERVICE_ACCOUNT || 'crm_backend';
const ACS_SERVICE_SECRET  = process.env.ACS_SERVICE_SECRET  || 'crm-secret-2026';
const ACS_ADMIN_ACCOUNT   = process.env.ACS_ADMIN_ACCOUNT   || 'ops_console';
const ACS_ADMIN_SECRET    = process.env.ACS_ADMIN_SECRET    || 'ops-secret-2026';

/**
 * Get auth headers based on HTTP method.
 * Write operations (POST/PUT/PATCH/DELETE) use admin account.
 * Read operations (GET) use read-only service account.
 */
function getAcsHeaders(method) {
  const isWrite = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method?.toUpperCase());
  return {
    'X-Service-Account': isWrite ? ACS_ADMIN_ACCOUNT : ACS_SERVICE_ACCOUNT,
    'X-Service-Secret':  isWrite ? ACS_ADMIN_SECRET  : ACS_SERVICE_SECRET,
  };
}

/**
 * Fetch with timeout using AbortController.
 */
async function fetchWithTimeout(url, options, timeoutMs = ACS_TIMEOUT) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ── SSE Stream proxy (special case: EventSource cannot send headers) ─────
router.get('/v1/events/stream', (req, res) => {
  // Authenticate via ?token= since EventSource can't send Authorization header
  const token = req.query.token || req.headers['authorization']?.slice(7);
  if (token) {
    try {
      const jwt = require('jsonwebtoken');
      jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    } catch {
      return res.status(401).json({ ok: false, error: 'Токен недействителен' });
    }
  }

  // Build upstream URL
  const qp = new URLSearchParams();
  if (req.query.event_category) qp.set('event_category', req.query.event_category);
  const qs = qp.toString() ? `?${qp}` : '';
  const targetUrl = `${ACS_BASE}/ext/v1/events/stream${qs}`;

  console.log(`[proxy-sse] GET ${targetUrl}`);

  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const headers = {
    'Accept': 'text/event-stream',
    ...getAcsHeaders('GET'),
  };

  fetch(targetUrl, { headers })
    .then(acsRes => {
      acsRes.body.pipe(res);
      req.on('close', () => { acsRes.body.destroy(); });
    })
    .catch(err => {
      console.error('[proxy-sse] Error:', err.message);
      res.write(`data: ${JSON.stringify({ ok: false, error: err.message })}\n\n`);
      res.end();
    });
});

// ── Main proxy route ────────────────────────────────────────────────────────
router.all('/*', requireAuth, async (req, res) => {
  const acsPath = '/ext/' + req.params[0];
  const queryString = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  const targetUrl = `${ACS_BASE}${acsPath}${queryString}`;
  const startTime = Date.now();

  try {
    const isMultipart = (req.headers['content-type'] || '').includes('multipart/form-data');

    // ── Multipart requests (face/fingerprint uploads) ──
    if (isMultipart) {
      const headers = {
        ...getAcsHeaders(req.method),
        'content-type': req.headers['content-type'],
      };
      if (req.headers['x-idempotency-key']) headers['X-Idempotency-Key'] = req.headers['x-idempotency-key'];
      if (req.headers['x-request-id'])      headers['X-Request-ID']      = req.headers['x-request-id'];

      const acsRes = await fetchWithTimeout(targetUrl, {
        method: req.method,
        headers,
        body: req,
      });

      return await sendResponse(acsRes, res, targetUrl, startTime);
    }

    // ── Regular JSON requests ──
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...getAcsHeaders(req.method),
    };
    if (req.headers['x-idempotency-key']) headers['X-Idempotency-Key'] = req.headers['x-idempotency-key'];
    if (req.headers['x-request-id'])      headers['X-Request-ID']      = req.headers['x-request-id'];

    const options = { method: req.method, headers };

    // Forward body for write operations
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body && Object.keys(req.body).length > 0) {
      options.body = JSON.stringify(req.body);
    }

    console.log(`[proxy] ${req.method} ${targetUrl}`);
    const acsRes = await fetchWithTimeout(targetUrl, options);

    return await sendResponse(acsRes, res, targetUrl, startTime);

  } catch (err) {
    const elapsed = Date.now() - startTime;
    if (err.name === 'AbortError' || err.type === 'aborted') {
      console.error(`[proxy] TIMEOUT after ${elapsed}ms: ${targetUrl}`);
      return res.status(504).json({
        ok: false,
        error: `ACS не ответил за ${ACS_TIMEOUT / 1000}с`,
        target: targetUrl,
        elapsed,
      });
    }
    console.error(`[proxy] ERROR (${elapsed}ms):`, err.message);
    return res.status(502).json({
      ok: false,
      error: `Ошибка связи с ACS: ${err.message}`,
      target: targetUrl,
      elapsed,
    });
  }
});

/**
 * Send ACS response back to the client.
 * Handles binary (pipe) and text/JSON (parse) responses.
 */
async function sendResponse(acsRes, res, targetUrl, startTime) {
  const contentType = acsRes.headers.get('content-type') || '';
  const elapsed = Date.now() - startTime;
  console.log(`[proxy] ← ${acsRes.status} (${elapsed}ms) content-type="${contentType}" ${targetUrl}`);

  // Binary responses: stream directly
  const isBinary = /^(image|video|audio|application\/octet-stream)/i.test(contentType);
  if (isBinary) {
    res.status(acsRes.status);
    res.set('content-type', contentType);
    acsRes.body.pipe(res);
    return;
  }

  // Text/JSON responses: read as text, try parse
  const text = await acsRes.text();
  try {
    const json = JSON.parse(text);
    return res.status(acsRes.status).json(json);
  } catch {
    return res.status(acsRes.status).json({ ok: acsRes.ok, raw: text });
  }
}

module.exports = router;
