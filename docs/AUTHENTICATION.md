# Authentication

The existing Express auth service uses bcrypt and MariaDB-backed opaque sessions. No second identity system was introduced. A random cookie is hashed with SHA-256 for session lookup; password hashing remains bcrypt (12 rounds for new passwords). Existing hashes remain valid.

POST /api/auth/login accepts username (or employee code), password and optional remember boolean. GET /api/auth/me returns the current sanitized identity. POST /api/auth/logout revokes this session; POST /api/auth/logout-all revokes all sessions for this user. POST /api/auth/change-password accepts currentPassword/newPassword and requires a new login on every device afterwards.

Use same-origin cookies and X-PDH-Request: 1 on mutations. Cookie is HttpOnly, SameSite=Strict and Secure in production. Production requires an explicit HTTPS CORS_ORIGIN. The private-device remember option makes the cookie persistent only up to SESSION_MAX_LIFETIME; it never bypasses idle expiry. Tokens are not returned in JSON or placed in browser storage. Old JWTs cease to work at cutover.

Configuration (seconds unless noted): SESSION_IDLE_TIMEOUT=1800, SESSION_MAX_LIFETIME=43200, MAX_FAILED_LOGIN=5 attempts, LOCK_DURATION=900, LOGIN_RATE_LIMIT=30 attempts/IP, LOGIN_RATE_WINDOW=900, PASSWORD_MIN_LENGTH=12 characters; bcrypt input maximum 72 UTF-8 bytes. Keep secrets and seed passwords outside source control. Database connections use UTC.

Deploy together: backup and test restore; verify employee-code uniqueness/cross-namespace ambiguity; apply migrations with npm run migrate in server; configure HTTPS origin/proxy; deploy both client and API; coordinate forced re-login with EMS staff. Never deploy the client against the legacy token API. Preserve original account IDs/hashes. Rollback should restore the tested database/application snapshot together, not silently reactivate legacy JWTs.

Local validation: use scripts/prepare-auth-test.cjs with DB_NAME=pdh_auth1_test_<suffix>, SEED_ADMIN_PASSWORD and SEED_STAFF_PASSWORD set to test fixture values. Run server tests only on that disposable schema, never the operational database. Existing regression fixtures expect admin1234 and ems1234; these are test-only inputs. Build with npm run build, run npm test separately in server and client. Browser test: node --experimental-websocket scripts/test-auth-browser.cjs (requires installed Chrome).

On expiration, the API returns 401; the workspace is removed and login is shown with EMS recovery guidance. A service outage returns 503 and does not grant anonymous access. Mission records remain on the server. Authentication outage fallback is radio/phone coordination and subsequent reconciliation, not indefinite session extension. Unsent local GPS points are cleared when identity ends.
