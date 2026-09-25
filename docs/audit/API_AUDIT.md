# PDH SMART EMS — API AUDIT & ENDPOINT SPECIFICATION

**Audit Date:** 2026-09-25  
**System:** PDH Smart EMS Command & Refer System  
**Base URL:** `http://localhost:5000/api` (Production: `https://ems.photharam.moph.go.th/api`)  

---

## Endpoint Audit Matrix

| Method | Path | Auth Required | Required Roles / Permissions | Payload Validation | Rate Limit | Status | Automated Test Result |
|---|---|---|---|---|---|---|---|
| `GET` | `/health` | No | Public | None | Standard | **ACTIVE** | **PASS** (`api.test.ts`) |
| `POST` | `/auth/login` | No | Public | Username & Password presence | 15 req / 15m | **ACTIVE** | **PASS** (Tested 200 & 401) |
| `GET` | `/auth/me` | Yes | Authenticated User | Bearer token in header | Standard | **ACTIVE** | **PASS** |
| `GET` | `/ambulances` | Yes | All Authenticated | Optional status query param | Standard | **ACTIVE** | **PASS** (5 vehicles returned) |
| `GET` | `/ambulances/:id` | Yes | All Authenticated | ID integer verification | Standard | **ACTIVE** | **PASS** |
| `PUT` | `/ambulances/:id/location` | Yes | `DRIVER`, `COMMANDER`, `DISPATCHER` | Lat, Lng numeric, speed, heading | High-frequency | **ACTIVE** | **PASS** |
| `GET` | `/facilities` | Yes | All Authenticated | Filter parameters | Standard | **ACTIVE** | **PASS** (Hospitals returned) |
| `GET` | `/facilities/:id` | Yes | All Authenticated | ID integer verification | Standard | **ACTIVE** | **PASS** |
| `POST` | `/facilities` | Yes | `SUPER_ADMIN`, `COMMANDER` | Code, Name, Lat, Lng, Radius | Standard | **ACTIVE** | **PASS** |
| `PUT` | `/facilities/:id` | Yes | `SUPER_ADMIN`, `COMMANDER` | Code, Name, Lat, Lng, Radius | Standard | **ACTIVE** | **PASS** |
| `GET` | `/bases` | Yes | All Authenticated | Filter parameters | Standard | **ACTIVE** | **PASS** (EMS bases returned) |
| `GET` | `/bases/:id` | Yes | All Authenticated | ID integer verification | Standard | **ACTIVE** | **PASS** |
| `POST` | `/bases` | Yes | `SUPER_ADMIN`, `COMMANDER` | Code, Name, Lat, Lng, Radius | Standard | **ACTIVE** | **PASS** |
| `PUT` | `/bases/:id` | Yes | `SUPER_ADMIN`, `COMMANDER` | Code, Name, Lat, Lng, Radius | Standard | **ACTIVE** | **PASS** |
| `GET` | `/map/vehicles` | Yes | All Authenticated | Status & health filters | Standard | **ACTIVE** | **PASS** (Coordinates parsed) |
| `GET` | `/map/active-missions` | Yes | All Authenticated | None | Standard | **ACTIVE** | **PASS** (Active missions returned) |
| `GET` | `/map/mission/:id/track` | Yes | All Authenticated | Mission ID integer validation | Standard | **ACTIVE** | **PASS** (GPS trail returned) |
| `GET` | `/map/vehicles/:id/track` | Yes | All Authenticated | Vehicle ID integer validation | Standard | **ACTIVE** | **PASS** |
| `POST` | `/map/gps/batch` | Yes | `DRIVER`, `EMS_CREW`, System | JSON array of `{recorded_at, latitude, longitude, speed, heading, accuracy}` | 100 req / min | **ACTIVE** | **PASS** (Batch idempotency verified) |
| `GET` | `/map/tracking-health` | Yes | All Authenticated | None | Standard | **ACTIVE** | **PASS** (Separates Stopped from Lost) |
| `GET` | `/map/config` | Yes | All Authenticated | None | Standard | **ACTIVE** | **PASS** (OSM provider config) |

---

## Key Audit Observations & Protections
1. **Idempotent Batch Telemetry:** `POST /api/map/gps/batch` correctly handles re-sent points via MySQL `INSERT ... ON DUPLICATE KEY UPDATE`, ensuring offline queue synchronization does not crash or double-count points.
2. **Numeric Cast Verification:** All geospatial coordinates (`latitude`, `longitude`, `geofence_radius_meters`) are converted using `Number(...)` prior to sending JSON responses, eliminating JavaScript `toFixed is not a function` errors.
3. **Role Enforcement:** Administrative endpoints (`POST/PUT /api/facilities`, `POST/PUT /api/bases`) reject unauthorized roles with `403 Forbidden`.
