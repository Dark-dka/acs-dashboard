# ISUP ACS Platform — API Gateway Full Reference

> **Base URL:** `http://10.100.10.23:8080`
> **Swagger UI:** `http://10.100.10.23:8080/ext/docs`
> **ReDoc:** `http://10.100.10.23:8080/ext/redoc`
> **Version:** 3.0.0
> **Last tested:** 2026-03-20

---

## Оглавление

1. [Аутентификация](#аутентификация)
2. [Формат ответов](#формат-ответов)
3. [Статус всех эндпоинтов](#статус-всех-эндпоинтов)
4. [System / Health](#1-system--health)
5. [Devices](#2-devices)
6. [Persons](#3-persons)
7. [Credentials](#4-credentials)
8. [Doors](#5-doors)
9. [Events](#6-events)
10. [Access Policies](#7-access-policies)
11. [Device Management](#8-device-management-new)
12. [Audit](#9-audit)

---

## Аутентификация

### Способ 1: Service Account (рекомендуемый)

```
X-Service-Account: crm_backend
X-Service-Secret: crm-secret-2026
```

| Аккаунт | Роль | Доступ |
|---------|------|--------|
| `crm_backend` | operator | Чтение + запись persons/credentials |
| `ops_console` | admin | Полный доступ ко всем эндпоинтам |

### Способ 2: API Key (для разработки)

```
X-API-Key: dev-api-key-2026
```

### Способ 3: JWT Token

```bash
# Получить токен:
curl -X POST http://10.100.10.23:8080/ext/v1/auth/token \
  -H "X-API-Key: dev-api-key-2026" \
  -H "Content-Type: application/json" \
  -d '{"role": "operator"}'

# Использовать:
Authorization: Bearer <token>
```

---

## Формат ответов

Все ответы API обёрнуты в единый формат:

**Успех (один объект):**
```json
{"ok": true, "data": {...}}
```

**Успех (список):**
```json
{"ok": true, "data": [...], "pagination": {"total": N, "limit": N, "offset": N}}
```

**Команда (write-операции):**
```json
{"ok": true, "data": {...}, "command": {"id": "...", "correlation_id": "...", "action": "..."}}
```

**Ошибка:**
```json
{"ok": false, "error": {"code": "...", "message": "..."}}
```

---

## Статус всех эндпоинтов

### Результаты тестирования: **29/32 ✅**

| # | Метод | Путь | Статус | Заметки |
|---|-------|------|--------|---------|
| 1 | GET | `/health` | ✅ 200 | |
| 2 | GET | `/ext/v1/health` | ✅ 200 | Все сервисы healthy |
| 3 | POST | `/ext/v1/auth/token` | ⚠️ 401 | Требует правильный ключ |
| 4 | GET | `/ext/v1/devices` | ✅ 200 | |
| 5 | GET | `/ext/v1/persons` | ✅ 200 | |
| 6 | GET | `/ext/v1/persons?limit=N` | ✅ 200 | Пагинация работает |
| 7 | GET | `/ext/v1/credentials/cards` | ✅ 200 | |
| 8 | GET | `/ext/v1/credentials/fingerprints` | ✅ 200 | |
| 9 | GET | `/ext/v1/credentials/faces` | ✅ 200 | |
| 10 | GET | `/ext/v1/credentials/capabilities` | ✅ 200 | |
| 11 | GET | `/ext/v1/doors` | ✅ 200 | 2 шлюза |
| 12 | GET | `/ext/v1/doors/{no}` | ✅ 200 | |
| 13 | GET | `/ext/v1/doors/capabilities` | ✅ 200 | |
| 14 | POST | `/ext/v1/doors/{no}/actions` | ✅ 200 | admin only |
| 15 | GET | `/ext/v1/events` | ✅ 200 | |
| 16 | GET | `/ext/v1/events?event_type=X` | ✅ 200 | Фильтрация работает |
| 17 | GET | `/ext/v1/access-policies/week-plans` | ✅ 200 | DB-backed список |
| 18 | GET | `/ext/v1/access-policies/week-plans/{no}` | ✅ 200 | **NEW** С устройства |
| 19 | PUT | `/ext/v1/access-policies/week-plans/{no}` | ✅ | **NEW** admin only |
| 20 | GET | `/ext/v1/access-policies/plan-templates` | ✅ 200 | DB-backed список |
| 21 | GET | `/ext/v1/access-policies/plan-templates/{no}` | ✅ 200 | **NEW** С устройства |
| 22 | PUT | `/ext/v1/access-policies/plan-templates/{no}` | ✅ | **NEW** admin only |
| 23 | GET | `/ext/v1/access-policies/holiday-plans/{no}` | ✅ 200 | **NEW** |
| 24 | PUT | `/ext/v1/access-policies/holiday-plans/{no}` | ✅ | **NEW** admin only |
| 25 | GET | `/ext/v1/access-policies/holiday-groups/{no}` | ✅ 200 | **NEW** |
| 26 | PUT | `/ext/v1/access-policies/holiday-groups/{no}` | ✅ | **NEW** admin only |
| 27 | GET | `/ext/v1/access-policies/assignments` | ✅ 200 | |
| 28 | GET | `/ext/v1/device-management/capabilities` | ✅ 200 | **NEW** |
| 29 | GET | `/ext/v1/device-management/person-count` | ✅ 200 | **NEW** |
| 30 | GET | `/ext/v1/device-management/persons` | ✅ 200 | **NEW** |
| 31 | GET | `/ext/v1/device-management/cards` | ✅ 200 | **NEW** |
| 32 | GET | `/ext/v1/device-management/mode-b-status` | ✅ 200 | **NEW** |
| 33 | PUT | `/ext/v1/device-management/doors/{no}/params` | ✅ | **NEW** admin only |
| 34 | POST | `/ext/v1/device-management/fingerprint/capture` | ✅ | **NEW** admin only |
| 35 | POST | `/ext/v1/device-management/fingerprint/add` | ✅ | **NEW** admin only |
| 36 | POST | `/ext/v1/device-management/face/upload` | ✅ | **NEW** admin only |
| 37 | POST | `/ext/v1/device-management/passthrough` | ⚠️ 502 | **NEW** admin, 403 от шлюза |
| 38 | GET | `/ext/v1/audit/log` | ✅ 200 | |

---

## 1. System / Health

### `GET /health` — Liveness check

```bash
curl http://10.100.10.23:8080/health
```

**Ответ:**
```json
{
  "status": "ok",
  "service": "api-gateway",
  "version": "3.0.0"
}
```

### `GET /ext/v1/health` — Platform health (все сервисы)

```bash
curl http://10.100.10.23:8080/ext/v1/health \
  -H "X-Service-Account: crm_backend" \
  -H "X-Service-Secret: crm-secret-2026"
```

**Ответ:**
```json
{
  "ok": true,
  "data": {
    "status": "healthy",
    "services": {
      "device-registry": "ok",
      "person-service": "ok",
      "credential-service": "ok",
      "access-policy-service": "ok",
      "event-history-service": "ok",
      "sync-service": "ok",
      "gateway-adapter": "ok",
      "gateway-adapter-b": "ok"
    },
    "auth": "jwt+apikey",
    "version": "2.0.0"
  }
}
```

---

## 2. Devices

### `GET /ext/v1/devices` — Список устройств

Возвращает устройства из device-registry (база данных платформы).

```bash
curl http://10.100.10.23:8080/ext/v1/devices \
  -H "X-Service-Account: crm_backend" \
  -H "X-Service-Secret: crm-secret-2026"
```

**Query параметры:** `limit` (default 50), `offset` (default 0), `status`

**Ответ:**
```json
{
  "ok": true,
  "data": [],
  "pagination": {"total": 0, "limit": 50, "offset": 0}
}
```

---

## 3. Persons

### `GET /ext/v1/persons` — Список людей (из БД платформы)

```bash
curl 'http://10.100.10.23:8080/ext/v1/persons?limit=2' \
  -H "X-Service-Account: crm_backend" \
  -H "X-Service-Secret: crm-secret-2026"
```

**Query параметры:** `limit` (1-200, default 50), `offset` (default 0), `department`, `deploy_status`

**Ответ:**
```json
{
  "ok": true,
  "data": [
    {
      "id": "1cd06d2c-9dce-4cac-9734-fef01b61fdea",
      "employee_no": 4,
      "first_name": "Should",
      "last_name": "Fail",
      "department": null,
      "phone": null,
      "email": null,
      "deploy_status": "pending",
      "door_rights": [1],
      "created_at": "2026-03-20T06:45:26.290026Z",
      "updated_at": "2026-03-20T06:45:26.290026Z"
    }
  ],
  "pagination": {"total": 2, "limit": 2, "offset": 0}
}
```

### `POST /ext/v1/persons` — Создать человека

```bash
curl -X POST http://10.100.10.23:8080/ext/v1/persons \
  -H "X-Service-Account: crm_backend" \
  -H "X-Service-Secret: crm-secret-2026" \
  -H "Content-Type: application/json" \
  -d '{
    "employee_no": 999,
    "first_name": "Тест",
    "last_name": "Пользователь",
    "department": "IT",
    "door_rights": [1]
  }'
```

---

## 4. Credentials

### `GET /ext/v1/credentials/cards` — Список карт (из БД)

```bash
curl http://10.100.10.23:8080/ext/v1/credentials/cards \
  -H "X-Service-Account: crm_backend" \
  -H "X-Service-Secret: crm-secret-2026"
```

**Ответ:**
```json
{
  "ok": true,
  "data": [],
  "pagination": {"total": 0, "limit": 50, "offset": 0}
}
```

### `GET /ext/v1/credentials/fingerprints` — Список отпечатков (из БД)

```bash
curl http://10.100.10.23:8080/ext/v1/credentials/fingerprints \
  -H "X-Service-Account: crm_backend" \
  -H "X-Service-Secret: crm-secret-2026"
```

### `GET /ext/v1/credentials/faces` — Список лиц (из БД)

```bash
curl http://10.100.10.23:8080/ext/v1/credentials/faces \
  -H "X-Service-Account: crm_backend" \
  -H "X-Service-Secret: crm-secret-2026"
```

### `GET /ext/v1/credentials/capabilities` — Возможности credentials

Что поддерживается через внешний API vs только внутренний:

```bash
curl http://10.100.10.23:8080/ext/v1/credentials/capabilities \
  -H "X-Service-Account: crm_backend" \
  -H "X-Service-Secret: crm-secret-2026"
```

**Ответ:**
```json
{
  "ok": true,
  "data": {
    "externally_supported": {
      "cards": {"list": true, "create": true, "delete": true,
                "note": "Card delete requires employee_no query param for person context"},
      "fingerprints": {"list": true, "create": false, "delete": false,
                       "note": "Fingerprint capture requires physical device interaction — internal only"},
      "faces": {"list": false, "create": false, "delete": false,
                "note": "Face management via gateway-adapter ISAPI — deferred for external API"}
    },
    "internal_only": ["fingerprint_capture", "card_read_from_device", "face_upload_via_isapi"]
  }
}
```

---

## 5. Doors

### `GET /ext/v1/doors` — Список дверей

Собирает двери со ВСЕХ шлюзов (gateway-a, gateway-b).

```bash
curl http://10.100.10.23:8080/ext/v1/doors \
  -H "X-Service-Account: crm_backend" \
  -H "X-Service-Secret: crm-secret-2026"
```

**Ответ:**
```json
{
  "ok": true,
  "data": [
    {
      "gateway_id": "gateway-a",
      "gateway_name": "Gateway A (Ranch)",
      "door_no": 1,
      "door_name": "",
      "status": "available",
      "open_duration": null,
      "close_timeout": null
    },
    {
      "gateway_id": "gateway-b",
      "gateway_name": "Gateway B (Lab)",
      "door_no": 1,
      "door_name": "",
      "status": "available",
      "open_duration": null,
      "close_timeout": null
    }
  ],
  "pagination": {"total": 2, "limit": 100, "offset": 0}
}
```

### `GET /ext/v1/doors/{door_no}` — Параметры двери

```bash
curl 'http://10.100.10.23:8080/ext/v1/doors/1?gateway=gateway-a' \
  -H "X-Service-Account: crm_backend" \
  -H "X-Service-Secret: crm-secret-2026"
```

**Ответ:**
```json
{
  "ok": true,
  "data": {
    "door_no": 1,
    "gateway": "gateway-a",
    "door_name": "",
    "open_duration": null,
    "close_timeout": null,
    "magnetic_type": null
  }
}
```

### `GET /ext/v1/doors/capabilities` — Возможности дверей

```bash
curl http://10.100.10.23:8080/ext/v1/doors/capabilities \
  -H "X-Service-Account: crm_backend" \
  -H "X-Service-Secret: crm-secret-2026"
```

**Ответ:**
```json
{
  "ok": true,
  "data": {
    "gateways": [
      {
        "gateway_id": "gateway-a",
        "gateway_name": "Gateway A (Ranch)",
        "actions": ["open", "close", "always-open", "always-close"],
        "status_available": true,
        "reachable": true
      },
      {
        "gateway_id": "gateway-b",
        "gateway_name": "Gateway B (Lab)",
        "actions": ["open", "close", "always-open", "always-close"],
        "status_available": true,
        "reachable": true
      }
    ]
  }
}
```

### `POST /ext/v1/doors/{door_no}/actions` — 🔑 Действие с дверью (admin)

**Действия:** `open`, `close`, `always-open`, `always-close`

```bash
curl -X POST 'http://10.100.10.23:8080/ext/v1/doors/1/actions?gateway=gateway-a' \
  -H "X-Service-Account: ops_console" \
  -H "X-Service-Secret: ops-secret-2026" \
  -H "Content-Type: application/json" \
  -d '{"action": "open"}'
```

**Ответ:**
```json
{
  "ok": true,
  "data": {
    "door_no": 1,
    "gateway": "gateway-a",
    "action": "open",
    "result": "success",
    "device_response": {
      "errorCode": 1,
      "errorMsg": "Operation completed.",
      "statusCode": 1,
      "statusString": "OK",
      "subStatusCode": "ok"
    }
  },
  "command": {
    "id": "e8fb6adb-707",
    "correlation_id": "10bc6587-99a",
    "action": "door.open"
  }
}
```

---

## 6. Events

### `GET /ext/v1/events` — Список событий

```bash
curl 'http://10.100.10.23:8080/ext/v1/events?limit=3' \
  -H "X-Service-Account: crm_backend" \
  -H "X-Service-Secret: crm-secret-2026"
```

**Query параметры:** `limit`, `offset`, `event_type`, `event_category`, `since`, `until`

**Фильтрация по типу:**
```bash
curl 'http://10.100.10.23:8080/ext/v1/events?event_type=ACCESS_GRANTED&limit=2' \
  -H "X-Service-Account: crm_backend" \
  -H "X-Service-Secret: crm-secret-2026"
```

**Ответ:**
```json
{
  "ok": true,
  "data": [
    {
      "id": "78292fb2-d1b4-4653-960c-7a1637c59567",
      "timestamp": "2026-03-20T05:51:58Z",
      "event_type": "ACCESS_GRANTED",
      "event_category": "ACCESS_CONTROL",
      "success": true,
      "credential_type": "FINGERPRINT",
      "person": {"name": null, "employee_no": 100},
      "door": {"no": 1},
      "device_serial": null,
      "description": "38"
    }
  ],
  "pagination": {"total": 3, "limit": 2, "offset": 0}
}
```

**Типы событий:**
- `ACCESS_GRANTED` — успешный проход
- `ACCESS_DENIED` — отказ в доступе
- `DOOR_OPENED` — дверь открылась
- `DEVICE_ONLINE` / `DEVICE_OFFLINE` — статус устройства

**Типы credentials:** `FINGERPRINT`, `CARD`, `FACE`, `NONE`

---

## 7. Access Policies

### `GET /ext/v1/access-policies/week-plans` — Список недельных планов (из БД)

```bash
curl http://10.100.10.23:8080/ext/v1/access-policies/week-plans \
  -H "X-Service-Account: crm_backend" \
  -H "X-Service-Secret: crm-secret-2026"
```

### `GET /ext/v1/access-policies/week-plans/{no}` — 🆕 Недельный план с устройства

Читает расписание напрямую с физического устройства через ISAPI.

```bash
curl 'http://10.100.10.23:8080/ext/v1/access-policies/week-plans/1?gateway=gateway-a' \
  -H "X-Service-Account: crm_backend" \
  -H "X-Service-Secret: crm-secret-2026"
```

**Ответ (сокращённо):**
```json
{
  "ok": true,
  "data": {
    "UserRightWeekPlanCfg": {
      "enable": true,
      "WeekPlanCfg": [
        {"week": "Monday", "id": 1, "enable": true,
         "TimeSegment": {"beginTime": "00:00:00", "endTime": "24:00:00"}},
        {"week": "Monday", "id": 2, "enable": false,
         "TimeSegment": {"beginTime": "00:00:00", "endTime": "00:00:00"}},
        {"week": "Tuesday", "id": 1, "enable": true,
         "TimeSegment": {"beginTime": "00:00:00", "endTime": "24:00:00"}}
      ]
    }
  }
}
```

> Каждый день недели имеет 8 временных сегментов (id 1-8). Только segment 1 для каждого дня включён (00:00–24:00 = весь день).

### `PUT /ext/v1/access-policies/week-plans/{no}` — 🆕🔑 Записать недельный план (admin)

```bash
curl -X PUT 'http://10.100.10.23:8080/ext/v1/access-policies/week-plans/1?gateway=gateway-a' \
  -H "X-Service-Account: ops_console" \
  -H "X-Service-Secret: ops-secret-2026" \
  -H "Content-Type: application/json" \
  -d '{
    "UserRightWeekPlanCfg": {
      "enable": true,
      "WeekPlanCfg": [
        {"week": "Monday", "id": 1, "enable": true,
         "TimeSegment": {"beginTime": "09:00:00", "endTime": "18:00:00"}}
      ]
    }
  }'
```

### `GET /ext/v1/access-policies/plan-templates/{no}` — 🆕 Шаблон расписания

```bash
curl 'http://10.100.10.23:8080/ext/v1/access-policies/plan-templates/1?gateway=gateway-a' \
  -H "X-Service-Account: crm_backend" \
  -H "X-Service-Secret: crm-secret-2026"
```

**Ответ:**
```json
{
  "ok": true,
  "data": {
    "UserRightPlanTemplate": {
      "enable": true,
      "templateName": "",
      "weekPlanNo": 1,
      "holidayGroupNo": ""
    }
  }
}
```

### `PUT /ext/v1/access-policies/plan-templates/{no}` — 🆕🔑 Записать шаблон (admin)

```bash
curl -X PUT 'http://10.100.10.23:8080/ext/v1/access-policies/plan-templates/1?gateway=gateway-a' \
  -H "X-Service-Account: ops_console" \
  -H "X-Service-Secret: ops-secret-2026" \
  -H "Content-Type: application/json" \
  -d '{
    "UserRightPlanTemplate": {
      "enable": true,
      "templateName": "Рабочее время",
      "weekPlanNo": 1,
      "holidayGroupNo": "1"
    }
  }'
```

### `GET /ext/v1/access-policies/holiday-plans/{no}` — 🆕 Праздничный план

```bash
curl 'http://10.100.10.23:8080/ext/v1/access-policies/holiday-plans/1?gateway=gateway-a' \
  -H "X-Service-Account: crm_backend" \
  -H "X-Service-Secret: crm-secret-2026"
```

**Ответ:**
```json
{
  "ok": true,
  "data": {
    "UserRightHolidayPlanCfg": {
      "enable": false,
      "beginDate": "1970-01-01",
      "endDate": "2037-12-31",
      "HolidayPlanCfg": [
        {"id": 1, "enable": false,
         "TimeSegment": {"beginTime": "00:00:00", "endTime": "00:00:00"}},
        {"id": 2, "enable": false,
         "TimeSegment": {"beginTime": "00:00:00", "endTime": "00:00:00"}}
      ]
    }
  }
}
```

### `PUT /ext/v1/access-policies/holiday-plans/{no}` — 🆕🔑 Записать праздничный план (admin)

Пример: Наурыз 2026 — двери закрыты весь день:

```bash
curl -X PUT 'http://10.100.10.23:8080/ext/v1/access-policies/holiday-plans/1?gateway=gateway-a' \
  -H "X-Service-Account: ops_console" \
  -H "X-Service-Secret: ops-secret-2026" \
  -H "Content-Type: application/json" \
  -d '{
    "UserRightHolidayPlanCfg": {
      "enable": true,
      "beginDate": "2026-03-22",
      "endDate": "2026-03-22",
      "HolidayPlanCfg": [
        {"id": 1, "enable": false,
         "TimeSegment": {"beginTime": "00:00:00", "endTime": "00:00:00"}}
      ]
    }
  }'
```

### `GET /ext/v1/access-policies/holiday-groups/{no}` — 🆕 Группа праздников

```bash
curl 'http://10.100.10.23:8080/ext/v1/access-policies/holiday-groups/1?gateway=gateway-a' \
  -H "X-Service-Account: crm_backend" \
  -H "X-Service-Secret: crm-secret-2026"
```

**Ответ:**
```json
{
  "ok": true,
  "data": {
    "UserRightHolidayGroupCfg": {
      "enable": false,
      "groupName": "",
      "holidayPlanNo": ""
    }
  }
}
```

### `PUT /ext/v1/access-policies/holiday-groups/{no}` — 🆕🔑 Записать группу праздников (admin)

```bash
curl -X PUT 'http://10.100.10.23:8080/ext/v1/access-policies/holiday-groups/1?gateway=gateway-a' \
  -H "X-Service-Account: ops_console" \
  -H "X-Service-Secret: ops-secret-2026" \
  -H "Content-Type: application/json" \
  -d '{
    "UserRightHolidayGroupCfg": {
      "enable": true,
      "groupName": "Гос. праздники 2026",
      "holidayPlanNo": "1,2,3"
    }
  }'
```

### `GET /ext/v1/access-policies/assignments` — Назначения политик

```bash
curl http://10.100.10.23:8080/ext/v1/access-policies/assignments \
  -H "X-Service-Account: crm_backend" \
  -H "X-Service-Secret: crm-secret-2026"
```

---

## 8. Device Management (NEW)

> Эти эндпоинты работают напрямую с физическим устройством через gateway-adapter. Данные не из базы данных платформы, а с самого устройства.

### `GET /ext/v1/device-management/capabilities` — 🆕 Возможности устройства

```bash
curl 'http://10.100.10.23:8080/ext/v1/device-management/capabilities?gateway=gateway-a' \
  -H "X-Service-Account: crm_backend" \
  -H "X-Service-Secret: crm-secret-2026"
```

**Ответ:**
```json
{
  "ok": true,
  "data": {
    "door_count": 0,
    "reader_count": 0,
    "max_cards": 0,
    "max_faces": 0,
    "max_fingerprints": 0,
    "max_persons": 0,
    "supports_face": false,
    "supports_fingerprint": false,
    "supports_card": true,
    "supports_qr": false,
    "supports_remote_control": false,
    "supports_event_search": false,
    "raw": {
      "voicePrompt": "true,false",
      "uploadCapPic": "true,false",
      "saveCapPic": "true,false",
      "showPicture": "true,false",
      "showEmployeeNo": "true,false",
      "showName": "true,false"
    }
  }
}
```

### `GET /ext/v1/device-management/person-count` — 🆕 Кол-во людей на устройстве

```bash
curl 'http://10.100.10.23:8080/ext/v1/device-management/person-count?gateway=gateway-a' \
  -H "X-Service-Account: crm_backend" \
  -H "X-Service-Secret: crm-secret-2026"
```

**Ответ:**
```json
{
  "ok": true,
  "data": {"count": 4}
}
```

### `GET /ext/v1/device-management/persons` — 🆕 Список людей на устройстве

**Отличие от `/ext/v1/persons`:** тот читает из БД платформы, этот — напрямую с устройства.

```bash
curl 'http://10.100.10.23:8080/ext/v1/device-management/persons?gateway=gateway-a&max_results=3' \
  -H "X-Service-Account: crm_backend" \
  -H "X-Service-Secret: crm-secret-2026"
```

**Query параметры:** `gateway` (default gateway-a), `position` (default 0), `max_results` (1-100, default 30)

**Ответ:**
```json
{
  "ok": true,
  "data": [
    {
      "employee_no": "100000",
      "name": "Diyorbek Ismoilov",
      "user_type": "normal",
      "valid": true,
      "valid_begin": "2024-01-01T00:00:00",
      "valid_end": "2035-12-31T23:59:59",
      "door_rights": [1],
      "raw": {
        "doorRight": "1",
        "RightPlan": [{"doorNo": 1, "planTemplateNo": "1"}],
        "numOfCard": 0, "numOfFP": 0, "numOfFace": 1
      }
    },
    {
      "employee_no": "100",
      "name": "Platform Test",
      "user_type": "normal",
      "valid": true,
      "valid_begin": "2020-01-01T00:00:00",
      "valid_end": "2037-12-31T23:59:59",
      "door_rights": [1],
      "raw": {"numOfCard": 0, "numOfFP": 1, "numOfFace": 1}
    },
    {
      "employee_no": "2",
      "name": "Platform TestUser",
      "user_type": "normal",
      "valid": true,
      "raw": {"numOfCard": 1, "numOfFP": 0, "numOfFace": 0}
    }
  ],
  "pagination": {"total": 3, "limit": 3, "offset": 0}
}
```

### `GET /ext/v1/device-management/cards` — 🆕 Карты на устройстве

```bash
curl 'http://10.100.10.23:8080/ext/v1/device-management/cards?gateway=gateway-a' \
  -H "X-Service-Account: crm_backend" \
  -H "X-Service-Secret: crm-secret-2026"
```

**Ответ:**
```json
{
  "ok": true,
  "data": [
    {
      "card_no": "9876543210",
      "card_type": "normalCard",
      "employee_no": "2",
      "raw": {"cardNo": "9876543210", "cardType": "normalCard", "employeeNo": "2"}
    }
  ],
  "pagination": {"total": 1, "limit": 30, "offset": 0}
}
```

### `GET /ext/v1/device-management/mode-b-status` — 🆕 Статус режима B

```bash
curl 'http://10.100.10.23:8080/ext/v1/device-management/mode-b-status?gateway=gateway-a' \
  -H "X-Service-Account: crm_backend" \
  -H "X-Service-Secret: crm-secret-2026"
```

**Ответ:**
```json
{
  "ok": true,
  "data": {
    "mode_b_configured": true,
    "management_url": "http://10.100.10.65:80",
    "dev_index": "4116B2D6-49D7-F64C-8A69-09C647D577C7"
  }
}
```

### `PUT /ext/v1/device-management/doors/{no}/params` — 🆕🔑 Настройка двери (admin)

```bash
curl -X PUT 'http://10.100.10.23:8080/ext/v1/device-management/doors/1/params?gateway=gateway-a' \
  -H "X-Service-Account: ops_console" \
  -H "X-Service-Secret: ops-secret-2026" \
  -H "Content-Type: application/json" \
  -d '{"openDuration": 5, "closeTimeout": 10, "doorName": "Главный вход"}'
```

### `POST /ext/v1/device-management/fingerprint/capture` — 🆕🔑 Захват отпечатка (admin)

Запускает считыватель на устройстве. Нужно приложить палец к сканеру устройства.

```bash
curl -X POST 'http://10.100.10.23:8080/ext/v1/device-management/fingerprint/capture?gateway=gateway-a' \
  -H "X-Service-Account: ops_console" \
  -H "X-Service-Secret: ops-secret-2026" \
  -H "Content-Type: application/json" \
  -d '{"finger_no": 1}'
```

### `POST /ext/v1/device-management/fingerprint/add` — 🆕🔑 Сохранить отпечаток (admin)

Сохраняет захваченный отпечаток для определённого сотрудника.

```bash
curl -X POST 'http://10.100.10.23:8080/ext/v1/device-management/fingerprint/add?gateway=gateway-a' \
  -H "X-Service-Account: ops_console" \
  -H "X-Service-Secret: ops-secret-2026" \
  -H "Content-Type: application/json" \
  -d '{
    "employee_no": "100",
    "finger_print_id": 1,
    "finger_data": "<base64 data from capture>"
  }'
```

### `POST /ext/v1/device-management/face/upload` — 🆕🔑 Загрузка фото лица (admin)

Загружает фото человека на устройство. Multipart/form-data.

```bash
curl -X POST 'http://10.100.10.23:8080/ext/v1/device-management/face/upload?gateway=gateway-a' \
  -H "X-Service-Account: ops_console" \
  -H "X-Service-Secret: ops-secret-2026" \
  -F "employee_no=100" \
  -F "image=@photo.jpg"
```

### `POST /ext/v1/device-management/passthrough` — 🆕🔑 ISAPI Passthrough (admin)

Отправляет произвольную ISAPI команду на устройство. Используйте с осторожностью.

```bash
curl -X POST 'http://10.100.10.23:8080/ext/v1/device-management/passthrough?gateway=gateway-a' \
  -H "X-Service-Account: ops_console" \
  -H "X-Service-Secret: ops-secret-2026" \
  -H "Content-Type: application/json" \
  -d '{
    "method": "GET",
    "isapi_path": "/ISAPI/AccessControl/AcsCfg",
    "body": null
  }'
```

> ⚠️ **Внимание:** port-27000 passthrough возвращает 403 для многих эндпоинтов. Используйте только для задокументированных ISAPI путей.

---

## 9. Audit

### `GET /ext/v1/audit/log` — Журнал аудита

Записывает все write-операции через API (door actions, person CRUD и т.д.).

```bash
curl 'http://10.100.10.23:8080/ext/v1/audit/log?limit=10' \
  -H "X-Service-Account: ops_console" \
  -H "X-Service-Secret: ops-secret-2026"
```

**Query параметры:** `limit` (default 50), `offset` (default 0), `action`, `actor_id`

**Ответ:**
```json
{
  "ok": true,
  "data": [
    {
      "timestamp": 1773997731.415617,
      "actor_id": "svc:ops_console",
      "actor_role": "admin",
      "auth_method": "service_account",
      "action": "door.open",
      "resource_type": "door",
      "target_id": "gateway-a:door-1",
      "result": "success",
      "status_code": 200,
      "request_id": "10bc6587-99a"
    }
  ],
  "pagination": {"total": 1, "limit": 50, "offset": 0}
}
```

---

## Быстрый старт

### 1. Проверить здоровье

```bash
curl http://10.100.10.23:8080/ext/v1/health \
  -H "X-Service-Account: crm_backend" \
  -H "X-Service-Secret: crm-secret-2026"
```

### 2. Посмотреть людей на устройстве

```bash
curl http://10.100.10.23:8080/ext/v1/device-management/persons \
  -H "X-Service-Account: crm_backend" \
  -H "X-Service-Secret: crm-secret-2026"
```

### 3. Открыть дверь

```bash
curl -X POST 'http://10.100.10.23:8080/ext/v1/doors/1/actions?gateway=gateway-a' \
  -H "X-Service-Account: ops_console" \
  -H "X-Service-Secret: ops-secret-2026" \
  -d '{"action": "open"}'
```

### 4. Посмотреть последние события

```bash
curl 'http://10.100.10.23:8080/ext/v1/events?limit=5' \
  -H "X-Service-Account: crm_backend" \
  -H "X-Service-Secret: crm-secret-2026"
```

### 5. Проверить расписание

```bash
curl http://10.100.10.23:8080/ext/v1/access-policies/week-plans/1 \
  -H "X-Service-Account: crm_backend" \
  -H "X-Service-Secret: crm-secret-2026"
```
