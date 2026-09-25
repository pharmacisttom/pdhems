#!/usr/bin/env bash
# ==============================================================================
# PDH SMART EMS — Automated Database Backup Script
# Schedule via Crontab: 0 2 * * * /var/www/pdhsmartems/scripts/backup-db.sh
# ==============================================================================
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/pdhsmartems}"
DB_NAME="${DB_NAME:-pdh_smart_ems}"
DB_USER="${DB_USER:-pdh_admin}"
DB_PASS="${DB_PASS:-}"
RETENTION_DAYS=30

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_backup_${TIMESTAMP}.sql.gz"

# Create backup directory if not exists
mkdir -p "${BACKUP_DIR}"

echo "============================================================"
echo "📦 Starting PDH Smart EMS Database Backup..."
echo "Database: ${DB_NAME}"
echo "Target: ${BACKUP_FILE}"
echo "============================================================"

# Perform mysqldump with single transaction for consistency without locking
if [ -n "${DB_PASS}" ]; then
    mysqldump -u "${DB_USER}" -p"${DB_PASS}" --single-transaction --quick --routines --triggers "${DB_NAME}" | gzip -9 > "${BACKUP_FILE}"
else
    mysqldump -u "${DB_USER}" --single-transaction --quick --routines --triggers "${DB_NAME}" | gzip -9 > "${BACKUP_FILE}"
fi

BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
echo "✅ Backup completed successfully: ${BACKUP_FILE} (${BACKUP_SIZE})"

# Prune old backups older than RETENTION_DAYS
echo "🧹 Pruning backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -type f -name "${DB_NAME}_backup_*.sql.gz" -mtime +${RETENTION_DAYS} -exec rm -f {} \;
echo "✅ Pruning finished."
