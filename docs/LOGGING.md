# PDH Smart EMS — Logging & Monitoring Strategy

---

## 1. Logging Principles & Categorization

ระบบ **PDH Smart EMS** กำหนดแนวทางการบันทึก Log ให้แยกตามประเภทการทำงานอย่างชัดเจน เพื่อความสะดวกในการวิเคราะห์เหตุการณ์ผิดปกติ (Troubleshooting) และรองรับการตรวจสอบย้อนหลังตามข้อกำหนด พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA)

```
                    +---------------------------+
                    |    PDH Smart EMS Logs     |
                    +---------------------------+
                                  |
      +---------------+-----------+-----------+---------------+
      |               |                       |               |
      v               v                       v               v
[Application]   [Audit Logs]            [Auth Events]    [API Errors]
  (PM2 Out)      (Database)               (Security)      (PM2 Error)
```

### 1.1 หมวดหมู่ Log และที่จัดเก็บ

| หมวดหมู่ Log | ปลายทางจัดเก็บ | วัตถุประสงค์ |
|---|---|---|
| **Application Log** | `/var/log/pdhsmartems/api-out.log` (หรือ PM2 out) | บันทึกการเริ่มต้นระบบ, สถิติการประมวลผลทั่วไป, สถานะ Worker |
| **API Error Log** | `/var/log/pdhsmartems/api-error.log` (หรือ PM2 err) | บันทึก Unhandled Exceptions, Database Connection Failures |
| **Authentication Log** | Console / Application Log พร้อม Prefix `[AUTH]` | บันทึกการล็อกอินสำเร็จ, ล็อกอินล้มเหลว, การล็อกบัญชี, การออกจากระบบ |
| **Audit Log** | ฐานข้อมูลตาราง `audit_logs` (Persistent & Queryable) | บันทึกการเปลี่ยนแปลงข้อมูลสำคัญ เช่น สร้าง/แก้ไขผู้ใช้, ค่าใช้จ่าย, Override ภารกิจ |
| **GPS & Telematics Log** | Console / Application Log พร้อม Prefix `[GPS]` | บันทึกสรุปการ Batch Sync พิกัด (เฉพาะจำนวนจุดและผลการซิงค์ ไม่บันทึกพิกัดดิบลงไฟล์ข้อความ) |

---

## 2. ข้อมูลที่ "ห้ามบันทึก" ลง Log โดยเด็ดขาด (Prohibited Data)

เพื่อความปลอดภัยสูงสุดและป้องกันข้อมูลรั่วไหลผ่าน Log Files ระบบกำหนดข้อห้ามอย่างเคร่งครัด:

1. **ห้ามบันทึกรหัสผ่าน (Plaintext Passwords):** ทั้งรหัสผ่านที่ส่งมาล็อกอิน และรหัสผ่านที่ถูกรีเซ็ต
2. **ห้ามบันทึก Session Tokens หรือ Cookie Secrets:** บันทึกได้เพียงตัวย่อหรือ Session ID สาธารณะ
3. **ห้ามบันทึกข้อมูลส่วนบุคคลอ่อนไหวของผู้ป่วย (Sensitive Patient Health Data):**
   - ชื่อ-นามสกุลผู้ป่วย
   - ผลการวินิจฉัยโรค (Clinical Diagnosis)
   - สัญญาณชีพและประวัติการรักษา
4. **ห้ามบันทึก Private Keys, API Keys หรือ Database Connection Strings:** ที่มีรหัสผ่านฝังอยู่

---

## 3. Log Rotation & Retention Policy

เพื่อป้องกันปัญหาพื้นที่ดิสก์เต็ม (Disk Space Exhaustion) บน VPS:

### 3.1 การหมุนเวียนผ่าน PM2 Logrotate
ติดตั้งโมดูลเสริมบน VPS:
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 50M
pm2 set pm2-logrotate:retain 14
pm2 set pm2-logrotate:compress true
```
- **ขนาดไฟล์สูงสุด:** ไม่เกิน 50MB ต่อไฟล์
- **การเก็บรักษา (Retention):** 14 วัน
- **การบีบอัด (Gzip):** บีบอัดไฟล์เก่าอัตโนมัติ

### 3.2 การหมุนเวียนตาราง `audit_logs` ในฐานข้อมูล
- บันทึกการปฏิบัติงานในตาราง `audit_logs` จะถูกเก็บไว้อย่างน้อย **90 วัน** เพื่อรองรับการตรวจสอบย้อนหลัง
- ข้อมูลที่เกินกว่า 90 วันสามารถนำออก (Archive) สู่ Cold Storage ในรูปแบบ SQL Dump ที่เข้ารหัส
