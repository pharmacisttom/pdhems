# PDH Smart EMS — Environment Variables Specification

> **คำเตือนความปลอดภัย:** ห้าม commit ไฟล์ `.env` จริงที่มีรหัสผ่าน, คีย์ความลับ, หรือ credentials ลงใน Git Repository โดยเด็ดขาด ให้ใช้ไฟล์ `.env.example` เป็นแม่แบบเท่านั้น

เอกสารนี้ระบุตัวแปรสภาพแวดล้อม (Environment Variables) ทั้งหมดที่ระบบ **PDH Smart EMS** ใช้งาน โดยจำแนกตามหมวดหมู่ ความจำเป็นในการตั้งค่า และตัวอย่างค่าสำหรับสภาพแวดล้อม Development และ Production

---

## 1. APPLICATION (การตั้งค่าทั่วไปของแอปพลิเคชัน)

| ตัวแปร | ความจำเป็น | ค่าเริ่มต้น (Dev) | ตัวอย่างค่า (Production) | คำอธิบาย |
|---|---|---|---|---|
| `NODE_ENV` | **Required** | `development` | `production` | โหมดการทำงานของ Node.js (เมื่อเป็น production ระบบจะบังคับใช้ HTTPS Secure Cookie และเข้มงวด CORS) |
| `PORT` | Optional | `5000` | `5000` | พอร์ตเครือข่ายที่ Express Backend API ให้บริการ |

---

## 2. DATABASE (การเชื่อมต่อฐานข้อมูล MariaDB / MySQL)

| ตัวแปร | ความจำเป็น | ค่าเริ่มต้น (Dev) | ตัวอย่างค่า (Production) | คำอธิบาย |
|---|---|---|---|---|
| `DB_HOST` | **Required** | `127.0.0.1` | `127.0.0.1` (หรือชื่อ docker service เช่น `db`) | ที่อยู่เซิร์ฟเวอร์ฐานข้อมูล |
| `DB_PORT` | Optional | `3306` | `3306` | พอร์ตเชื่อมต่อฐานข้อมูล MySQL/MariaDB |
| `DB_USER` | **Required** | `root` | `pdh_ems_user` | ชื่อผู้ใช้สำหรับเชื่อมต่อฐานข้อมูล (ห้ามใช้ root บน production) |
| `DB_PASSWORD` | **Required** | *(ว่าง)* | `pDh#Str0ngP@ss2026!` | รหัสผ่านผู้ใช้ฐานข้อมูล (ต้องมีความยาวและซับซ้อนสูง) |
| `DB_NAME` | **Required** | `pdh_smart_ems` | `pdh_smart_ems` | ชื่อฐานข้อมูลที่ใช้งาน |

---

## 3. AUTHENTICATION & SESSION (การยืนยันตัวตนและความปลอดภัยของเซสชัน)

| ตัวแปร | ความจำเป็น | ค่าเริ่มต้น (Dev) | ตัวอย่างค่า (Production) | คำอธิบาย |
|---|---|---|---|---|
| `SESSION_IDLE_TIMEOUT` | Optional | `1800` | `1800` | ระยะเวลา Session หมดอายุเมื่อไม่มีการใช้งาน (วินาที) — ค่าเริ่มต้นคือ 30 นาที |
| `SESSION_MAX_LIFETIME` | Optional | `43200` | `43200` | อายุขัยสูงสุดของ Session แบบ Absolute (วินาที) — ค่าเริ่มต้นคือ 12 ชั่วโมง |
| `MAX_FAILED_LOGIN` | Optional | `5` | `5` | จำนวนครั้งที่อนุญาตให้ล็อกอินผิดพลาดติดต่อกันก่อนระงับบัญชีชั่วคราว |
| `LOCK_DURATION` | Optional | `900` | `900` | ระยะเวลาระงับบัญชีหลังใส่รหัสผิดครบตามกำหนด (วินาที) — 15 นาที |
| `PASSWORD_MIN_LENGTH` | Optional | `12` | `12` | ความยาวขั้นต่ำของรหัสผ่านผู้ใช้งาน |

---

## 4. SECURITY & API (การรักษาความปลอดภัยของ API & CORS)

| ตัวแปร | ความจำเป็น | ค่าเริ่มต้น (Dev) | ตัวอย่างค่า (Production) | คำอธิบาย |
|---|---|---|---|---|
| `CORS_ORIGIN` | **Required** (ใน Prod) | `http://localhost:5173` | `https://ems.pluakdaenghospital.go.th` | โดเมน Frontend ที่อนุญาตให้เรียกใช้งาน API (บน Production บังคับต้องเป็น `https://` และห้ามใช้ wildcard `*`) |
| `LOGIN_RATE_LIMIT` | Optional | `30` | `30` | จำนวนครั้งสูงสุดที่อนุญาตให้ยิงขอเข้าระบบต่อ IP ภายในกรอบเวลา |
| `LOGIN_RATE_WINDOW` | Optional | `900` | `900` | กรอบเวลาสำหรับคำนวณ Rate Limit (วินาที) — 15 นาที |

---

