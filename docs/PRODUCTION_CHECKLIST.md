# PDH Smart EMS — Production Readiness Checklist

เอกสารนี้รวบรวมรายการตรวจสอบก่อนเริ่มดำเนินการ Deployment บน Production VPS เครื่องใหม่

---

## 1. Readiness Verification Matrix

| หมวดหมู่การตรวจ | รายการตรวจสอบ | สถานะ | หลักฐาน / เอกสารอ้างอิง |
|---|---|:---:|---|
| **Source Code** | [x] source code clean (ไม่มี debug junk, ไฟล์ไม่จำเป็นถูกลบ) | **PASS** | `git status` clean |
| **Build Test** | [x] build pass (Frontend SPA Vite และ Backend TypeScript ผ่าน) | **PASS** | `npm run build` สำเร็จ 0 errors |
| **Lint & Syntax** | [x] lint pass / type checking clean | **PASS** | `tsc -b` passed |
| **Dependencies** | [x] dependencies checked (ไม่มี critical / high CVEs) | **PASS** | `npm audit` ตรวจพบ 0 critical / 0 high |
| **Environment** | [x] .env ready (มีไฟล์แม่แบบและคำอธิบายครบ) | **PASS** | `.env.example`, `docs/ENVIRONMENT.md` |
| **Secrets Exclusion**| [x] secrets excluded (.env, pem, certs, keys ไม่ถูก commit) | **PASS** | `.gitignore` hardened |
| **Database Schema** | [x] DB schema verified (ตาราง, foreign keys, indexes ครบ) | **PASS** | `docs/DATABASE.md`, 6 migration files |
| **PM2 Process** | [x] PM2 verified (Cluster mode, restart policy, memory limit) | **PASS** | `ecosystem.config.js` |
| **Nginx Web Server**| [x] Nginx verified (Reverse Proxy, SSL, Gzip, Security Headers)| **PASS** | `nginx.conf` |
| **Realtime Gateway**| [x] WebSocket / Long-Polling streaming verified | **PASS** | Nginx `proxy_set_header Upgrade` |
| **GPS Logic** | [x] GPS verified (Anti-spike, deduplication, offline cache) | **PASS** | `gpsTrackingEngine.ts`, `mapController.ts` |
| **Smart Map** | [x] map verified (Leaflet, OpenStreetMap, GIS GeoJSON/KML) | **PASS** | `CommandCenterMapPage.tsx`, `gisRoutes.ts` |
| **Mobile & PWA** | [x] mobile verified (Responsive 320px-1280px, Manifest, Touch) | **PASS** | `MobileBottomNav.tsx`, `manifest.json` |
| **Authorization** | [x] RBAC verified (8 บทบาท, ป้องกัน role escalation) | **PASS** | `server/src/middleware/auth.ts`, `docs/RBAC.md` |
| **Audit Logging** | [x] audit log verified (ตาราง audit_logs บันทึกทุกคำสั่งสำคัญ) | **PASS** | `docs/LOGGING.md`, `audit_logs` |
| **Disaster Recovery**| [x] backup plan ready (สคริปต์และคู่มือสำรอง-กู้คืนฐานข้อมูล) | **PASS** | `docs/BACKUP_RESTORE.md`, `scripts/backup-db.sh` |
| **Health Monitoring**| [x] health check ready (สคริปต์ตรวจความพร้อม 10 จุด) | **PASS** | `scripts/health-check.sh`, `/api/health` |
| **Rollback Plan** | [x] rollback plan ready (กู้คืนโค้ดและข้อมูลย้อนหลังได้ทันที) | **PASS** | `docs/BACKUP_RESTORE.md` |

---

## 2. ขั้นตอนปฏิบัติเมื่อได้รับอนุมัติให้ Deploy บน VPS จริง (Next Operational Steps)

เมื่อผู้ใช้อนุมัติให้ทำการขึ้นระบบจริงบน VPS ให้ปฏิบัติตามลำดับต่อไปนี้:

1. **เตรียมฐานข้อมูล Production:**
   - ติดตั้ง MariaDB 10.11 / MySQL 8.0
   - สร้างผู้ใช้ฐานข้อมูลเฉพาะ (`pdh_ems_user`) และฐานข้อมูล `pdh_smart_ems`
   - รัน Migrations ผ่านคำสั่ง `npm run migrate`
2. **ตั้งค่าตัวแปรสภาพแวดล้อม (`.env`):**
   - คัดลอกจาก `.env.example`
   - ตั้งค่า `DB_PASSWORD`, `CORS_ORIGIN=https://<domain>`, `NODE_ENV=production`
3. **ติดตั้ง SSL Certificate (Let's Encrypt / Certbot):**
   - ผูกชื่อโดเมนและขอใบรับรองผ่าน `certbot --nginx`
4. **เริ่มต้น PM2 Service:**
   - `pm2 start ecosystem.config.js --env production`
   - `pm2 save` && `pm2 startup`
5. **ทดสอบ Health Check:**
   - รัน `bash scripts/health-check.sh`
