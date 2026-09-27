#!/usr/bin/env bash
# ==============================================================================
# PDH SMART EMS — Production Zero-Downtime Safe Deployment Script
# Target: Ubuntu 22.04 / 24.04 LTS (Hostinger VPS / Production Server)
# ==============================================================================
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/pdhsmartems}"
BRANCH="master"

echo "============================================================"
echo "🚑 PDH Smart EMS — Safe Production Deployment Pipeline"
echo "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
echo "Target Branch: ${BRANCH}"
echo "============================================================"

# Navigate to project workspace
cd "${APP_DIR}"

# 1. Git Fetch
echo "[1/8] Fetching remote repository..."
git fetch origin

# 2. Git Status Check
echo "[2/8] Inspecting git working tree status..."
git status

# 3. Pull from Origin Master
echo "[3/8] Pulling latest commits from origin/${BRANCH}..."
git pull origin "${BRANCH}"

# 4. Install Dependencies
echo "[4/8] Installing dependencies across workspace..."
npm run install:server
npm run install:client

# 5. Run Verification Tests
echo "[5/8] Running Automated Test Suite..."
cd "${APP_DIR}/client"
npm test -- --run
cd "${APP_DIR}"

# 6. Build Production Bundles (Client & Server)
echo "[6/8] Building Production Bundles..."
npm run build:server
npm run build:client

# 7. Zero-Downtime PM2 Reload (Only reached if all prior steps succeeded)
echo "[7/8] Reloading PM2 Application Cluster..."
if pm2 describe pdh-smart-ems-api > /dev/null 2>&1; then
    pm2 reload ecosystem.config.js --env production
else
    pm2 start ecosystem.config.js --env production
fi
pm2 save

# 8. Reload Nginx Web Server
echo "[8/8] Testing and Reloading Nginx..."
if command -v nginx > /dev/null 2>&1; then
    sudo nginx -t
    sudo systemctl reload nginx
fi

echo "============================================================"
echo "🎉 DEPLOYMENT SUCCESSFUL: PDH Smart EMS is running on production."
echo "============================================================"
