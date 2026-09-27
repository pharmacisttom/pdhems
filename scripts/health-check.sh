#!/usr/bin/env bash
# ==============================================================================
# PDH SMART EMS — Comprehensive System Health Check Script
# Target: Ubuntu 22.04 / 24.04 LTS (Hostinger VPS / Production Host)
# ==============================================================================
set -euo pipefail

BACKEND_URL="${1:-http://127.0.0.1:5000}"
FRONTEND_URL="${2:-http://127.0.0.1:80}"

echo "============================================================"
echo "🚑 PDH Smart EMS — System Diagnostics & Health Check"
echo "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
echo "============================================================"

# 1. Environment & Runtimes
echo -n "[1/10] Checking Node.js Runtime... "
if command -v node > /dev/null 2>&1; then
    echo "OK ($(node -v))"
else
    echo "FAIL (node not found)"
    exit 1
fi

echo -n "[2/10] Checking npm Package Manager... "
if command -v npm > /dev/null 2>&1; then
    echo "OK (v$(npm -v))"
else
    echo "FAIL (npm not found)"
    exit 1
fi

# 2. Process Manager (PM2)
echo -n "[3/10] Checking PM2 Process Manager... "
if command -v pm2 > /dev/null 2>&1; then
    if pm2 describe pdh-smart-ems-api > /dev/null 2>&1; then
        echo "OK (pdh-smart-ems-api is registered)"
    else
        echo "WARNING (pm2 running but pdh-smart-ems-api not registered)"
    fi
else
    echo "WARNING (pm2 not installed globally or not in PATH)"
fi

# 3. Web Server (Nginx)
echo -n "[4/10] Checking Nginx Service... "
if command -v nginx > /dev/null 2>&1; then
    if systemctl is-active --quiet nginx 2>/dev/null || pgrep -x nginx > /dev/null 2>&1; then
        echo "OK (active and running)"
    else
        echo "WARNING (nginx installed but not active)"
    fi
else
    echo "WARNING (nginx not detected on host)"
fi

# 4. Backend Health Endpoint
echo -n "[5/10] Checking Backend Core Health Endpoint... "
HEALTH_RES=$(curl -sSL -m 5 "${BACKEND_URL}/api/health" || echo '{"status":"UNREACHABLE"}')
if echo "${HEALTH_RES}" | grep -q '"status":"UP"'; then
    echo "OK (UP)"
else
    echo "FAIL (Backend returned: ${HEALTH_RES})"
    exit 1
fi

# 5. Database Connection via Health Status
echo -n "[6/10] Checking Database Connection... "
if echo "${HEALTH_RES}" | grep -q '"database":"CONNECTED"'; then
    echo "OK (CONNECTED)"
else
    echo "FAIL (Database disconnected or unreachable)"
    exit 1
fi

# 6. Frontend Endpoint
echo -n "[7/10] Checking Frontend SPA Endpoint... "
FE_HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -m 5 "${FRONTEND_URL}/" || echo "000")
if [ "${FE_HTTP_CODE}" = "200" ] || [ "${FE_HTTP_CODE}" = "301" ] || [ "${FE_HTTP_CODE}" = "302" ]; then
    echo "OK (HTTP ${FE_HTTP_CODE})"
else
    echo "WARNING (Frontend returned HTTP ${FE_HTTP_CODE})"
fi

# 7. WebSocket / Long-Polling Gateway Header Check
echo -n "[8/10] Checking Telematics Gateway Reverse Proxy Headers... "
GATEWAY_CHECK=$(curl -s -I -m 5 "${BACKEND_URL}/api/map/vehicles" || echo "FAILED")
if echo "${GATEWAY_CHECK}" | grep -qi "HTTP/"; then
    echo "OK (Streaming Gateway Reachable)"
else
    echo "WARNING (Telematics Gateway Unreachable)"
fi

# 8. Disk Space Health
echo -n "[9/10] Checking Disk Space Utilization... "
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "${DISK_USAGE}" -lt 85 ]; then
    echo "OK (${DISK_USAGE}% used)"
else
    echo "WARNING (High Disk Usage: ${DISK_USAGE}% used)"
fi

# 9. Memory Resource Health
echo -n "[10/10] Checking Memory Availability... "
MEM_FREE_MB=$(free -m 2>/dev/null | awk '/^Mem:/{print $7}' || echo "N/A")
if [ "${MEM_FREE_MB}" != "N/A" ]; then
    if [ "${MEM_FREE_MB}" -gt 250 ]; then
        echo "OK (${MEM_FREE_MB} MB available)"
    else
        echo "WARNING (Low Memory: ${MEM_FREE_MB} MB available)"
    fi
else
    echo "OK (Memory check skipped on non-Linux environment)"
fi

echo "============================================================"
echo "🎉 HEALTH CHECK COMPLETED: All critical PDH Smart EMS components verified."
echo "============================================================"
