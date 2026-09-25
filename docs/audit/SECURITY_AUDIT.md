# PDH SMART EMS — SECURITY & PRIVACY AUDIT

**Audit Date:** 2026-09-25  
**System:** PDH Smart EMS Command & Refer System  
**Auditor Roles:** DevSecOps Engineer, Information Security Architect  

---

## 1. Security Architecture Overview

| Security Domain | Standard / Mechanism | Implementation Details | Verdict |
|---|---|---|---|
| **Authentication** | JSON Web Token (JWT) | Signed with `JWT_SECRET`, 24h expiration, issued upon verified credential exchange. | **PASS** |
| **Password Storage** | Bcrypt Hashing | Passwords hashed using `bcrypt` (10 salt rounds) prior to database insertion. No plaintext passwords stored. | **PASS** |
| **Authorization (RBAC)** | Role-Based Access Control | Enforced via `authenticate` and `requireRole` middlewares. Supported roles: `SUPER_ADMIN`, `COMMANDER`, `DISPATCHER`, `NURSE_REFER`, `EMS_CREW`, `DRIVER`. | **PASS** |
| **SQL Injection Defense** | Parameterized Queries | All database operations use `mysql2/promise` with prepared statement placeholders (`?`). Zero dynamic SQL string concatenation. | **PASS** |
| **Cross-Site Scripting (XSS)** | React Escaping & Helmet | React automatically escapes JSX expressions. HTTP response headers hardened using `helmet`. | **PASS** |
| **CORS Policy** | Whitelisted Origins | Express CORS configured with explicit allowed origins (`CLIENT_URL`). Cross-origin requests restricted. | **PASS** |
| **Audit Logging** | Immutable Action Trail | System actions (Login, Facility Update, Telemetry batch, Mission dispatch) written to `audit_logs` table with user ID, IP, action, entity, and timestamp. | **PASS** |
| **Secret Management** | Environment Variables | All sensitive keys (`DB_PASSWORD`, `JWT_SECRET`) stored in `.env` files. `.env` and `.env.local` strictly ignored in `.gitignore`. | **PASS** |

---

## 2. Privacy & Data Protection Audit (Critical Healthcare Rules)

### 2.1 Medical Record Separation
- **Finding:** Inspected all database schemas, seed files, and API controllers.
- **Rule Verification:** Phase 1 and 2 strictly prohibit storing:
  - Hospital Numbers (HN)
  - National Citizen ID (CID)
  - Patient Full Names
  - Medical Diagnoses, Prescriptions, Lab Results, or Clinical Notes
- **Evidence:** The `ems_missions` table references missions purely by operational code (e.g. `REF-2026-000124`, `EMS-2026-000045`), vehicle ID, driver ID, origin, destination facility, urgency, and operational status.
- **Verdict:** **PASS** (Zero patient clinical data leakage; complies with PDPA and medical privacy requirements).

### 2.2 Telematics & GPS Privacy
- **Rule Verification:** Ambulance crew and driver GPS tracking must occur solely during active duty and authorized mission lifecycles.
- **Evidence:**
  - Telemetry is tied to vehicle hardware/app sessions (`vehicle_id`, `mission_id`).
  - Personal tracking outside mission execution is not permitted.
  - Historical tracks are queryable only by mission context or administrative audit.
- **Verdict:** **PASS**.

---

## 3. Vulnerability Assessment Matrix

| Test Vector | Target | Methodology | Result | Mitigation / Status |
|---|---|---|---|---|
| **SQL Injection** | `/api/map/mission/:id/track` | Injected SQL payloads (`' OR 1=1 --`) in route params. | Rejected as invalid mission format; prepared statement prevented syntax breakage. | **SECURE** |
| **Auth Bypass** | `/api/facilities` (POST/PUT) | Invoked write endpoints without `Authorization: Bearer <token>` header. | Responded with `401 Unauthorized`. | **SECURE** |
| **Privilege Escalation** | `/api/bases` (POST) | Invoked with JWT containing `DRIVER` role. | Responded with `403 Forbidden: Insufficient permissions`. | **SECURE** |
| **Telemetry Forgery / Replay** | `/api/map/gps/batch` | Submitted batch telemetry with duplicate timestamp for same mission. | Database unique index `(mission_id, recorded_at)` and controller `ON DUPLICATE KEY UPDATE` prevented duplicate corruption. | **SECURE** |
| **Brute Force Defense** | `/api/auth/login` | Multiple concurrent invalid credentials. | Express rate limiter (`express-rate-limit`) limits failed authentication bursts. | **SECURE** |

---

## 4. Security Recommendations for Production
1. **HTTPS Enforcement:** Terminate TLS on Nginx with HTTP/2 and modern ciphers (TLS 1.3).
2. **JWT Secret Rotation:** Generate a cryptographically secure 256-bit random key for production deployment.
3. **Database Firewall:** Ensure MariaDB/MySQL port 3306 listens exclusively on `127.0.0.1` and is never exposed to the public internet.
