# CRM Backend Integration — OpenAPI Truth Reference

> Generated from live runtime 2026-03-22. 58 endpoints.
> Source: `http://10.100.10.23:8080/ext/openapi.json`

## Connection

```
Base URL:       http://10.100.10.23:8080
API Prefix:     /ext/v1/*
Swagger UI:     http://10.100.10.23:8080/ext/docs
ReDoc:          http://10.100.10.23:8080/ext/redoc
OpenAPI JSON:   http://10.100.10.23:8080/ext/openapi.json
```

## Authentication

### Service Account (Primary)
```http
X-Service-Account: crm_backend
X-Service-Secret: crm-secret-2026
```

| Account | Role | Capabilities |
|---------|------|-------------|
| `crm_backend` | operator | Read all, create/update/delete persons and credentials |
| `ops_console` | admin | Full access: door actions, deploy, reconciliation |

### JWT (Alternative)
```http
POST /ext/v1/auth/token
Content-Type: application/json
{"username": "...", "password": "..."}
→ {"access_token": "eyJ...", "token_type": "bearer"}
# Then: Authorization: Bearer eyJ...
```

## Response Contracts

### Success Envelope
```json
{"ok": true, "data": {...}, "pagination": {"total": N, "limit": N, "offset": N}}
```

### Error Envelope
```json
{"ok": false, "error": {"code": "not_found", "message": "Device not found"}}
```

### Command Envelope (write operations)
```json
{"ok": true, "data": {...}, "command": {"id": "uuid", "correlation_id": "X-Request-ID value", "action": "door.open"}}
```

## Multi-Device Targeting

> [!IMPORTANT]
> All device-aware endpoints accept `device_id` (platform UUID) or `dev_index` (internal EHOME ID).
> CRM backend should always use `device_id`. The `dev_index` param is for internal use.

```
CRM → /ext/v1/doors?device_id=1f57534c-5b75-4c3f-8be7-0500eb01a887
Backend resolves: device_id → dev_index → gateway-adapter
CRM never deals with gateway aliases or dev_index values.
```

---

## Auth (1 endpoint)

| Method | Path | Role | Description |
|--------|------|------|-------------|
| POST | `/auth/token` | public | Get JWT access token |

---

## Devices (4 endpoints)

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/devices` | viewer+ | List all registered devices |
| GET | `/devices/{device_id}` | viewer+ | Get device by platform UUID |
| POST | `/devices/discover` | admin | Trigger device discovery from gateway |
| POST | `/devices/register` | admin | Register a device manually |

### Device Object
```json
{
  "id": "uuid",
  "dev_index": "7ABF4ECA-3C67-B847-8E9A-100F075DE109",
  "dev_name": "DS-K1T671MF",
  "dev_model": "DS-K1T671MF",
  "dev_status": "online|offline|unknown",
  "metadata_json": {"door_count": 1, "gateway_id": "gateway-a", ...}
}
```

---

## Persons (5 endpoints)

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/persons` | viewer+ | List persons (platform DB) |
| GET | `/persons/{person_id}` | viewer+ | Get person details |
| POST | `/persons` | operator+ | Create person |
| PATCH | `/persons/{person_id}` | operator+ | Partial update |
| PUT | `/persons/{person_id}` | operator+ | Full update |
| DELETE | `/persons/{person_id}` | operator+ | Delete person |

### Person Object
```json
{
  "id": "uuid",
  "employee_no": "1",
  "first_name": "John",
  "last_name": "Doe",
  "metadata": {}
}
```

---

## Credentials (8 endpoints)

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/credentials/cards` | viewer+ | List cards |
| POST | `/credentials/cards` | operator+ | Create/assign card |
| DELETE | `/credentials/cards/{card_id}` | operator+ | Delete card |
| GET | `/credentials/fingerprints` | viewer+ | List fingerprints |
| GET | `/credentials/faces` | viewer+ | List face credentials |
| GET | `/credentials/capabilities` | viewer+ | Credential type support |
| GET | `/credentials/summary/{employee_no}` | viewer+ | All credentials for person |

> [!WARNING]
> **Partial**: Cards/fingerprints/faces may exist on physical devices but not be fully synced to platform credential-service DB. Use `device-management/passthrough` for direct device queries.

---

## Access Policies (8 endpoints)

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/access-policies/week-plans` | viewer+ | List week plans |
| GET | `/access-policies/week-plans/{plan_no}` | viewer+ | Get week plan |
| PUT | `/access-policies/week-plans/{plan_no}` | operator+ | Set week plan |
| GET | `/access-policies/plan-templates` | viewer+ | List templates |
| GET | `/access-policies/plan-templates/{template_no}` | viewer+ | Get template |
| PUT | `/access-policies/plan-templates/{template_no}` | operator+ | Set template |
| GET | `/access-policies/holiday-groups/{group_no}` | viewer+ | Get holiday group |
| PUT | `/access-policies/holiday-groups/{group_no}` | operator+ | Set holiday group |
| GET | `/access-policies/holiday-plans/{plan_no}` | viewer+ | Get holiday plan |
| PUT | `/access-policies/holiday-plans/{plan_no}` | operator+ | Set holiday plan |
| GET | `/access-policies/assignments` | viewer+ | List policy assignments |

