/**
 * test-acs.js — Диагностика ACS API
 *
 * Запуск:  node test-acs.js
 *
 * Проверяет:
 *  1) Прямой запрос к ACS API (devices)
 *  2) Прямой запрос через наш backend proxy
 *  3) Все основные endpoints
 */
require('dotenv').config({ path: __dirname + '/.env' });
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const logLines = [];
const _log = console.log;
console.log = (...args) => { const line = args.join(' '); logLines.push(line); _log(...args); };
process.on('exit', () => {
  fs.writeFileSync(path.join(__dirname, 'test-output.txt'), logLines.join('\n'), 'utf8');
});

const ACS_BASE = process.env.ACS_BASE_URL || 'http://10.100.10.23:8080';
const BACKEND  = 'http://localhost:3001';

const SVC_HEADERS = {
  'X-Service-Account': process.env.ACS_SERVICE_ACCOUNT || 'crm_backend',
  'X-Service-Secret':  process.env.ACS_SERVICE_SECRET  || 'crm-secret-2026',
};

async function testDirect(endpoint) {
  console.log(`\n── Прямой: GET ${ACS_BASE}${endpoint}`);
  try {
    const r = await fetch(`${ACS_BASE}${endpoint}`, { headers: SVC_HEADERS, timeout: 5000 });
    const text = await r.text();
    let json;
    try { json = JSON.parse(text); } catch { json = null; }
    console.log(`   Status: ${r.status}`);
    console.log(`   Content-Type: ${r.headers.get('content-type')}`);
    if (json) {
      const count = json.data?.length || json.items?.length || 0;
      console.log(`   Items: ${count}`);
      console.log(`   Pagination: ${JSON.stringify(json.pagination || 'N/A')}`);
      if (json.data?.[0]) {
        console.log(`   Первый элемент (ключи): ${Object.keys(json.data[0]).join(', ')}`);
        console.log(`   Первый элемент:`, JSON.stringify(json.data[0], null, 2).slice(0, 500));
      }
    } else {
      console.log(`   Ответ (текст): ${text.slice(0, 200)}`);
    }
    return json;
  } catch (e) {
    console.log(`   ❌ ОШИБКА: ${e.message}`);
    return null;
  }
}

async function testBackendProxy(endpoint) {
  // Сначала логинимся
  console.log(`\n── Proxy: POST ${BACKEND}/api/auth/login`);
  try {
    const loginRes = await fetch(`${BACKEND}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' }),
    });
    const loginData = await loginRes.json();
    if (!loginData.ok || !loginData.token) {
      console.log(`   ❌ Не удалось залогиниться: ${JSON.stringify(loginData)}`);
      return null;
    }
    console.log(`   ✅ Логин OK, токен получен`);

    const proxyPath = `/api/acs/${endpoint.replace(/^\/ext\//, '')}`;
    console.log(`\n── Proxy: GET ${BACKEND}${proxyPath}`);
    const r = await fetch(`${BACKEND}${proxyPath}`, {
      headers: { 'Authorization': `Bearer ${loginData.token}` },
    });
    const text = await r.text();
    let json;
    try { json = JSON.parse(text); } catch { json = null; }
    console.log(`   Status: ${r.status}`);
    console.log(`   Content-Type: ${r.headers.get('content-type')}`);
    if (json) {
      const count = json.data?.length || json.items?.length || 0;
      console.log(`   Items: ${count}`);
      if (json.data?.[0]) {
        console.log(`   Первый элемент (ключи): ${Object.keys(json.data[0]).join(', ')}`);
      }
    } else {
      console.log(`   Ответ (текст): ${text.slice(0, 200)}`);
    }
    return json;
  } catch (e) {
    console.log(`   ❌ ОШИБКА: ${e.message}`);
    return null;
  }
}

(async () => {
  console.log('='.repeat(60));
  console.log('ACS DASHBOARD — ДИАГНОСТИКА');
  console.log('='.repeat(60));
  console.log(`ACS Base: ${ACS_BASE}`);
  console.log(`Backend:  ${BACKEND}`);
  console.log(`Service:  ${SVC_HEADERS['X-Service-Account']}`);

  // 1. Прямой запрос к ACS
  await testDirect('/ext/v1/devices');
  await testDirect('/ext/v1/doors');
  await testDirect('/ext/v1/persons?limit=3');

  // 2. Через наш backend proxy
  await testBackendProxy('/ext/v1/devices');

  console.log('\n' + '='.repeat(60));
  console.log('ДИАГНОСТИКА ЗАВЕРШЕНА');
  console.log('='.repeat(60));
})();
