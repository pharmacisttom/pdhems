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
| `GET` | `/missions` | Yes | All Authenticated | Status & type query params | Standard | **ACTIVE** | **PASS** (`missionWorkflow.test.ts`) |
| `GET` | `/missions/resources/available` | Yes | All Authenticated | None | Standard | **ACTIVE** | **PASS** (Available vehicles, drivers, staff) |
| `GET` | `/missions/:id` | Yes | All Authenticated | Mission ID integer validation | Standard | **ACTIVE** | **PASS** (Full mission detail with crew) |
| `POST` | `/missions/refer` | Yes | `REFER_CENTER`, `DISPATCHER` | Origin, Destination, Notes | Standard | **ACTIVE** | **PASS** (Creates refer in CREATED state) |
| `POST` | `/missions/:id/assign` | Yes | `REFER_CENTER`, `DISPATCHER` | VehicleId, DriverId, StaffIds | Standard | **ACTIVE** | **PASS** (Assigns resources, prevents conflict) |
| `POST` | `/missions/:id/confirm-readiness` | Yes | `DRIVER`, `EMS_STAFF` | User role verification | Standard | **ACTIVE** | **PASS** (Crew confirmation status) |
| `POST` | `/missions/:id/pretrip` | Yes | `DRIVER`, `EMS_STAFF` | Fuel, Oxygen, Equipment, Brakes | Standard | **ACTIVE** | **PASS** (`pretrip_checklists` recorded) |
| `POST` | `/missions/:id/depart` | Yes | `DRIVER`, `DISPATCHER` | Emergency override support | Standard | **ACTIVE** | **PASS** (Enforces pre-trip or override) |
| `POST` | `/missions/:id/arrived` | Yes | `DRIVER`, `EMS_STAFF` | None | Standard | **ACTIVE** | **PASS** (Transitions to ARRIVED) |
| `POST` | `/missions/:id/handover` | Yes | `EMS_STAFF`, `DISPATCHER` | receiverName, notes | Standard | **ACTIVE** | **PASS** (Human handover confirmation) |
| `POST` | `/missions/:id/start-return` | Yes | `DRIVER`, `DISPATCHER` | None | Standard | **ACTIVE** | **PASS** (Transitions to RETURNING) |
| `POST` | `/missions/:id/complete` | Yes | `DISPATCHER`, `COMMANDER` | None | Standard | **ACTIVE** | **PASS** (Frees vehicle & driver) |
| `POST` | `/dispatch/nearest-ambulances` | Yes | `DISPATCHER`, `COMMANDER` | Lat, Lng, Urgency level | Standard | **ACTIVE** | **PASS** (1.35x road circuity factor & freshness) |
| `POST` | `/dispatch/quick-emergency` | Yes | `DISPATCHER`, `COMMANDER` | VehicleId, Lat, Lng, Desc | Standard | **ACTIVE** | **PASS** (1-click quick dispatch) |
| `GET` | `/reports/kpis` | Yes | All Authenticated | Timeframe & MissionType | Standard | **ACTIVE** | **PASS** (8 EMS KPIs, T1..T8 benchmarks) |
| `GET` | `/reports/trip-summary` | Yes | All Authenticated | Pagination, Filter parameters | Standard | **ACTIVE** | **PASS** (Distance, duration, speed violations) |
| `GET` | `/reports/spatial-density` | Yes | All Authenticated | Timeframe | Standard | **ACTIVE** | **PASS** (Hotspot clusters & refer corridors) |

---

## Key Audit Observations & Protections
1. **Idempotent Batch Telemetry:** `POST /api/map/gps/batch` correctly handles re-sent points via MySQL `INSERT ... ON DUPLICATE KEY UPDATE`, ensuring offline queue synchronization does not crash or double-count points.
2. **Numeric Cast Verification:** All geospatial coordinates (`latitude`, `longitude`, `geofence_radius_meters`) are converted using `Number(...)` prior to sending JSON responses, eliminating JavaScript `toFixed is not a function` errors.
3. **Role Enforcement:** Administrative endpoints (`POST/PUT /api/facilities`, `POST/PUT /api/bases`) reject unauthorized roles with `403 Forbidden`.
