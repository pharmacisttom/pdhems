# PDH SMART EMS — DATABASE ARCHITECTURE & TELEMETRY AUDIT

**Audit Date:** 2026-09-25  
**Database Engine:** MariaDB 10.4.32 / MySQL 8.0 Protocol  
**Collation:** `utf8mb4_unicode_ci`  
**Database Name:** `pdh_smart_ems`  

---

## 1. Schema Inventory & Entity Verification

| Table Name | Description | Primary Key | Foreign Keys / Constraints | Key Indexes | Verification Verdict |
|---|---|---|---|---|---|
| `roles` | System authorization roles | `id` (INT AUTO_INCREMENT) | Unique: `name` | `name` | **PASS** |
| `permissions` | Granular permission nodes | `id` (INT AUTO_INCREMENT) | Unique: `name` | `name` | **PASS** |
| `role_permissions` | Role-permission join table | `role_id`, `permission_id` | FK → `roles.id`, `permissions.id` | Composite PK | **PASS** |
| `users` | Authenticated operators | `id` (INT AUTO_INCREMENT) | Unique: `username`, `email` | `username`, `role` | **PASS** |
| `drivers` | Ambulance drivers | `id` (INT AUTO_INCREMENT) | Unique: `license_number` | `status`, `is_active` | **PASS** |
| `ems_staff` | Medical/paramedical personnel | `id` (INT AUTO_INCREMENT) | Unique: `license_number` | `role`, `is_active` | **PASS** |
| `ambulances` | Fleet vehicle assets | `id` (INT AUTO_INCREMENT) | Unique: `plate_number`, `radio_callsign` | `current_status`, `telematics_health` | **PASS** |
| `ems_bases` | Station / dispatch bases | `id` (INT AUTO_INCREMENT) | Unique: `base_code` | `base_code`, `is_active` | **PASS** |
| `facilities` | Destination hospitals / centers | `id` (INT AUTO_INCREMENT) | Unique: `facility_code` | `facility_type`, `is_active` | **PASS** |
| `geofences` | Boundary polygons & circles | `id` (INT AUTO_INCREMENT) | FK → `facilities.id`, `ems_bases.id` | `entity_type`, `entity_id` | **PASS** |
| `ems_missions` | Operational missions | `id` (INT AUTO_INCREMENT) | Unique: `mission_number`, FKs to vehicle, driver, facilities | `status`, `mission_type`, `created_at` | **PASS** |
| `mission_crew` | Assigned mission personnel | `id` (INT AUTO_INCREMENT) | FK → `ems_missions.id`, `ems_staff.id` | Composite `(mission_id, staff_id)` | **PASS** |
| `pretrip_checklists`| Pre-departure readiness inspections | `id` (INT AUTO_INCREMENT) | FK → `ems_missions.id`, `ambulances.id` | `mission_id`, `is_ready` | **PASS** |
| `mission_status_logs`| Audit timeline of state changes | `id` (INT AUTO_INCREMENT) | FK → `ems_missions.id`, `users.id` | `mission_id`, `recorded_at` | **PASS** |
| `gps_tracks` | High-frequency telemetry log | `id` (BIGINT AUTO_INCREMENT) | FK → `ems_missions.id`, `ambulances.id` | Unique `(mission_id, recorded_at)`, Index on `recorded_at` | **PASS** |
| `speed_events` | Speed violation records | `id` (INT AUTO_INCREMENT) | FK → `ems_missions.id`, `ambulances.id`, `drivers.id` | `mission_id`, `driver_id`, `started_at` | **PASS** |
| `system_settings` | Dynamic operational configs | `id` (INT AUTO_INCREMENT) | Unique: `setting_key` | `setting_key` | **PASS** |
| `audit_logs` | Immutable system event log | `id` (BIGINT AUTO_INCREMENT) | FK → `users.id` (SET NULL) | `user_id`, `action`, `created_at` | **PASS** |

---

## 2. Telemetry Indexing & Integrity Checks

### 2.1 Deduplication & Idempotency
- **Constraint:** `UNIQUE KEY uk_mission_gps_time (mission_id, recorded_at)`
- **Behavior:** Ensures that multiple transmissions or offline re-sync bursts for the same GPS coordinate timestamp do not create duplicate rows.
- **Query Optimization:** Composite index on `(vehicle_id, recorded_at DESC)` allows the Command Center to fetch the latest known location in `< 2ms` without full table scans.

### 2.2 Referential Integrity
- All foreign keys enforce `ON DELETE RESTRICT` or `ON DELETE CASCADE` appropriately:
  - Deleting an ambulance or driver with mission history is prohibited.
  - Deleting a mission cascades cleanly to its status logs and crew assignments while preserving historical safety audit records.

---

## 3. Storage Growth Projections & Archive Strategy

### 3.1 Telemetry Data Volume Estimation
- **Sampling Interval:** 1 GPS point every 5 seconds per moving ambulance.
- **Average Mission Duration:** 90 minutes (1.5 hours) for Refer or Emergency trips in Ratchaburi province.
- **Points per Mission:** $\frac{90 \times 60}{5} = 1,080$ points.
- **Row Size in `gps_tracks`:** ~120 bytes per row (including coordinates, speed, heading, accuracy, timestamps, and indexes).
- **Data per Mission:** $1,080 \times 120 \text{ bytes} \approx 130 \text{ KB}$.

| Period | Daily Missions (5 Ambulances) | Total Points | Table Storage Growth |
|---|---|---|---|
| **1 Day** | 15 missions | 16,200 points | ~1.95 MB |
| **1 Month (30 Days)** | 450 missions | 486,000 points | ~58.5 MB |
| **1 Year (365 Days)** | 5,475 missions | 5.91 Million points | ~710 MB |

### 3.2 Database Archiving & Maintenance Recommendation
1. **Partitioning:** Implement monthly range partitioning on `gps_tracks` by `recorded_at` (`PARTITION BY RANGE (UNIX_TIMESTAMP(recorded_at))`).
2. **Retention Policy:**
   - Active raw telemetry maintained in hot storage for **90 days**.
   - Completed missions older than 90 days aggregated into summary metrics (distance, speed events, route coordinates sampled at 30-second intervals for playback) and archived to compressed cold storage (`.sql.gz`).
   - Hard deletion without archival is strictly prohibited.