## 5. GPS & TELEMATICS (ระบบติดตามพิกัดรถพยาบาลและกู้ชีพ)

| ตัวแปร | ความจำเป็น | ค่าเริ่มต้น (Dev) | ตัวอย่างค่า (Production) | คำอธิบาย |
|---|---|---|---|---|
| `NORMAL_SYNC_INTERVAL_SEC` | Optional | `300` | `300` | ความถี่ในการส่งพิกัด GPS ในโหมดปกติ/จอดประจำการ (วินาที) — 5 นาที เพื่อประหยัดพลังงานและดาต้า |
| `EMERGENCY_SYNC_INTERVAL_SEC` | Optional | `45` | `30` | ความถี่ในการส่งพิกัด GPS ขณะกำลังปฏิบัติภารกิจฉุกเฉิน (วินาที) — 30-45 วินาที |
| `GPS_STALE_THRESHOLD_SEC` | Optional | `120` | `120` | เวลาที่ถือว่าข้อมูลพิกัดเริ่มไม่อัปเดต (Stale) แสดงสถานะ DELAYED |
| `GPS_LOST_THRESHOLD_SEC` | Optional | `300` | `300` | เวลาที่ถือว่าขาดการติดต่อสมบูรณ์ (Lost Signal) แสดงคำเตือนบนหน้าจอสั่งการ |

---

## 6. MAP & ROUTING (ระบบแผนที่และการคำนวณเส้นทาง)

| ตัวแปร | ความจำเป็น | ค่าเริ่มต้น (Dev) | ตัวอย่างค่า (Production) | คำอธิบาย |
|---|---|---|---|---|
| `DEFAULT_MAP_PROVIDER` | Optional | `openstreetmap` | `openstreetmap` | ผู้ให้บริการแผนที่ฐาน (`openstreetmap`, `carto_voyager`) |
| `DEFAULT_ROUTING_PROVIDER` | Optional | `simple_estimate` | `simple_estimate` | ผู้ให้บริการคำนวณระยะทางและเวลาเดินทาง (`simple_estimate` ใช้สัมประสิทธิ์ทางโค้ง 1.35x หรือต่อเชื่อม OSRM) |

---

## 7. SEED & INITIAL SETUP (การสร้างข้อมูลตั้งต้นสำหรับทดสอบ)

| ตัวแปร | ความจำเป็น | ค่าเริ่มต้น (Dev) | ตัวอย่างค่า (Production) | คำอธิบาย |
|---|---|---|---|---|
| `SEED_ADMIN_PASSWORD` | Optional | *(ว่าง)* | *(ห้ามตั้งบน Prod)* | รหัสผ่านตั้งต้นของ Super Admin เฉพาะตอนรัน script seed ครั้งแรก |
| `SEED_STAFF_PASSWORD` | Optional | *(ว่าง)* | *(ห้ามตั้งบน Prod)* | รหัสผ่านตั้งต้นของเจ้าหน้าที่/คนขับ เฉพาะตอนรัน script seed ครั้งแรก |

---

## 8. EMAIL (ระบบแจ้งเตือนทางอีเมล - สำหรับส่วนต่อขยายในอนาคต)

| ตัวแปร | ความจำเป็น | ค่าเริ่มต้น (Dev) | ตัวอย่างค่า (Production) | คำอธิบาย |
|---|---|---|---|---|
| `SMTP_HOST` | Optional | *(ไม่ได้ใช้งาน)* | `smtp.office365.com` | โฮสต์ SMTP สำหรับส่งแจ้งเตือน |
| `SMTP_PORT` | Optional | `587` | `587` | พอร์ต SMTP |
| `SMTP_USER` | Optional | *(ว่าง)* | `ems-alert@pluakdaenghospital.go.th` | บัญชีส่งอีเมล |
| `SMTP_PASS` | Optional | *(ว่าง)* | `app-password-secret` | รหัสผ่าน SMTP |

---

## 9. STORAGE (พื้นที่จัดเก็บไฟล์และเอกสารแนบ)

| ตัวแปร | ความจำเป็น | ค่าเริ่มต้น (Dev) | ตัวอย่างค่า (Production) | คำอธิบาย |
|---|---|---|---|---|
| `STORAGE_DRIVER` | Optional | `local` | `local` | รูปแบบจัดเก็บไฟล์ (`local`, `s3`) |
| `UPLOAD_DIR` | Optional | `./uploads` | `/var/www/pdhsmartems/uploads` | ไดเรกทอรีจัดเก็บไฟล์แนบ/รูปถ่ายใบบันทึกการส่งต่อ |

---

## 10. LOGGING (ระบบบันทึก Log)

| ตัวแปร | ความจำเป็น | ค่าเริ่มต้น (Dev) | ตัวอย่างค่า (Production) | คำอธิบาย |
|---|---|---|---|---|
| `LOG_LEVEL` | Optional | `debug` | `info` | ระดับความละเอียดของ Log (`error`, `warn`, `info`, `debug`) |
| `LOG_PATH` | Optional | `./logs` | `/var/log/pdhsmartems` | ไดเรกทอรีบันทึกไฟล์ Log |
