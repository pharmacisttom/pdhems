#!/usr/bin/env bash
# ==============================================================================
# PDH SMART EMS — Production System Health Check
# ==============================================================================
set -euo pipefail

BASE_URL="${1:-http://127.0.0.1:5000}"

echo "Checking PDH Smart EMS Services at ${BASE_URL}..."

# 1. Check API Health Endpoint
HEALTH_RES=$(curl -sSL "${BASE_URL}/api/health")
echo "Health Response: ${HEALTH_RES}"

if echo "${HEALTH_RES}" | grep -q '"status":"UP"'; then
    echo "✅ Core API Service: UP"
else
    echo "❌ Core API Service: NOT HEALTHY"
    exit 1
fi

if echo "${HEALTH_RES}" | grep -q '"database":"CONNECTED"'; then
    echo "✅ Database Connectivity: CONNECTED"
else
    echo "❌ Database Connectivity: DISCONNECTED"
    exit 1
fi

# 2. Check Vehicles Telematics Endpoint
VEHICLES_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/api/map/vehicles")
if [ "${VEHICLES_STATUS}" -eq 200 ]; then
    echo "✅ Vehicle Telematics Endpoint: HTTP 200 OK"
else
    echo "❌ Vehicle Telematics Endpoint returned HTTP ${VEHICLES_STATUS}"
    exit 1
fi

echo "============================================================"
echo "🎉 ALL HEALTH CHECKS PASSED: PDH Smart EMS is ready for production operation."
echo "============================================================"
