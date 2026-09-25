# AUTH-1 implementation and verification report

Date: 2026-09-25. PHASE: AUTH-1. STATUS: PASS for the scoped checks below; production release remains blocked by AUTH-2 ownership/permission work. Scope: inspect existing architecture, implement and verify AUTH-1 only. AUTH-2 has not started.

## Inspection before changes

- Architecture: React 18/Vite SPA, Express 4/TypeScript API, mysql2, local MariaDB 10.4.32; deployment compose specifies MariaDB 10.11.
- Existing authentication: bcrypt hashes and signed seven-day JWT bearer tokens. JWT fallback secret was present in source. No server-side logout or revocation check. Frontend had no login boundary and retried requests by logging in as an embedded administrator.
- Existing database: users with a single role_id, roles, permissions, role_permissions, audit_logs, operational mission/driver/crew tables. Local existing database contains three users, eight roles, zero permission definitions and zero role permission grants. A sessions table was already present locally. The untracked 003_auth_sessions_rbac.sql was present before work and has been preserved byte-for-byte.
- Roles: SUPER_ADMIN, EMS_ADMIN, EMS_COMMANDER, REFER_CENTER, DISPATCHER, DRIVER, EMS_STAFF, VIEWER.
- Authorization: central authenticate/authorizeRoles helpers existed, but many operational routes used authentication only; map/telemetry reads and writes were public. Permission tables were not enforced. Frontend displayed a static Dispatcher identity.
- Audit: audit_logs and logAudit existed; login success was recorded, failures/logout were missing. Existing general audit helper is best-effort. AUTH-1 authentication audits now participate in the same transaction as the change.

## Security findings and migration plan

1. Removed browser embedded admin credentials and auto-login/replay. Stopped accepting legacy bearer JWTs; cutover requires all users to sign in again.
2. Keep user IDs, bcrypt hashes, role IDs, operational FK relationships. Extend the existing migration rather than create duplicate user/session tables. Add 004 for employee-code uniqueness and shared database rate limits. Do not rerun the seed against production.
3. Add migration ledger/serialized migration execution. Existing SQL is MariaDB-specific (ADD COLUMN IF NOT EXISTS); MySQL 8 compatibility is not claimed. DDL auto-commits: take and restore-test a backup before production migration.
4. Deploy API and client together with explicit HTTPS origin. Keep a coordinated EMS maintenance window; ongoing missions remain in the database and can be resumed after reauthentication. No auth bypass is introduced.
5. AUTH-2 must address database permissions and mission/driver/crew ownership checks before production release. Hiding navigation is not backend authorization.

## AUTH-1 implementation

- Upgrade existing auth endpoints to opaque 256-bit random session credentials in HttpOnly, SameSite=Strict cookies; Secure in production. Store only SHA-256 token digest, independent session ID, user ID, creation/activity/expiry/revocation metadata.
- Username/employee-code login, input validation and bcrypt verification. Generic failure for unknown, inactive, suspended, administratively locked and temporarily locked accounts. Ambiguous username/employee-code matches are denied.
- Database-backed per-IP login limit shared across workers, serialized account failure counters and temporary lock. Password-change attempts are also limited.
- Configurable idle/absolute timeout, login failure/lock and password policies. Each protected request reloads account status and current legacy role. All operational APIs require authentication.
- POST logout/logout-all revoke stored sessions; password change verifies old password and revokes all devices. Must-change accounts can only access auth recovery/logout endpoints until the password is changed.
- Custom request header plus exact Origin check and restricted credentialed CORS protect mutations (including login). API responses use no-store. Auth failures contain no SQL/stack details.
- Responsive login, optional persistent cookie for private devices, account identity, password form and SweetAlert2 confirmation. All fetch callers now share one cookie/CSRF transport, including GPS/dispatch.
- React workspace is unmounted on identity loss. Legacy localStorage token/user/GPS queue and sessionStorage are cleared. Stale in-flight responses are rejected; cross-tab identity changes and bfcache restoration trigger identity reset. GPS stops and loses the old mission context.
- Server supplies transitional navigation from the existing role. Driver has only Driver Cab navigation; this is deliberately not a new permission implementation.

