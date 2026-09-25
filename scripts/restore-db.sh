#!/usr/bin/env bash
# ==============================================================================
# PDH SMART EMS — Database Safe Restore Script
# Usage: ./scripts/restore-db.sh /path/to/pdh_smart_ems_backup_YYYYMMDD.sql.gz
# ==============================================================================
set -euo pipefail

BACKUP_FILE="${1:-}"
DB_NAME="${DB_NAME:-pdh_smart_ems}"
DB_USER="${DB_USER:-pdh_admin}"
DB_PASS="${DB_PASS:-}"

if [ -z "${BACKUP_FILE}" ] || [ ! -f "${BACKUP_FILE}" ]; then
    echo "❌ ERROR: Please specify a valid backup file path."
    echo "Usage: $0 /var/backups/pdhsmartems/pdh_smart_ems_backup_XXXX.sql.gz"
    exit 1
fi

echo "============================================================"
echo "⚠️  CRITICAL: RESTORING DATABASE ${DB_NAME}"
echo "Archive File: ${BACKUP_FILE}"
echo "============================================================"
read -p "Are you sure you want to overwrite '${DB_NAME}'? (type 'RESTORE' to proceed): " CONFIRM

if [ "${CONFIRM}" != "RESTORE" ]; then
    echo "Operation aborted by user."
    exit 0
fi

echo "Decompressing and importing backup into ${DB_NAME}..."
if [ -n "${DB_PASS}" ]; then
    gunzip < "${BACKUP_FILE}" | mysql -u "${DB_USER}" -p"${DB_PASS}" "${DB_NAME}"
else
    gunzip < "${BACKUP_FILE}" | mysql -u "${DB_USER}" "${DB_NAME}"
fi

echo "✅ RESTORE COMPLETED: Database '${DB_NAME}' restored successfully."
