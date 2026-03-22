# CRM Backend Handoff Guide

> Complete integration reference for CRM backend developers consuming the ACS platform API.

## Architecture

```
CRM Frontend (web/mobile)
  ↓ CRM's own API
CRM Backend (Django/FastAPI/etc)
  ↓ HTTP (local network)
ACS API Gateway (port 8080)
  ↓ internal routing
ACS Platform Services (ports 8001-8019)
```

**CRM backend MUST NEVER:**
- Call ACS internal service ports (8001-8019) directly
- Call the Hik Device Gateway directly
- Serve the ACS API to its own frontend directly
- Assume the ACS API is public — it is local network only

## Connection

```
Base URL:     http://10.100.10.23:8080
API prefix:   /ext/v1/*
OpenAPI docs: http://10.100.10.23:8080/ext/docs
ReDoc:        http://10.100.10.23:8080/ext/redoc
OpenAPI JSON: http://10.100.10.23:8080/ext/openapi.json
```

## Authentication

### Service Account (primary)

```http
X-Service-Account: crm_backend
X-Service-Secret: crm-secret-2026
```

| Account | Role | Capabilities |
|---------|------|-------------|
| `crm_backend` | operator | Read all + person/credential writes |
| `ops_console` | admin | Full access including door actions and deploy |

### JWT (alternative)

```http
POST /ext/v1/auth/token
{"api_key": "dev-key-2026", "role": "operator"}

→ Authorization: Bearer <token>
```

### API Key (legacy)

```http
X-API-Key: dev-key-2026
```

## Resource Contracts

### Devices
```http
GET /ext/v1/devices
→ {ok, data: [{serial_no, name, model, status, ip_address, ...}], pagination}
```

### Persons
```http
GET  /ext/v1/persons[?search=X&department=X&deploy_status=X&limit=50&offset=0]
GET  /ext/v1/persons/{id}
POST /ext/v1/persons              → command envelope
PATCH/ext/v1/persons/{id}         → command envelope (partial body OK)
PUT  /ext/v1/persons/{id}         → command envelope (alias for PATCH)
DELETE /ext/v1/persons/{id}       → command envelope
```

Person model:
```json
{
  "id": "uuid",
  "employee_no": 1,
  "first_name": "John",
  "last_name": "Doe",
  "department": "Engineering",
  "phone": "+998...",
  "email": "john@example.com",
  "deploy_status": "local",
  "door_rights": [],
  "created_at": "...",
  "updated_at": "..."
}
```

### Credentials — Cards
```http
GET    /ext/v1/credentials/cards[?employee_no=1]
POST   /ext/v1/credentials/cards                     → ok_item
DELETE /ext/v1/credentials/cards/{card_id}?employee_no=1  → command envelope
GET    /ext/v1/credentials/summary/{employee_no}
GET    /ext/v1/credentials/capabilities
```

### Credentials — Fingerprints
```http
GET /ext/v1/credentials/fingerprints[?employee_no=1]
```

### Access Policies
```http
GET /ext/v1/access-policies/week-plans
GET /ext/v1/access-policies/assignments
```

### Doors
```http
GET  /ext/v1/doors                                    → all doors, all gateways
GET  /ext/v1/doors/capabilities
GET  /ext/v1/doors/{no}?gateway=gateway-a
POST /ext/v1/doors/{no}/actions?gateway=gateway-a      → command envelope
     Body: {"action": "open"|"close"|"always-open"|"always-close"}
```

### Events
```http
GET /ext/v1/events[?limit=50&offset=0&event_type=X&since=X&until=X&success=true]
GET /ext/v1/events/summary
GET /ext/v1/events/stream                             → SSE realtime stream
```

Event model:
```json
{
  "id": "uuid",
  "timestamp": "2026-03-17T04:35:00Z",
  "event_type": "ACCESS_GRANTED",
  "event_category": "ACCESS_CONTROL",
  "success": true,
  "credential_type": "card",
  "person": {"name": "John Doe", "employee_no": "1"},
  "door": {"no": 1},
  "device_serial": "DS-K1T671MF",
  "description": "Access granted via card"
}
```

### Deployments
```http
GET  /ext/v1/deployments/tasks[?status=X&entity_type=X&device_id=X]
GET  /ext/v1/deployments/states/{entity_type}/{entity_id}
GET  /ext/v1/deployments/device/{device_id}
POST /ext/v1/deployments/deploy         → command envelope
POST /ext/v1/deployments/undeploy       → command envelope
POST /ext/v1/reconciliation/run         → command envelope
GET  /ext/v1/reconciliation/results
```

### Audit
```http
GET /ext/v1/audit/log[?limit=50&offset=0&action=X&actor_id=X]
```

### Health
```http
GET /ext/v1/health                      → aggregated platform health
```

## Multi-Device Targeting Model

> **Updated 2026-03-21**: The ACS platform now supports multiple physical devices.

### Identifiers

| Identifier | Type | Visible to CRM | Description |
|---|---|---|---|
| `device_id` | UUID | ✅ Yes | Platform internal ID, returned by `/ext/v1/devices` |
| `dev_index` | String (GUID) | ❌ No | Vendor-specific ISAPI routing identifier — **internal only** |
| `serial_number` | String | ✅ Yes | Hardware serial, visible in device list |

