# Audit log

AUTH-1 reuses audit_logs. LOGIN_SUCCESS, LOGIN_FAILED, RATE_LIMIT_TRIGGERED, LOGOUT, LOGOUT_ALL and PASSWORD_CHANGED are recorded without passwords, hashes, cookie tokens or request bodies. Auth transactions fail closed if their audit insert fails. User identity, action, entity and bounded IP/user-agent metadata are included. The independent session_id is not a bearer credential.

The existing general logAudit helper and operational events are retained. Dedicated security_events persistence/viewer, login history filters, correlation IDs, redacted before/after diffs and retention/archive controls remain AUTH-4 work. No normal API/UI can modify authentication audit records. There is no claim of database-level tamper proofing.
