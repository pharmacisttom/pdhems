# PDH Smart EMS — Database Schema & Data Dictionary

**DBMS:** MariaDB 10.11+ / MySQL 8.0+  
**Storage Engine:** InnoDB  
**Character Set:** `utf8mb4`  
**Collation:** `utf8mb4_unicode_ci`  
**Timezone:** UTC (`+00:00`)

---

## 1. Schema Overview & Entity Relationship Summary

```
                      +-------------------+
                      |       roles       |
                      +-------------------+
                                | 1:N
                                v
+------------------+  1:N   +-------------------+  1:N   +--------------------+
|  audit_logs      |<-------|       users       |------->|      sessions      |
+------------------+        +-------------------+        +--------------------+
                                      |
                                      +--------------------------+
                                                                 |
+------------------+  1:N   +-------------------+                | 1:N
|   facilities     |<-------|   ems_missions    |<---------------+
+------------------+ (orig/ |                   | (created_by)   v
                      dest) +-------------------+        +--------------------+
                              | 1:N       | 1:N          |  system_expenses   |
                              v           v              +--------------------+
                    +--------------+  +--------------+
                    | mission_crew |  |  gps_tracks  |
                    +--------------+  +--------------+
                           |                 ^
                           v                 |
                    +--------------+         |
                    |  ems_staff   |         |
                    +--------------+         |
                                             |
+------------------+ 1:N                     |
|    ambulances    |-------------------------+
+------------------+
        ^
        | 1:N
+------------------+
|    ems_bases     |
+------------------+
```

---

## 2. Table Specifications

### 2.1 `roles` (บทบาทผู้ใช้งานในระบบ)
- **Purpose:** จัดการสิทธิ์การเข้าถึงตามสายการบังคับบัญชาทางการแพทย์ฉุกเฉิน
- **Primary Key:** `id` (INT, Auto Increment)
- **Columns:**
  - `id`: รหัสอ้างอิงบทบาท
  - `name`: ชื่อระบุบทบาท (`SUPER_ADMIN`, `EMS_ADMIN`, `EMS_COMMANDER`, `DISPATCHER`, `NURSE`, `PARAMEDIC`, `EMT`, `DRIVER`) [UNIQUE]
  - `description`: คำอธิบายหน้าที่ความรับผิดชอบ
  - `created_at`: เวลาที่สร้างเรคคอร์ด

### 2.2 `users` (ผู้ใช้งานระบบ)
- **Purpose:** บัญชีผู้ใช้งานระบบทั้งระดับผู้ดูแล, แพทย์, พยาบาล, เจ้าหน้าที่ศูนย์สั่งการ และคนขับรถ
- **Primary Key:** `id` (INT, Auto Increment)
- **Foreign Keys:**
  - `role_id` → `roles(id)`
- **Important Indexes:**
  - `idx_users_username` (UNIQUE on `username`)
  - `idx_users_role` (`role_id`)
  - `idx_users_citizen_id` (`citizen_id`)
  - `idx_users_active_status` (`active`, `status`)
- **Audit & Security Columns:**
  - `password_hash`: รหัสผ่านที่เข้ารหัสด้วย bcrypt
  - `citizen_id`: เลขบัตรประชาชน 13 หลัก
  - `must_change_password`: ธงบังคับเปลี่ยนรหัสผ่าน
  - `password_changed_at`: วันที่เปลี่ยนรหัสผ่านล่าสุด (ใช้คุม 90-Day Policy)
  - `locked_until`: วันที่และเวลาที่บัญชีถูกระงับชั่วคราวหลังล็อกอินผิดพลาด
  - `failed_login_count`: จำนวนครั้งที่ล็อกอินล้มเหลว
  - `active`: สถานะเปิด/ปิดการใช้งาน (Soft Delete)

### 2.3 `sessions` (เซสชันการเข้าสู่ระบบแบบ Stateful)
- **Purpose:** ติดตามและควบคุมเซสชันการเข้าใช้งาน ป้องกันการใช้งานพร้อมกันแบบผิดปกติและรองรับ Logout-All
- **Primary Key:** `session_id` (VARCHAR(64))
- **Foreign Keys:**
  - `user_id` → `users(id)` ON DELETE CASCADE
- **Indexes:**
  - `idx_session_token_hash` (`token_hash`)
  - `idx_session_user_activity` (`user_id`, `revoked_at`, `expires_at`, `last_activity_at`)

### 2.4 `ambulances` (ข้อมูลรถพยาบาลและการติดตาม Telematics)
- **Purpose:** บันทึกข้อมูลยานพาหนะฉุกเฉิน พิกัด GPS ล่าสุด ทิศทาง ความเร็ว และสถานะความพร้อม
- **Primary Key:** `id` (INT, Auto Increment)
- **Indexes:**
  - `vehicle_code` [UNIQUE]
  - `idx_ambulance_status` (`status`)
  - `idx_ambulance_active` (`active`)
  - `idx_ambulance_last_gps` (`last_gps_at`)
- **Key Columns:**
  - `current_latitude`, `current_longitude`: พิกัดตำแหน่งปัจจุบัน (`DECIMAL(10,7)`)
  - `current_heading`: มุมทิศทาง (`DECIMAL(5,2)`) 0-360 องศา
  - `current_speed`: ความเร็วปัจจุบัน (`DECIMAL(6,2)`) หน่วยกิโลเมตร/ชั่วโมง
  - `last_gps_at`: ประทับเวลาล่าสุดที่ได้รับสัญญาณ GPS

