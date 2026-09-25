# เอกสาร PDH Smart EMS

เริ่มจาก [คู่มือการทำงานภาษาไทย](SYSTEM_GUIDE_TH.md) หรือ [ฉบับ Word](PDH_SMART_EMS_คู่มือการทำงาน.docx)

คู่มือครอบคลุมการเข้าสู่ระบบ ภารกิจ Refer/EMS, Driver Cab, GPS, รายงาน การติดตั้ง การสำรอง/กู้คืน และ API หลัก โดยอ้างอิงโค้ดหลัง AUTH-1 วันที่ 25 กันยายน 2569

| เอกสาร | ใช้สำหรับ |
| --- | --- |
| [คู่มือระบบ](SYSTEM_GUIDE_TH.md) | ผู้ใช้งานและผู้ดูแล อ่านขั้นตอนการทำงานรวม |
| [Authentication](AUTHENTICATION.md) | ผู้พัฒนา/ผู้ดูแล อ่าน session และ configuration |
| [RBAC](RBAC.md) และ [Permissions](PERMISSIONS.md) | ตรวจสิทธิ์เดิมและงานที่ยังต้องพัฒนา |
| [Audit Log](AUDIT_LOG.md) | ตรวจขอบเขตเหตุการณ์ที่บันทึก |
| [Admin Manual](ADMIN_MANUAL.md) | จัดการบัญชีภายในขอบเขต AUTH-1 |
| [Security](SECURITY.md) | ตรวจเงื่อนไขก่อน production |
| [รายงาน AUTH-1](audit/AUTH1_REPORT.md) | อ่านผลตรวจและหลักฐานทดสอบล่าสุดของงาน Authentication |

ระบบยังมีงาน permission/IDOR และประเด็นพร้อมใช้งานจริงที่ต้องทำต่อ คู่มือไม่รับรองว่าฟังก์ชัน Admin Back Office หรือระบบสิทธิ์ครบแล้ว รายงานในโฟลเดอร์ audit เป็นหลักฐานตามช่วงเวลาของแต่ละงาน ให้ตรวจวันที่และขอบเขตก่อนนำมาใช้อ้างอิง
