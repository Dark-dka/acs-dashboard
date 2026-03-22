# Full API End-to-End Flow

> Canonical walkthrough of the complete ACS platform lifecycle through the API.
> Updated: 2026-03-21

## Prerequisites

```
Server B:  10.100.10.23 (platform services)
Server A:  10.100.10.65 (Hik Device Gateway)
Gateway adapter: :8001 (internal ISAPI bridge)
Device registry: :8002 (device catalog)
Person service:  :8006 (DB CRUD)
Access policy:   :8008 (scheduling)
Sync service:    :8018 (deployment orchestration)
Event history:   :8005 (event store)
API gateway:     :8080 (CRM-facing external API)
```

---

## Step 1. Device Discovery

The gateway discovers physical devices via ISUP registration.

```bash
# Query gateway for registered devices
curl -s http://127.0.0.1:8001/api/v1/management/device-list \
  -X POST | python3 -m json.tool
```

**Returns**: List of devices with their `devIndex`, serial numbers, model info, online/offline status.

---

## Step 2. Device Registration in Platform

Register the discovered device in the platform's device registry.

```bash
# Register device
curl -s http://127.0.0.1:8002/api/v1/devices \
  -X POST -H 'Content-Type: application/json' \
  -d '{
    "dev_name": "DS-K1T642E",
    "dev_model": "DS-K1T642E",
    "dev_type": "face_terminal",
    "serial_number": "DS-K1T642E20250...",
    "dev_index": "4116B2D6-49D7-F64C-8A69-09C647D577C7",
    "ip_address": "10.100.10.2",
    "dev_status": "online"
  }'
```

**Returns**: `{"id": "<uuid>", "dev_name": "DS-K1T642E", ...}` — the platform `device_id` (UUID).

---

## Step 3. Verify Device Visible in Platform

```bash
# List all registered devices
curl -s http://127.0.0.1:8002/api/v1/devices | python3 -m json.tool

# Get specific device by ID
curl -s http://127.0.0.1:8002/api/v1/devices/<device-uuid>

# Lookup by vendor devIndex
curl -s http://127.0.0.1:8002/api/v1/devices/by-dev-index/4116B2D6-49D7-F64C-8A69-09C647D577C7
```

---

## Step 4. Create Person in Platform DB

```bash
# Create person via person-service
curl -s http://127.0.0.1:8006/api/v1/persons \
  -X POST -H 'Content-Type: application/json' \
  -d '{
    "employee_no": 10,
    "first_name": "Тест",
    "last_name": "Пользователь",
    "department": "IT",
    "door_rights": [1]
  }'
```

**Returns**: `{"id": "<person-uuid>", "employee_no": 10, ...}`

Alternative via CRM API (with auth):
```bash
curl -X POST -H "X-Service-Account: crm_backend" -H "X-Service-Secret: crm-secret-2026" \
  -H "Content-Type: application/json" \
  -d '{"first_name":"Тест","last_name":"Пользователь","employee_no":10}' \
  http://127.0.0.1:8080/ext/v1/persons
```

---

## Step 5. Deploy Person to Selected Device

Deploy the DB person record to a specific physical device via gateway-adapter.

```bash
DEV_INDEX="4116B2D6-49D7-F64C-8A69-09C647D577C7"

# Deploy person to DS-K1T642E (Mode B)
curl -s "http://127.0.0.1:8001/api/v1/persons?dev_index=$DEV_INDEX" \
  -X POST -H 'Content-Type: application/json' \
  -d '{
    "employee_no": "10",
    "name": "Тест Пользователь",
    "user_type": "normal",
    "door_rights": [1],
    "valid_begin": "2020-01-01T00:00:00",
    "valid_end": "2037-12-31T23:59:59"
  }'
```

**Returns**: `{"status": "ok", "result": {...}}` — person now exists on the device.

Verify on device:
```bash
curl -s "http://127.0.0.1:8001/api/v1/persons?dev_index=$DEV_INDEX&max_results=30"
```

---

## Step 6. Add Credential (Card) to Person

```bash
# Add card to the person on device
curl -s "http://127.0.0.1:8001/api/v1/cards?dev_index=$DEV_INDEX" \
  -X POST -H 'Content-Type: application/json' \
  -d '{
    "employee_no": "10",
    "card_no": "12345678",
    "card_type": "normalCard"
  }'
```

Verify:
```bash
curl -s "http://127.0.0.1:8001/api/v1/cards?dev_index=$DEV_INDEX&employee_no=10"
```

