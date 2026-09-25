#!/usr/bin/env bash
# ==============================================================================
# PDH SMART EMS — Automated Production Deployment Script
# Target: Ubuntu 22.04 / 24.04 LTS (Hostinger VPS / On-Premise)
# ==============================================================================
set -euo pipefail

APP_DIR="/var/www/pdhsmartems"
BRANCH="${1:-master}"

echo "============================================================"
echo "🚑 Starting PDH Smart EMS Production Deployment..."
echo "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
echo "Target Branch: ${BRANCH}"
echo "============================================================"

# 1. Navigate to Project Directory
cd "${APP_DIR}"

# 2. Fetch latest changes from Git
echo "[1/6] Fetching latest source code from git..."
git fetch origin
git checkout "${BRANCH}"
git pull origin "${BRANCH}"

# 3. Install dependencies and build Server
echo "[2/6] Building Backend API..."
cd "${APP_DIR}/server"
npm ci --prefer-offline --no-audit
npm run build

# 4. Run database migrations
echo "[3/6] Applying database schema migrations..."
npm run migrate

# 5. Build Frontend SPA Bundle
echo "[4/6] Building Frontend SPA..."
cd "${APP_DIR}/client"
npm ci --prefer-offline --no-audit
npm run build

# 6. Reload PM2 Process Cluster
echo "[5/6] Zero-downtime reload of PM2 Cluster..."
cd "${APP_DIR}"
if pm2 describe pdh-smart-ems-api > /dev/null 2>&1; then
    pm2 reload ecosystem.config.js --env production
else
    pm2 start ecosystem.config.js --env production
fi
pm2 save

# 7. Test Nginx Configuration & Reload
echo "[6/6] Reloading Nginx..."
sudo nginx -t
sudo systemctl reload nginx

# 8. Post-deployment Health Check
echo "============================================================"
echo "Verifying application health..."
sleep 3
if curl -fsSL http://127.0.0.1:5000/api/health | grep -q '"status":"UP"'; then
    echo "✅ DEPLOYMENT SUCCESS: PDH Smart EMS is UP and running healthy!"
else
    echo "❌ WARNING: Health check failed! Check logs: pm2 logs pdh-smart-ems-api"
    exit 1
fi
echo "============================================================"
