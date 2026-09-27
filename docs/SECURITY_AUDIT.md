# PDH Smart EMS — Security Audit & Hardening Report

**Audit Date:** 2026-09-27  
**Scope:** PDH Smart EMS Full-Stack Architecture (Client, Server, Database, APIs, DevOps)  
**Security Status:** PRODUCTION READY (with recommended deployment safeguards)

---

## 1. Executive Summary

การตรวจสอบความปลอดภัยของระบบ **PDH Smart EMS** ดำเนินการตามมาตรฐาน OWASP Top 10, ISO/IEC 27001 และแนวทางการคุ้มครองข้อมูลสุขภาพและข้อมูลส่วนบุคคล (PDPA/เวชระเบียนฉุกเฉิน) โดยมุ่งเน้นการป้องกันการเข้าถึงโดยมิชอบ การปลอมแปลงพิกัด GPS การโจมตีฝั่งเครือข่าย และการรักษาความต่อเนื่องในการปฏิบัติภารกิจส่งต่อผู้ป่วยฉุกเฉิน

---

## 2. Authentication & Credential Security

| มาตรการรักษาความปลอดภัย | สถานะ | รายละเอียดการตรวจสอบและการบังคับใช้ |
|---|---|---|
| **Password Hashing** | **PASS** | ใช้อัลกอริทึม **bcrypt** ด้วย Salt Rounds = 12 บันทึกในคอลัมน์ `password_hash` ไม่มีการเก็บ Plaintext password ในระบบ |
| **Password Expiration Policy** | **PASS** | บังคับเปลี่ยนรหัสผ่านทุก **90 วัน (3 เดือน)** ตามมาตรฐานความปลอดภัยโรงพยาบาล พร้อมคำนวณวันคงเหลือแจ้งเตือนผู้ใช้ |
| **First-Time Login Verification** | **PASS** | บังคับตรวจสอบเลขบัตรประชาชน 13 หลักและเบอร์โทรศัพท์ พร้อมบังคับตั้งรหัสผ่านใหม่ในการเข้าใช้งานครั้งแรก |
| **Brute Force & Lockout** | **PASS** | ตรวจจับการเดารหัสผ่านผิดพลาดติดต่อกันเกิน 5 ครั้ง บล็อก IP/บัญชีเป็นเวลา 15 นาที (`LOCK_DURATION = 900s`) ผ่านตาราง `auth_rate_limits` |
| **Credentials Exposure Audit** | **PASS** | ตรวจสอบ Source Code ทั้งหมด ไม่พบ Hardcoded API Key หรือ Password ในส่วน Frontend และ Backend |

---

## 3. Session & Cookie Architecture

| มาตรการ | สถานะ | รายละเอียด |
|---|---|---|
| **Session Storage** | **PASS** | เซสชันถูกจัดเก็บบนตาราง `sessions` ในฐานข้อมูล โดยจัดเก็บเฉพาะ **SHA-256 Digest** (`token_hash`) ของโทเค็น ไม่เก็บตัวโทเค็นจริง |
| **Cookie Hardening** | **PASS** | คุกกี้เซสชันกำหนดค่า `HttpOnly = true`, `SameSite = strict`, `Path = /` และ `Secure = true` อัตโนมัติเมื่อรันบนสภาพแวดล้อม `NODE_ENV = production` |
| **Session Invalidation** | **PASS** | มีคำสั่ง `logout` เพื่อเพิกถอนเซสชันปัจจุบัน และ `logout-all` เพื่อบังคับตัดการเชื่อมต่อทุกอุปกรณ์ของผู้ใช้ทันทีเมื่อมีการเปลี่ยนรหัสผ่าน |
| **Inactivity & Absolute Lifetime** | **PASS** | รองรับการตัดเซสชันเมื่อไม่มีการใช้งานเกิน 30 นาที (`SESSION_IDLE_TIMEOUT`) และอายุขัยสูงสุดไม่เกิน 12 ชั่วโมง (`SESSION_MAX_LIFETIME`) |

---

## 4. Authorization & Role-Based Access Control (RBAC)

ระบบกำหนดบทบาทตามสายการบังคับบัญชาและหน้าที่รับผิดชอบทางการแพทย์ฉุกเฉิน:

