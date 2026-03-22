/**
 * api/client.js — Frontend API client (production-ready)
 *
 * All requests go to OUR backend (/api/*), NOT directly to ACS.
 * The backend holds the ACS Service Account secrets — they never reach the browser.
 *
 * Path translation:
 *   /ext/v1/devices  →  /api/acs/v1/devices  (auto, backward-compat)
 *   /api/acs/...     →  /api/acs/...          (passthrough)
 *   /api/auth/...    →  /api/auth/...         (passthrough)
 */

const TOKEN_KEY = 'acs_user_token';
const USER_KEY  = 'acs_user';

const getToken = () => localStorage.getItem(TOKEN_KEY);

/**
 * Translates old ACS paths to backend proxy paths.
 * /ext/v1/devices → /api/acs/v1/devices
 */
function translatePath(path) {
  const p = path.startsWith('/') ? path : `/${path}`;
  if (p.startsWith('/ext/')) {
    return '/api/acs/' + p.slice('/ext/'.length);
  }
  return p;
}

/**
 * Generic fetch to our backend.
 * Uses res.text() + JSON.parse instead of res.json() to avoid stream hangs.
 *
 * @param {string} path  — API path (e.g. '/ext/v1/devices' or '/api/acs/v1/devices')
 * @param {object} options — fetch options (method, body, headers, etc.)
 * @returns {Promise<object>} parsed JSON response
 * @throws {Error} on HTTP errors or network failures
 */
export async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const url = translatePath(path);

  // Use AbortController for timeout (10 seconds)
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    // Read as text first (avoids stream hang with Vite proxy)
    const text = await res.text();

    // Try parse JSON
    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      // Not valid JSON — wrap raw text
      data = { ok: res.ok, raw: text };
    }

    if (!res.ok) {
      const message =
        (typeof data?.error === 'string' ? data.error : null) ||
        data?.error?.message ||
        data?.detail ||
        `HTTP ${res.status}`;
      const err = new Error(message);
      err.status = res.status;
      err.data = data;
      throw err;
    }

    return data;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Таймаут запроса (15с). Сервер не ответил.');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Login with username + password.
 */
export async function login(username, password) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: username.trim(), password }),
  });

  const text = await res.text();
  let data = {};
  try { data = JSON.parse(text); } catch { /* ignore */ }

  if (!res.ok) {
    throw new Error(data?.error || `HTTP ${res.status}: Ошибка входа`);
  }

  const { token, user } = data;
  if (!token) throw new Error('Сервер не вернул токен');

  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  return { token, user };
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isAuthenticated() {
  return !!getToken();
}

export function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
  } catch {
    return null;
  }
}
