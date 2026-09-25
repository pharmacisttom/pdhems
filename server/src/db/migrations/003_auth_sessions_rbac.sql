-- PDH Smart EMS Schema Migration 003: Authentication, Sessions, Security Events & RBAC Enhancement

-- 1. Upgrade users table with required enterprise IAM fields
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS employee_code VARCHAR(50) NULL AFTER id,
  ADD COLUMN IF NOT EXISTS first_name VARCHAR(100) NULL AFTER password_hash,
  ADD COLUMN IF NOT EXISTS last_name VARCHAR(100) NULL AFTER first_name,
  ADD COLUMN IF NOT EXISTS display_name VARCHAR(150) NULL AFTER last_name,
  ADD COLUMN IF NOT EXISTS email_optional VARCHAR(100) NULL AFTER phone,
  ADD COLUMN IF NOT EXISTS phone_optional VARCHAR(30) NULL AFTER email_optional,
  ADD COLUMN IF NOT EXISTS status ENUM('ACTIVE', 'INACTIVE', 'LOCKED', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE' AFTER active,
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE AFTER status,
  ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP NULL AFTER must_change_password,
  ADD COLUMN IF NOT EXISTS failed_login_attempts INT NOT NULL DEFAULT 0 AFTER password_changed_at,
  ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP NULL AFTER failed_login_attempts,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP NULL AFTER locked_until,
  ADD COLUMN IF NOT EXISTS last_login_ip VARCHAR(45) NULL AFTER last_login_at,
  ADD COLUMN IF NOT EXISTS created_by INT NULL AFTER last_login_ip,
  ADD COLUMN IF NOT EXISTS updated_by INT NULL AFTER created_by;

-- Populate employee_code and names for existing seed users if null
UPDATE users SET employee_code = 'EMP-001', display_name = full_name, status = IF(active = 1, 'ACTIVE', 'INACTIVE') WHERE username = 'admin' AND employee_code IS NULL;
UPDATE users SET employee_code = 'EMP-002', display_name = full_name, status = IF(active = 1, 'ACTIVE', 'INACTIVE') WHERE username = 'dispatcher' AND employee_code IS NULL;
UPDATE users SET employee_code = 'DRV-001', display_name = full_name, status = IF(active = 1, 'ACTIVE', 'INACTIVE') WHERE username = 'driver1' AND employee_code IS NULL;

-- 2. Sessions table for server-side lifecycle & revocation
CREATE TABLE IF NOT EXISTS sessions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  session_id VARCHAR(100) NOT NULL UNIQUE,
  token_hash VARCHAR(64) NOT NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(255) NULL,
  device_info VARCHAR(150) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  revocation_reason VARCHAR(100) NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_session_user (user_id),
  INDEX idx_session_lookup (session_id, revoked_at, expires_at),
  INDEX idx_session_token (token_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Security Events table for audit & anomaly monitoring
CREATE TABLE IF NOT EXISTS security_events (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  username_attempt VARCHAR(100) NULL,
  event_type ENUM(
    'LOGIN_SUCCESS',
    'LOGIN_FAILED',
    'ACCOUNT_LOCKED',
    'ACCOUNT_UNLOCKED',
    'PASSWORD_CHANGED',
    'PASSWORD_RESET',
    'SESSION_REVOKED',
    'SESSION_EXPIRED',
    'PERMISSION_DENIED',
    'FORCED_LOGOUT',
    'RATE_LIMIT_TRIGGERED',
    'SUSPICIOUS_REQUEST'
  ) NOT NULL,
  severity ENUM('INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL DEFAULT 'INFO',
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(255) NULL,
  details JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_sec_event_user (user_id, created_at),
  INDEX idx_sec_event_type (event_type, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
