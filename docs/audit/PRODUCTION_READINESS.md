# PDH SMART EMS — PRODUCTION DEPLOYMENT & READINESS AUDIT

**Audit Date:** 2026-09-25  
**Target Environment:** Ubuntu 22.04 LTS / 24.04 LTS (Hostinger VPS / On-Premise Hospital Server)  
**System:** PDH Smart EMS Command & Refer System  
**Auditor Roles:** DevSecOps Engineer, Production Reliability Engineer  

---

## 1. Production Architecture Specification

```
                                  [ HTTPS Internet / Intranet ]
                                                |
                                                v
                                  [ Nginx Reverse Proxy / SSL ]
                                  Port 443 (Certbot Let's Encrypt)
                                                |
                      +-------------------------+-------------------------+
                      |                                                   |
                      v                                                   v
           [ Static Frontend Build ]                            [ Node.js Express API ]
           /var/www/pdhsmartems/client/dist                     PM2 Cluster (Port 5000)
                                                                          |
                                                                          v
                                                               [ MariaDB / MySQL 8.0 ]
                                                               Port 3306 (127.0.0.1)
```

---

## 2. Production Readiness Checklist

| Requirement | Audit Criterion | Status | Evidence / Notes |
|---|---|---|---|
| **Zero P0 Defects** | No critical dispatch, depart, or data-loss bugs | **PASS** | 0 P0 defects identified. |
| **Security Hardening** | JWT auth, bcrypt passwords, RBAC, helmet headers | **PASS** | Tested in `SECURITY_AUDIT.md`. |
| **No Patient Medical Data** | Zero HN, CID, or clinical notes in telematics | **PASS** | Verified in `SECURITY_AUDIT.md`. |
| **Production Build** | Frontend and Backend compile cleanly | **PASS** | `npm run build` succeeds on both `client/` and `server/`. |
| **Database Migrations** | Schema scripts versioned and reproducible | **PASS** | `001_initial_schema.sql` creates all 18 tables with keys and indexes. |
| **PM2 Process Manager** | Auto-restart on crash, log rotation, systemd startup | **CONFIGURED** | `ecosystem.config.js` prepared. |
| **Nginx Reverse Proxy** | Static SPA caching, API proxying, WebSocket upgrades | **CONFIGURED** | `nginx.conf` template prepared. |
| **Database Backup Script** | Automated daily mysqldump with retention | **CONFIGURED** | `scripts/backup-db.sh` created. |
| **Database Restore Verification**| Test restore executed in staging | **PARTIAL** | Script created; physical disaster recovery drill pending staging deployment. |
| **HTTPS / SSL Certificate** | Valid TLS 1.3 certificate | **PENDING** | To be issued via Let's Encrypt upon DNS assignment to Hostinger VPS. |

---

## 3. Production Deployment Artifacts

### 3.1 PM2 Configuration (`ecosystem.config.js`)
```javascript
module.exports = {
  apps: [
    {
      name: 'pdh-smart-ems-api',
      script: './dist/server.js',
      cwd: '/var/www/pdhsmartems/server',
      instances: 2,
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000
      }
    }
  ]
};
```

### 3.2 Nginx Configuration Template
```nginx
server {
    listen 80;
    server_name ems.photharam.moph.go.th;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ems.photharam.moph.go.th;

    ssl_certificate /etc/letsencrypt/live/ems.photharam.moph.go.th/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ems.photharam.moph.go.th/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Frontend Static Assets
    root /var/www/pdhsmartems/client/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API Reverse Proxy
    location /api/ {
        proxy_pass http://127.0.0.1:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 3.3 Database Backup & Restore Plan

#### Automated Daily Backup Script (`scripts/backup-db.sh`)
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/pdh_smart_ems"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
mkdir -p "$BACKUP_DIR"

mysqldump -u pdh_ems_user -p"$DB_PASSWORD" pdh_smart_ems \
  --single-transaction --quick | gzip > "$BACKUP_DIR/pdh_smart_ems_$TIMESTAMP.sql.gz"

# Retain last 30 days
find "$BACKUP_DIR" -type f -name "*.sql.gz" -mtime +30 -delete
```

#### Restoration Procedure
```bash
gunzip < /var/backups/pdh_smart_ems/pdh_smart_ems_TIMESTAMP.sql.gz | mysql -u pdh_ems_user -p pdh_smart_ems
```

---

## 4. Final Readiness Assessment

**Verdict:** **PILOT STAGING READY**  
The core architecture, database, API, Smart Map, and telematics modules are verified, compiled, and operating without error. Full production deployment requires:
1. VPS provisioning on Hostinger / Hospital data center.
2. Domain DNS configuration and Let's Encrypt SSL issuance.
3. Conducting a verified physical database restore rehearsal in staging.
