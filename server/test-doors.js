/**
 * test-doors.js — Подробная диагностика дверей
 * Запуск: node test-doors.js
 */
require('dotenv').config({ path: __dirname + '/.env' });
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const ACS_BASE = (process.env.ACS_BASE_URL || 'https://pbx.nettech.uz').replace(/\/$/, '');
const HEADERS = {
  'X-Service-Account': process.env.ACS_SERVICE_ACCOUNT || 'crm_backend',
  'X-Service-Secret':  process.env.ACS_SERVICE_SECRET  || 'crm-secret-2026',
  'Accept': 'application/json',
};

const lines = [];
const log = (...args) => { const l = args.join(' '); lines.push(l); console.log(l); };

async function get(endpoint) {
  const r = await fetch(`${ACS_BASE}${endpoint}`, { headers: HEADERS });
  return { status: r.status, data: await r.json() };
}

(async () => {
  log('=== ДИАГНОСТИКА ДВЕРЕЙ ===');
  log(`ACS: ${ACS_BASE}\n`);

  // 1. Все устройства
  log('── 1. GET /ext/v1/devices');
  const devRes = await get('/ext/v1/devices');
  const devices = devRes.data?.data || [];
  log(`   Всего устройств: ${devices.length}`);
  devices.forEach((d, i) => {
    log(`   [${i}] id=${d.id}  name=${d.name}  status=${d.status}  gateway_id=${d.gateway_id || 'N/A'}`);
  });

  // 2. Все двери (глобально)
  log('\n── 2. GET /ext/v1/doors');
  const doorRes = await get('/ext/v1/doors');
  const doors = doorRes.data?.data || [];
  log(`   Всего дверей: ${doors.length}`);
  doors.forEach((d, i) => {
    log(`   [${i}] gateway_id=${d.gateway_id}  door_no=${d.door_no}  name="${d.door_name}"  status=${d.status}`);
  });

  // 3. Проверим двери по каждому gateway отдельно
  const gateways = ['gateway-a', 'gateway-b', 'gateway-c', 'gateway-d'];
  log('\n── 3. Двери по gateway');
  for (const gw of gateways) {
    try {
      const r = await get(`/ext/v1/doors?gateway=${gw}`);
      const gwDoors = r.data?.data || [];
      if (gwDoors.length > 0 || r.status === 200) {
        log(`   ${gw}: ${gwDoors.length} дверей (status=${r.status})`);
        gwDoors.forEach(d => log(`     door_no=${d.door_no} name="${d.door_name}" status=${d.status}`));
      }
    } catch (e) {
      log(`   ${gw}: ERROR ${e.message}`);
    }
  }

  // 4. Попробуем door endpoints с device-related paths
  log('\n── 4. Проверяем /ext/v1/devices/* endpoints');
  for (const dev of devices) {
    const devId = dev.id;
    log(`\n   Device: ${dev.name} (${devId})`);
    
    // Попробуем capabilities
    try {
      const capRes = await get(`/ext/v1/device-management/capabilities?device_id=${devId}`);
      log(`     capabilities: status=${capRes.status}`);
      if (capRes.data?.data) {
        const c = capRes.data.data;
        log(`     supports_remote_control=${c.supports_remote_control} max_persons=${c.max_persons}`);
      }
    } catch(e) { log(`     capabilities: ERROR ${e.message}`); }

    // Попробуем двери по device_id
    try {
      const dRes = await get(`/ext/v1/doors?device_id=${devId}`);
      const dDoors = dRes.data?.data || [];
      log(`     doors?device_id: ${dDoors.length} дверей (status=${dRes.status})`);
    } catch(e) { log(`     doors?device_id: ERROR ${e.message}`); }
  }

  // 5. Полная структура ответа doors
  log('\n── 5. Полный JSON двери');
  log(JSON.stringify(doorRes.data, null, 2));

  log('\n=== ДИАГНОСТИКА ЗАВЕРШЕНА ===');
  fs.writeFileSync(path.join(__dirname, 'test-doors-output.txt'), lines.join('\n'), 'utf8');
})();
