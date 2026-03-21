/**
 * api/client.js — Frontend API client
 *
 * All requests go to OUR backend (/api/*), NOT directly to ACS.
 * The backend holds the ACS API key — it never reaches the browser.
 *
 * Path translation:
 *   /ext/v1/devices  →  /api/acs/v1/devices  (auto, backward-compat)
 *   /api/acs/...     →  /api/acs/...          (passthrough)
 *   /api/auth/...    →  /api/auth/...          (passthrough)
 */

const getToken = () => localStorage.getItem('acs_user_token');

/**
 * Translates old ACS paths to new backend paths.
 * /ext/v1/devices → /api/acs/v1/devices
 */
function translatePath(path) {
  if (path.startsWith('/ext/')) {
    return '/api/acs/' + path.slice('/ext/'.length);
  }
  return path;
}

/**
 * Generic fetch to our backend.
 * Supports both old /ext/v1/... paths (auto-translated) and new /api/... paths.
 */
export async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const url = translatePath(path.startsWith('/') ? path : `/${path}`);

  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message = data?.error || data?.error?.message || data?.detail || `HTTP ${res.status}`;
    throw new Error(message);
  }

  return data;
}

/**
 * Login with username + password (our backend).
 */
export async function login(username, password) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: username.trim(), password }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.error || `HTTP ${res.status}: Ошибка входа`);
  }

  const { token, user } = data;
  if (!token) throw new Error('Сервер не вернул токен');

  localStorage.setItem('acs_user_token', token);
  localStorage.setItem('acs_user', JSON.stringify(user));
  return { token, user };
}

export function logout() {
  localStorage.removeItem('acs_user_token');
  localStorage.removeItem('acs_user');
}

export function isAuthenticated() {
  return !!getToken();
}

export function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('acs_user') || 'null');
  } catch {
    return null;
  }
}
