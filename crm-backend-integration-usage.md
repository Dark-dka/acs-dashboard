# CRM Backend Integration Usage

> Runbook for CRM backend developers integrating with ACS platform API.

## Connection

```
ACS API Gateway: http://10.100.10.23:8080
Base path: /ext/v1/*
OpenAPI docs: http://10.100.10.23:8080/ext/docs
```

## Authentication

Use service account headers on every request:

```
X-Service-Account: crm_backend
X-Service-Secret: crm-secret-2026
```

CRM backend gets **operator** role: can read everything + create/update/delete persons and credentials.
Door actions and deploy/undeploy require **admin** (use `ops_console` service account or JWT with admin role).

## Multi-Device Awareness

> **Updated 2026-03-21**: Platform now supports multiple physical ACS devices.

### Key rules for CRM backend:
1. Use `GET /ext/v1/devices` to discover all registered devices
2. Person/credential CRUD is device-agnostic (DB operations)
3. Deployments can target specific devices via `device_id` (platform UUID)
4. **Never** use `dev_index` — this is an internal ISAPI identifier
5. See `crm-backend-handoff-guide.md` for full multi-device model

### Example: Get devices
```bash
curl -H "X-Service-Account: crm_backend" -H "X-Service-Secret: crm-secret-2026" \
  http://10.100.10.23:8080/ext/v1/devices
```

## Quick Start Flows

### 1. Read all persons

```bash
curl -H "X-Service-Account: crm_backend" -H "X-Service-Secret: crm-secret-2026" \
  http://10.100.10.23:8080/ext/v1/persons
```

### 2. Create a person

```bash
curl -X POST -H "X-Service-Account: crm_backend" -H "X-Service-Secret: crm-secret-2026" \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: crm-create-emp5" \
  -d '{"first_name":"Jane","last_name":"Smith","employee_no":5}' \
  http://10.100.10.23:8080/ext/v1/persons
```

### 2b. Update a person (partial)

```bash
curl -X PATCH -H "X-Service-Account: crm_backend" -H "X-Service-Secret: crm-secret-2026" \
  -H "Content-Type: application/json" \
  -d '{"first_name":"Janet"}' \
  http://10.100.10.23:8080/ext/v1/persons/<uuid>
```

### 2c. Delete a credential card

```bash
curl -X DELETE -H "X-Service-Account: crm_backend" -H "X-Service-Secret: crm-secret-2026" \
  "http://10.100.10.23:8080/ext/v1/credentials/cards/<card-uuid>?employee_no=1"
```

### 3. Deploy person to devices

```bash
curl -X POST -H "X-Service-Account: ops_console" -H "X-Service-Secret: ops-secret-2026" \
  -H "Content-Type: application/json" \
  -d '{"entity_type":"person","entity_id":"<uuid>","target":{"type":"all"}}' \
  http://10.100.10.23:8080/ext/v1/deployments/deploy
```

### 4. Open a door

```bash
curl -X POST -H "X-Service-Account: ops_console" -H "X-Service-Secret: ops-secret-2026" \
  -H "Content-Type: application/json" \
  -d '{"action":"open"}' \
  "http://10.100.10.23:8080/ext/v1/doors/1/actions?gateway=gateway-a"
```

### 5. Poll events

```bash
curl -H "X-Service-Account: crm_backend" -H "X-Service-Secret: crm-secret-2026" \
  "http://10.100.10.23:8080/ext/v1/events?limit=10&since=2026-03-17T00:00:00Z"
```

## Error Handling

All errors follow:
```json
{"ok": false, "error": {"code": "...", "message": "..."}}
```

| Code | Action |
|------|--------|
| 401 | Check service account credentials |
| 403 | Use higher-privilege service account |
| 404 | Resource doesn't exist |
| 502 | Internal service failed — retry after 5s |

## Endpoints NOT For CRM Use

These are internal-only and should never be called by CRM backend:
- Mini ops console (port 3000)
- Internal service ports (8001-8019)
- Gateway adapter ISAPI passthrough
- Sync-service direct API