## Database/API/files

Database: preserved pre-existing 003 migration, added 004_auth1_hardening.sql (auth_rate_limits and unique employee_code), schema_migrations ledger. Functional/security tests use pdh_auth1_test_20260925 only. After a successful local backup/restore rehearsal, migrations were applied to the existing local pdh_smart_ems database. All three account IDs, usernames, bcrypt hashes, role IDs and active flags were compared before/after and preserved. Production deployment was not performed.

API: upgraded POST /api/auth/login and GET /api/auth/me; added POST /api/auth/logout, /logout-all and /change-password. Login no longer returns a bearer token. All mutation clients send X-PDH-Request: 1. /api/health remains public.

Files: auth controller/middleware/routes; session utilities; server index/connection/migration runner/seed; client AuthBoundary/auth transport/App/navigation/GPS/dispatch; existing integration tests; new auth lifecycle/client tests; configuration; test scripts and documentation.

## Verification

- Server/client production builds: PASS (Vite warns about an existing large bundle).
- Final server integration run: 35/35 PASS, against real MariaDB. Login, unknown/wrong credentials, all account states, employee code, lock expiry, IP rate limit, cookie flags/token hashing, fixation rotation, logout replay, idle/absolute expiry, account disable, live role changes, CSRF/origin, old bearer denial, logout all, mandatory password change audit exclusion, SQL-injection input rejection, Secure production cookie/persistence and password-change rate limiting checked.
- Existing mission create/assign/pretrip/depart/arrive/handover/return/complete, dispatch and reports regression assertions retained and passed after migrating test authentication to cookies.
- Client: 23/23 PASS including cookie/header behavior, old identity response rejection, expiry clearing, no auto-admin retry and no write replay on network failure.
- Migration: applied on dedicated test database; re-execution with ledger skips completed files. Existing user IDs and password hashes are not rewritten by the new migration.
- Browser: PASS in headless Chrome. Login fits all seven requested viewport sizes; admin login, HttpOnly invisibility to JavaScript, logout confirmation/cancel control, post-logout API 401, browser Back, driver login and absence of admin identity/navigation verified. Evidence: auth1-browser.png. The test uses a separate local HTTP test origin; production TLS is not simulated.

## Known issues / release gate

- Do not mark the entire master prompt or production security acceptance complete. Permission grants, multiple roles, record-level mission/driver authorization, admin back office, security-event viewer, retention management and MFA are later phases.
- Existing operational controllers still require a dedicated authorization/IDOR review. AUTH-1 adds authentication, not ownership enforcement. This is a production release blocker until AUTH-2.
- Local pre-migration backup restored successfully into pdh_auth1_restore_20260925; accounts/hashes/roles and counts for users, sessions, audit_logs and ems_missions matched. Backup remains in ignored .local/auth1-before-migration.sql. Production TLS/proxy setup, production snapshot rehearsal and deployment have not been executed.
- Logout/expiry clears unsent GPS points to prevent cross-account disclosure. During a communications/auth outage, use the established EMS radio/phone channel, keep operational timestamps outside this session and reconcile after login. Durable encrypted user-scoped offline recovery needs a separately approved workflow.
- Rate-limit IP is the actual Express connection IP; no untrusted forwarded headers are accepted. Behind a proxy the default buckets all clients at the proxy. Configure a precisely trusted proxy topology and verify spoofing resistance before deployment.
- Bootstrap fixture passwords are supplied by environment, not embedded in the client. Existing known demo accounts must be reviewed/rotated before deployment; accounts were not reset during this task.

TESTS FAILED: none in the completed final runs. Initial Windows test-runner path and browser-history harness errors were corrected and rerun.

NEXT PHASE: AUTH-2 only after this AUTH-1 report is reviewed; stop here as instructed.
