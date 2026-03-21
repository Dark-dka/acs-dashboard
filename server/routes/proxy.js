/**
 * routes/proxy.js — ACS API Proxy
 *
 * ALL /api/acs/* → https://pbx.nettech.uz/ext/*
 *
 * The ACS API key is injected server-side from .env — never exposed to frontend.
 * First, we exchange the API key for a JWT from ACS, cache it, and use it on each request.
 */
const router = require('express').Router();
const fetch = require('node-fetch');
const { requireAuth } = require('../middleware/auth');

const ACS_BASE = (process.env.ACS_BASE_URL || 'https://pbx.nettech.uz').replace(/\/$/, '');
const ACS_API_KEY = process.env.ACS_API_KEY || 'dev-key-2026';

// Cache the ACS JWT to avoid getting a new one on every request
let acsJwt = null;
let acsJwtExpiry = 0;

async function getAcsToken() {
  const now = Date.now();
  // Refresh if expired or missing (refresh 5 min before expiry)
  if (acsJwt && now < acsJwtExpiry - 5 * 60 * 1000) {
    return acsJwt;
  }
  const res = await fetch(`${ACS_BASE}/ext/v1/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: ACS_API_KEY, role: 'admin' }),
  });
  const data = await res.json();
  // Token lives ~1h by default; cache for 50 min
  acsJwt = data?.data?.token || data?.token || data?.access_token;
  acsJwtExpiry = now + 50 * 60 * 1000;
  return acsJwt;
}

// ALL /api/acs/* → ACS API
router.all('/*', requireAuth, async (req, res) => {
  try {
    // Map /api/acs/v1/devices → /ext/v1/devices
    const acsPath = '/ext/' + req.params[0];
    const queryString = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    const targetUrl = `${ACS_BASE}${acsPath}${queryString}`;

    const token = await getAcsToken();

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    // Use Bearer token if we got one, otherwise fallback to X-API-Key
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      headers['X-API-Key'] = ACS_API_KEY;
    }

    // Forward idempotency / request-id headers if present
    if (req.headers['x-idempotency-key']) headers['X-Idempotency-Key'] = req.headers['x-idempotency-key'];
    if (req.headers['x-request-id']) headers['X-Request-ID'] = req.headers['x-request-id'];

    const options = {
      method: req.method,
      headers,
    };

    // Forward body for POST/PUT/PATCH
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
      options.body = JSON.stringify(req.body);
    }

    const acsRes = await fetch(targetUrl, options);
    const contentType = acsRes.headers.get('content-type') || '';

    // Stream binary responses (images, etc)
    if (!contentType.includes('application/json')) {
      res.status(acsRes.status);
      acsRes.body.pipe(res);
      return;
    }

    const json = await acsRes.json();
    return res.status(acsRes.status).json(json);
  } catch (err) {
    console.error('[proxy]', err.message);
    return res.status(502).json({ ok: false, error: `Ошибка связи с ACS: ${err.message}` });
  }
});

module.exports = router;
