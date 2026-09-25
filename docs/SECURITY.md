# Security status

AUTH-1 closes the embedded administrator auto-login, irrevocable JWT, public operational endpoint and client identity persistence issues. See audit/AUTH1_REPORT.md for evidence and release blockers.

Authentication checks database status, active flag, lock and session lifetime on every request. Mutation CSRF controls require a custom header and reject unexpected Origin; production CORS origin must be explicit HTTPS. APIs do not cache identity/data. Auth/audit writes are transactional and include no credentials. Disable/lock is enforced on the next request, and password change/logout revoke stored sessions. Requests already executing cannot be retroactively withdrawn.

Before production: complete AUTH-2 ownership/permission controls, rotate known demo credentials, validate TLS and trusted proxy topology, perform an upgrade/restore rehearsal and approve EMS recovery procedures. Database permission/row-level authorization remains a known blocker, not a passed security audit. No penetration-test certification is claimed.

Use protected DB backups covering users, sessions, audit_logs, auth_rate_limits and security_events. Archive according to an approved retention configuration and restrict database writes to audit tables; do not add UI deletion/editing. Existing scripts/backup-db.sh and restore-db.sh require operator verification. Local backup/restore was exercised and verified; production restore was not exercised in AUTH-1.