---

## Step 7. Deploy Card (if using sync-service)

If using the sync-service for managed deployment:

```bash
curl -s http://127.0.0.1:8018/api/v1/deploy/card \
  -X POST -H 'Content-Type: application/json' \
  -d '{
    "person_id": "<person-uuid>",
    "device_id": "<device-uuid>",
    "card_no": "12345678"
  }'
```

---

## Step 8. Assign Access Policy

### Create a week plan in access-policy-service:

```bash
curl -s http://127.0.0.1:8008/api/v1/week-plans \
  -X POST -H 'Content-Type: application/json' \
  -d '{
    "name": "Standard Work Hours",
    "plan_no": 2,
    "week_plan_data": {
      "WeekPlanCfg": {
        "week": {"Mon": {"start": "08:00", "end": "18:00"}}
      }
    }
  }'
```

### Deploy to device:

```bash
curl -s "http://127.0.0.1:8008/api/v1/week-plans/<wp-id>/deploy?dev_index=$DEV_INDEX" \
  -X POST
```

---

## Step 9. Control Door

```bash
# Open door 1 on the selected device
curl -s "http://127.0.0.1:8001/api/v1/doors/1/open?dev_index=$DEV_INDEX" -X POST

# Close door
curl -s "http://127.0.0.1:8001/api/v1/doors/1/close?dev_index=$DEV_INDEX" -X POST

# Always-open mode
curl -s "http://127.0.0.1:8001/api/v1/doors/1/always-open?dev_index=$DEV_INDEX" -X POST
```

---

## Step 10. Observe Events

```bash
# Get recent access events
curl -s "http://127.0.0.1:8005/api/v1/events?limit=10"

# Via CRM API
curl -H "X-Service-Account: crm_backend" -H "X-Service-Secret: crm-secret-2026" \
  "http://127.0.0.1:8080/ext/v1/events?limit=10&since=2026-03-21T00:00:00Z"
```

---

## Step 11. Reconciliation Check

Compare platform DB records against what's actually on the device:

```bash
# Reconcile persons for a specific device
curl -s http://127.0.0.1:8018/api/v1/reconcile/persons \
  -X POST -H 'Content-Type: application/json' \
  -d '{"device_id": "<device-uuid>"}'

# Reconcile cards
curl -s http://127.0.0.1:8018/api/v1/reconcile/cards \
  -X POST -H 'Content-Type: application/json' \
  -d '{"device_id": "<device-uuid>"}'
```

---

## Multi-Device: Targeting a Different Device

To perform any operation on a **different** device, simply change the `dev_index` parameter:

```bash
# Device A
curl -s "http://127.0.0.1:8001/api/v1/persons?dev_index=4116B2D6-49D7-F64C-8A69-09C647D577C7"

# Device B (different devIndex)
curl -s "http://127.0.0.1:8001/api/v1/persons?dev_index=<DEVICE-B-DEV-INDEX>"
```

Every gateway-adapter endpoint that supports `dev_index` will route to the correct physical device automatically via Mode B (gateway port 80 + devIndex routing).

---

## Summary: API Call Map

| Step | Service | Port | Endpoint | Multi-Device |
|---|---|---|---|---|
| 1. Discover | gateway-adapter | 8001 | `POST /api/v1/management/device-list` | — |
| 2. Register | device-registry | 8002 | `POST /api/v1/devices` | — |
| 3. Verify | device-registry | 8002 | `GET /api/v1/devices` | — |
| 4. Create person | person-service | 8006 | `POST /api/v1/persons` | DB only |
| 5. Deploy person | gateway-adapter | 8001 | `POST /api/v1/persons?dev_index=` | ✅ `dev_index` |
| 6. Add card | gateway-adapter | 8001 | `POST /api/v1/cards?dev_index=` | ✅ `dev_index` |
| 7. Deploy card | sync-service | 8018 | `POST /api/v1/deploy/card` | ✅ `device_id` |
| 8. Policy deploy | access-policy | 8008 | `POST /api/v1/.../deploy?dev_index=` | ✅ `dev_index` |
| 9. Door action | gateway-adapter | 8001 | `POST /api/v1/doors/{no}/open?dev_index=` | ✅ `dev_index` |
| 10. Events | event-history | 8005 | `GET /api/v1/events` | ✅ `device_id` filter |
| 11. Reconcile | sync-service | 8018 | `POST /api/v1/reconcile/persons` | ✅ `device_id` |