### 2.5 `facilities` (สถานพยาบาลและโรงพยาบาลปลายทาง)
- **Purpose:** จุดต้นทาง/ปลายทางในการรับ-ส่งต่อผู้ป่วย (Referral Network)
- **Primary Key:** `id` (INT, Auto Increment)
- **Key Columns:**
  - `facility_code`: รหัสย่อสถานพยาบาล (เช่น `PDH`, `BHP`, `RY-CENTRAL`) [UNIQUE]
  - `name`: ชื่อเต็มสถานพยาบาล
  - `facility_type`: ประเภทสถานพยาบาล (`HOSPITAL`, `REGIONAL_HOSPITAL`, `HEALTH_CENTER` ฯลฯ)
  - `latitude`, `longitude`: พิกัดพิกัดอ้างอิง WGS 84
  - `geofence_radius`: รัศมีตรวจจับการเข้าพื้นที่ (หน่วยเมตร ค่าเริ่มต้น 200m)

### 2.6 `ems_bases` (ฐานปฏิบัติการกู้ชีพและจุดจอดฉุกเฉิน)
- **Primary Key:** `id` (INT, Auto Increment)
- **Key Columns:**
  - `name`: ชื่อฐานกู้ชีพ/จุดจอด
  - `latitude`, `longitude`: พิกัดตำแหน่งฐาน
  - `geofence_radius`: รัศมี Geofence (หน่วยเมตร ค่าเริ่มต้น 150m)

### 2.7 `ems_missions` (ภารกิจการแพทย์ฉุกเฉินและงานส่งต่อ Refer)
- **Purpose:** จัดการวงจรชีวิตของภารกิจฉุกเฉินตั้งแต่สั่งการ ออกเหตุ ถึงที่เกิดเหตุ ส่งต่อ และกลับฐาน
- **Primary Key:** `id` (INT, Auto Increment)
- **Foreign Keys:**
  - `vehicle_id` → `ambulances(id)`
  - `driver_id` → `drivers(id)`
  - `origin_facility_id` → `facilities(id)`
  - `destination_facility_id` → `facilities(id)`
- **Indexes:**
  - `mission_no` [UNIQUE]
  - `idx_mission_status` (`status`)
  - `idx_mission_scene_coords` (`scene_latitude`, `scene_longitude`)
  - `idx_mission_corridor` (`origin_facility_id`, `destination_facility_id`)
  - `idx_mission_timestamps` (`created_at`, `completed_at`)

### 2.8 `gps_tracks` (ประวัติเส้นทางเดินรถ GPS Breadcrumb)
- **Purpose:** บันทึกประวัติพิกัดการเคลื่อนที่ของรถพยาบาลตลอดภารกิจเพื่อใช้วิเคราะห์และ Scrubber Playback
- **Primary Key:** `id` (BIGINT, Auto Increment)
- **Foreign Keys:**
  - `mission_id` → `ems_missions(id)` ON DELETE SET NULL
  - `vehicle_id` → `ambulances(id)` ON DELETE CASCADE
- **Indexes:**
  - `idx_gps_tracks_mission` (`mission_id`, `recorded_at`)
  - `idx_gps_tracks_vehicle_time` (`vehicle_id`, `recorded_at`)
  - `idx_gps_tracks_coords` (`latitude`, `longitude`)

### 2.9 `system_expenses` (บันทึกค่าใช้จ่ายและงบประมาณยานพาหนะ)
- **Primary Key:** `id` (INT, Auto Increment)
- **Foreign Keys:**
  - `vehicle_id` → `ambulances(id)` ON DELETE SET NULL
  - `mission_id` → `ems_missions(id)` ON DELETE SET NULL
  - `recorded_by_user_id` → `users(id)`
- **Indexes:**
  - `expense_no` [UNIQUE]
  - `idx_expense_category` (`category`)
  - `idx_expense_date` (`expense_date`)

### 2.10 `audit_logs` (บันทึกประวัติการตรวจสอบย้อนหลังที่ไม่สามารถแก้ไขได้)
- **Primary Key:** `id` (BIGINT, Auto Increment)
- **Foreign Keys:**
  - `user_id` → `users(id)` ON DELETE SET NULL
- **Indexes:**
  - `idx_audit_action` (`action`)
  - `idx_audit_entity` (`entity_type`, `entity_id`)
  - `idx_audit_created` (`created_at`)

---

## 3. Database Maintenance & Index Verification Checklist

- [x] Primary Key ทุกตารางเป็น Integer หรือ VARCHAR สั้น ไม่ใช้ UUID แบบสุ่มเพื่อรักษาประสิทธิภาพ Clustered Index (B-Tree)
- [x] Foreign Key ครบถ้วนพร้อม Constraint `ON DELETE CASCADE` หรือ `SET NULL` ที่เหมาะสม ป้องกัน Orphan Records
- [x] มี Compound Indexes สำหรับจุดที่มีการค้นหาบ่อย:
  - `gps_tracks(vehicle_id, recorded_at)`
  - `ems_missions(status, vehicle_id)`
  - `sessions(user_id, revoked_at, expires_at)`
- [x] Soft Delete Pattern: ใช้ฟิลด์ `active = 1` ในตาราง Master Data (`users`, `ambulances`, `facilities`, `ems_bases`, `drivers`, `ems_staff`)
