-- Additive AUTH-1 migration; preserves existing IDs, hashes and role assignments.
UPDATE users SET status = 'INACTIVE' WHERE active = 0 AND status = 'ACTIVE';
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_employee_code ON users(employee_code);
CREATE TABLE IF NOT EXISTS auth_rate_limits (
  bucket VARCHAR(64) PRIMARY KEY,
  attempts INT NOT NULL DEFAULT 0,
  window_started DATETIME NOT NULL
) ENGINE=InnoDB;