1. **SUPER_ADMIN / EMS_ADMIN:** บริหารจัดการบัญชีผู้ใช้งาน, ตั้งค่าระบบ, จัดการกองยานพาหนะ, ดูแลบัญชีค่าใช้จ่ายและ Audit Log
2. **EMS_COMMANDER / DISPATCHER:** สั่งการภารกิจฉุกเฉิน (Smart Dispatch), จัดสรรรถพยาบาล, อนุมัติการออกเหตุฉุกเฉินพิเศษ (Emergency Override)
3. **NURSE / PARAMEDIC / EMT:** ปฏิบัติการบนรถพยาบาล, ตรวจรับ-ส่งต่อผู้ป่วย (Handover Sign-off), บันทึกการส่งมอบ
4. **DRIVER:** ตรวจสอบความพร้อมก่อนออกรถ (Pre-trip Checklist), ควบคุมการเดินรถ, ตรวจเช็กระบบ Telematics ในรถ

### การป้องกัน Role Escalation & IDOR
- ทุก Endpoint จัดการผู้ใช้ (`/api/users/*`) ถูกป้องกันด้วย Middleware `authorizeRoles('SUPER_ADMIN', 'EMS_ADMIN', 'EMS_COMMANDER')`
- ผู้ใช้ทั่วไปไม่สามารถเลื่อนระดับสิทธิ์ของตนเอง หรือรีเซ็ตรหัสผ่านของผู้ใช้อื่นได้

---

## 5. Network & Injection Defenses

| ประเภทความเสี่ยง | สถานะ | กลไกการป้องกัน |
|---|---|---|
| **SQL Injection** | **PASS** | ทุก Query ใช้ Prepared Statements (`?` parameterization) ผ่านไลบรารี `mysql2/promise` ไม่มีการต่อสตริง SQL โดยตรง |
| **CSRF (Cross-Site Request Forgery)** | **PASS** | สำหรับคำสั่งประเภท State Mutation (`POST`, `PUT`, `DELETE`) ฝั่งเซิร์ฟเวอร์ตรวจสอบ Header `X-PDH-Request: 1` และตรวจสอบ `Origin` ต้องตรงกับ `CORS_ORIGIN` ที่กำหนดไว้เท่านั้น |
| **XSS (Cross-Site Scripting)** | **PASS** | เปิดใช้งาน `helmet()` เพื่อตั้งค่า Content-Security-Policy และ Security Headers; ฝั่ง React Client หลีกเลี่ยง `dangerouslySetInnerHTML` |
| **CORS Policy** | **PASS** | เซิร์ฟเวอร์ปฏิเสธการเชื่อมต่อจาก Wildcard (`*`) บน Production โดยบังคับให้อยู่ในรูปแบบ HTTPS Origin ที่ชัดเจนเท่านั้น |

---

## 6. GPS & Telematics Manipulation Protection

- **Latitude / Longitude Range Check:** พิกัดต้องอยู่ในช่วง `-90 <= lat <= 90` และ `-180 <= lng <= 180` ผ่าน Zod Schema
- **Velocity Limit Sanity Check:** ปฏิเสธค่าความเร็วที่เกินความเป็นจริง (`speed > 250 km/h`)
- **Deduplication:** ระบบตรวจเช็กความถี่ของพิกัด หากตรวจพบการส่งข้อมูลซ้ำในหน้าต่างเวลาไม่เกิน 3 วินาทีสำหรับรถคันเดิม จะไม่มีการบันทึกซ้ำลงฐานข้อมูล
- **Buffer & Offline Resiliency:** เมื่ออุปกรณ์ขาดสัญญาณอินเทอร์เน็ต พิกัดจะถูกเก็บพักใน Local Cache และส่งขึ้นระบบแบบ Batch เมื่อเครือข่ายกลับมาใช้งานได้

---

## 7. Audit Logging & Non-repudiation

- ทุกการทำธุรกรรมสำคัญ (สร้างผู้ใช้, รีเซ็ตรหัสผ่าน, บันทึกค่าใช้จ่าย, การอนุมัติ Emergency Override) จะถูกบันทึกในตาราง `audit_logs`
- มีการเก็บ `user_id`, `action`, `entity_type`, `entity_id`, `ip_address`, `user_agent`, `details` และ `created_at`
- **Zero Sensitive Data in Logs:** ไม่มีข้อความรหัสผ่าน, โทเค็นความลับ หรือข้อมูลส่วนบุคคลที่มีความอ่อนไหวปรากฏในไฟล์ Log หรือ Audit Trail