### CRM backend multi-device rules

1. **Device discovery**: Use `GET /ext/v1/devices` to list all registered devices with their `device_id`, name, model, status
2. **Person/credential operations**: Are device-agnostic at the CRM level — person/credential CRUD operates on the platform DB, not on individual devices
3. **Deployment**: Use `POST /ext/v1/deployments/deploy` with `device_id` in the target to deploy persons/credentials to a specific device
4. **Door actions**: Use `?gateway=gateway-a|gateway-b` to target a specific gateway cluster
5. **Events**: All events from all devices are aggregated — filter by `device_id` if needed

### What CRM backend MUST NOT do

- Never resolve `dev_index` manually
- Never call gateway-adapter ISAPI passthrough endpoints
- Never use `?dev_index=` parameter (that's for internal ops console only)
- Never assume device routing — always pass `device_id` to platform APIs

### Deployment targeting

```json
// Deploy person to a specific device
{
  "entity_type": "person",
  "entity_id": "<person-uuid>",
  "target": {
    "type": "device",
    "device_id": "<device-uuid>"
  }
}

// Deploy person to ALL devices
{
  "entity_type": "person",
  "entity_id": "<person-uuid>",
  "target": {
    "type": "all"
  }
}
```

## Command Envelope

All write operations return:
```json
{
  "ok": true,
  "data": { "..." },
  "command": {
    "id": "abc123def456",
    "correlation_id": "req-abc123",
    "action": "person.create",
    "idempotency_key": "crm-op-12345"
  }
}
```

### Headers for Commands
- `X-Idempotency-Key: <unique-key>` — safe retry support
- `X-Request-ID: <correlation-id>` — end-to-end tracing

## Error Envelope

```json
{"ok": false, "error": {"code": "not_found", "message": "person 'abc' not found"}}
```

| Code | HTTP | Use |
|------|------|-----|
| `bad_request` | 400 | Invalid input |
| `unauthorized` | 401 | Missing/bad auth |
| `forbidden` | 403 | Insufficient role |
| `not_found` | 404 | Resource not found |
| `upstream_error` | 502 | Internal service failed |
| `connection_error` | 502 | Internal service unreachable |

## Event Consumption

### Pull API (recommended for CRM)
```python
import httpx, time

HEADERS = {"X-Service-Account": "crm_backend", "X-Service-Secret": "crm-secret-2026"}
last_check = "2026-03-17T00:00:00Z"

while True:
    resp = httpx.get("http://10.100.10.23:8080/ext/v1/events",
                     params={"since": last_check, "limit": 100}, headers=HEADERS)
    for event in resp.json()["data"]:
        process_event(event)
        last_check = event["timestamp"]
    time.sleep(5)
```

### SSE Stream (for live dashboards)
```python
import sseclient, requests

resp = requests.get("http://10.100.10.23:8080/ext/v1/events/stream",
                    headers=HEADERS, stream=True)
for event in sseclient.SSEClient(resp).events():
    process_event(json.loads(event.data))
```

## Internal-Only Boundaries

**CRM backend MUST NOT call:**
- Mini ops console (port 3000)
- Gateway adapter ISAPI passthrough (port 8001/8019)
- Internal service ports (8001-8019)
- Sync-service direct API (port 8018)
- Access-policy-service direct API (port 8008)
- Any device directly (10.100.10.65)
- Any ISAPI endpoint directly

**CRM backend MUST NOT use:**
- `dev_index` parameter (internal ISAPI routing identifier)
- `?dev_index=` query parameter on any endpoint
- Direct Hik Gateway authentication or ISAPI calls

## Quick Start Examples

### Read all persons
```bash
curl -H "X-Service-Account: crm_backend" -H "X-Service-Secret: crm-secret-2026" \
  http://10.100.10.23:8080/ext/v1/persons
```

### Create person
```bash
curl -X POST -H "X-Service-Account: crm_backend" -H "X-Service-Secret: crm-secret-2026" \
  -H "Content-Type: application/json" -H "X-Idempotency-Key: crm-create-emp5" \
  -d '{"first_name":"Jane","last_name":"Smith","employee_no":5}' \
  http://10.100.10.23:8080/ext/v1/persons
```

### Update person (partial)
```bash
curl -X PATCH -H "X-Service-Account: crm_backend" -H "X-Service-Secret: crm-secret-2026" \
  -H "Content-Type: application/json" -d '{"first_name":"Janet"}' \
  http://10.100.10.23:8080/ext/v1/persons/<uuid>
```

### Delete card
```bash
curl -X DELETE -H "X-Service-Account: crm_backend" -H "X-Service-Secret: crm-secret-2026" \
  "http://10.100.10.23:8080/ext/v1/credentials/cards/<card-uuid>?employee_no=1"
```

### Open door (admin only)
```bash
curl -X POST -H "X-Service-Account: ops_console" -H "X-Service-Secret: ops-secret-2026" \
  -H "Content-Type: application/json" -d '{"action":"open"}' \
  "http://10.100.10.23:8080/ext/v1/doors/1/actions?gateway=gateway-a"
```
