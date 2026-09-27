# PDH Smart EMS — Backup & Disaster Recovery Guide

---

## 1. ข้อกำหนดสำคัญ (Critical Rules)
- **ห้าม** ทำการสำรองไดเรกทอรี `node_modules/` (ให้ติดตั้งใหม่ผ่าน `npm install` เสมอ)
- **ห้าม** Commit หรือ Push ไฟล์ Backup SQL Dump หรือ Credentials ไปไว้บน GitHub โดยเด็ดขาด
- ไฟล์สำรองทั้งหมดควรเก็บบน Secondary Storage, Encrypted Cloud หรือ Offsite Backup

---

## 2. การสำรองข้อมูล (Backup Procedures)

### 2.1 สำรองฐานข้อมูล (Database Backup)
ใช้สคริปต์ `scripts/backup-db.sh` หรือคำสั่ง `mysqldump` / `mariadb-dump` พร้อม Flag `--single-transaction` เพื่อไม่ให้กระทบกับการทำงานของระบบระหว่างมีภารกิจฉุกเฉิน:

```bash
# ตัวอย่างคำสั่งสร้างไฟล์สำรองฐานข้อมูลแบบบีบอัด
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/var/backups/pdhsmartems"
mkdir -p "${BACKUP_DIR}"

mysqldump -u pdh_ems_user -p \
  --single-transaction \
  --quick \
  --routines \
  --triggers \
  pdh_smart_ems | gzip > "${BACKUP_DIR}/pdh_ems_${TIMESTAMP}.sql.gz"

chmod 600 "${BACKUP_DIR}/pdh_ems_${TIMESTAMP}.sql.gz"
```

### 2.2 สำรองไฟล์การตั้งค่าระบบ (Configuration Backup)
จัดเก็บเฉพาะไฟล์ Config นอกไดเรกทอรีเว็บ:
```bash
tar -czvf "${BACKUP_DIR}/config_backup_${TIMESTAMP}.tar.gz" \
  /var/www/pdhsmartems/.env \
  /etc/nginx/sites-available/pdhsmartems.conf \
  /var/www/pdhsmartems/ecosystem.config.js
```

### 2.3 สำรองไฟล์เอกสารแนบและรูปภาพ (Uploads & Media Backup)
```bash
tar -czvf "${BACKUP_DIR}/uploads_backup_${TIMESTAMP}.tar.gz" \
  /var/www/pdhsmartems/uploads
```

---

## 3. ขั้นตอนการกู้คืนระบบ (Disaster Recovery & Restore Procedures)

### 3.1 ขั้นตอนที่ 1: เตรียมสภาพแวดล้อม
```bash
# สร้างฐานข้อมูลใหม่หากเซิร์ฟเวอร์เสียหายสมบูรณ์
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS pdh_smart_ems CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

### 3.2 ขั้นตอนที่ 2: กู้คืนฐานข้อมูลจากไฟล์สำรอง
```bash
# นำเข้าข้อมูลจากไฟล์ .sql.gz
gunzip < /var/backups/pdhsmartems/pdh_ems_YYYYMMDD_HHMMSS.sql.gz | mysql -u pdh_ems_user -p pdh_smart_ems
```

### 3.3 ขั้นตอนที่ 3: กู้คืนไฟล์ Config และ Uploads
```bash
# กู้คืนไฟล์ .env
cp /path/to/secured/backup/.env /var/www/pdhsmartems/.env

# กู้คืนไฟล์ uploads
tar -xzvf /var/backups/pdhsmartems/uploads_backup_*.tar.gz -C /var/www/pdhsmartems/
```

### 3.4 ขั้นตอนที่ 4: ตรวจสอบความถูกต้องและเริ่มระบบใหม่
```bash
# ตรวจสอบสุขภาพระบบ
bash /var/www/pdhsmartems/scripts/health-check.sh

# เริ่มต้นระบบผ่าน PM2
pm2 reload ecosystem.config.js --env production
```