> [!NOTE]
> All access policy endpoints accept `?dev_index=` for per-device targeting (routed through gateway-adapter ISAPI).

---

## Doors (5 endpoints) — Device-Linked Model

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/doors` | viewer+ | List all doors across online devices |
| GET | `/doors/{door_no}` | viewer+ | Door params (use `?device_id=`) |
| GET | `/doors/capabilities` | viewer+ | Per-device capabilities |
| GET | `/devices/{device_id}/doors` | viewer+ | Per-device door listing |
| POST | `/doors/{door_no}/actions` | admin | Door action: open/close/always-open/always-close |

### Door Object (NEW — device-linked)
```json
{
  "device_id": "1f57534c-5b75-4c3f-8be7-0500eb01a887",
  "device_name": "DS-K1T642E",
  "device_model": "",
  "device_status": "online",
  "door_no": 1,
  "door_name": "Door 1",
  "status": "available",
  "open_duration": null,
  "close_timeout": null
}
```

### Door Action Request
```http
POST /ext/v1/doors/1/actions?device_id=<uuid>
Content-Type: application/json
{"action": "open"}
# Valid actions: open, close, always-open, always-close
```

> [!NOTE]
> **DEPRECATED**: `?gateway=gateway-a|gateway-b` still works but responses include `_deprecated: true`. Use `?device_id=` instead.

---

## Events (4 endpoints)

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/events` | viewer+ | List events with filters |
| GET | `/events/{event_id}` | viewer+ | Get single event |
| GET | `/events/summary` | viewer+ | Event statistics |
| GET | `/events/stream` | viewer+ | SSE event stream |

### Query Parameters
```
?limit=50&offset=0
?event_type=ACCESS_GRANTED
?employee_no=1
?start_date=2026-03-01&end_date=2026-03-22
```

---

## Deployments & Reconciliation (5 endpoints)

| Method | Path | Role | Description |
|--------|------|------|-------------|
| POST | `/deployments/deploy` | admin | Deploy person/credential to device |
| POST | `/deployments/undeploy` | admin | Undeploy from device |
| GET | `/deployments/tasks` | viewer+ | List deployment tasks |
| GET | `/deployments/device/{device_id}` | viewer+ | Tasks for device |
| GET | `/deployments/states/{entity_type}/{entity_id}` | viewer+ | Deployment state |
| POST | `/reconciliation/run` | admin | Run reconciliation |
| GET | `/reconciliation/results` | viewer+ | Reconciliation results |

### Deploy Request
```http
POST /ext/v1/deployments/deploy
{"person_id": "uuid", "device_id": "uuid"}
```

---

## Device Management (8 endpoints — internal/advanced)

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/device-management/persons` | admin | List persons on device (ISAPI) |
| GET | `/device-management/person-count` | admin | Person count on device |
| GET | `/device-management/cards` | admin | Cards on device |
| GET | `/device-management/capabilities` | admin | Device capabilities |
| GET | `/device-management/mode-b-status` | admin | Mode B connection status |
| POST | `/device-management/passthrough` | admin | Raw ISAPI passthrough |
| POST | `/device-management/face/upload` | admin | Upload face photo |
| POST | `/device-management/fingerprint/add` | admin | Add fingerprint data |
| POST | `/device-management/fingerprint/capture` | admin | Capture fingerprint from device |
| PUT | `/device-management/doors/{door_no}/params` | admin | Set door parameters |

> [!NOTE]
> All device-management endpoints accept `?dev_index=` for per-device targeting.

---

## Health & Audit (3 endpoints)

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/health` | public | API gateway health |
| GET | `/ext/v1/health` | viewer+ | Aggregated platform health |
| GET | `/ext/v1/audit/log` | viewer+ | Audit trail |

---

## Endpoint Count Summary

| Group | Count |
|-------|-------|
| Auth | 1 |
| Devices | 4 |
| Persons | 5 |
| Credentials | 8 |
| Access Policies | 11 |
| Doors | 5 |
| Events | 4 |
| Deployments/Reconciliation | 7 |
| Device Management | 10 |
| Health/Audit | 3 |
| **Total** | **58** |
