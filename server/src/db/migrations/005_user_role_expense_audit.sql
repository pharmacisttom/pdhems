-- PDH Smart EMS Schema Migration 005: User & Role Management, Identity Verification, Password Policy & Expense Tracking

-- 1. Add Citizen ID and Agency Affiliation to users table
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS citizen_id VARCHAR(13) NULL AFTER phone,
  ADD COLUMN IF NOT EXISTS agency_affiliation VARCHAR(100) NULL DEFAULT 'โรงพยาบาลปลวกแดง' AFTER role_id;

-- Add index on citizen_id for fast identity verification lookups
ALTER TABLE users ADD INDEX IF NOT EXISTS idx_users_citizen_id (citizen_id);

-- Update existing seed accounts with valid 13-digit Citizen IDs and phone numbers for verification
UPDATE users SET 
  citizen_id = '1219900123456', 
  phone = '081-111-2222',
  agency_affiliation = 'โรงพยาบาลปลวกแดง'
WHERE username = 'admin' AND (citizen_id IS NULL OR citizen_id = '');

UPDATE users SET 
  citizen_id = '1219900234567', 
  phone = '081-222-3333',
  agency_affiliation = 'ศูนย์สั่งการ รพ.ปลวกแดง'
WHERE username = 'dispatcher' AND (citizen_id IS NULL OR citizen_id = '');

UPDATE users SET 
  citizen_id = '1219900345678', 
  phone = '081-333-4444',
  agency_affiliation = 'โรงพยาบาลปลวกแดง'
WHERE username = 'driver1' AND (citizen_id IS NULL OR citizen_id = '');

-- 2. Create system_expenses table for Operational, Fuel, Referral and Maintenance cost tracking
CREATE TABLE IF NOT EXISTS system_expenses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  expense_no VARCHAR(50) NOT NULL UNIQUE,
  category ENUM('FUEL', 'MAINTENANCE', 'MEDICAL_SUPPLIES', 'REFER_FEE', 'OT_ALLOWANCE', 'TOLL_WAY', 'EQUIPMENT', 'OTHER') NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  title VARCHAR(255) NOT NULL,
  mission_id INT NULL,
  vehicle_id INT NULL,
  facility_id INT NULL,
  invoice_no VARCHAR(100) NULL,
  expense_date DATE NOT NULL,
  notes TEXT NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_expenses_date (expense_date),
  INDEX idx_expenses_cat (category),
  INDEX idx_expenses_mission (mission_id),
  INDEX idx_expenses_vehicle (vehicle_id),
  INDEX idx_expenses_creator (created_by),
  FOREIGN KEY (mission_id) REFERENCES ems_missions(id) ON DELETE SET NULL,
  FOREIGN KEY (vehicle_id) REFERENCES ambulances(id) ON DELETE SET NULL,
  FOREIGN KEY (facility_id) REFERENCES facilities(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Seed initial expense entries for Pluak Daeng operational network
INSERT INTO system_expenses (expense_no, category, amount, title, mission_id, vehicle_id, facility_id, invoice_no, expense_date, notes, created_by)
SELECT 'EXP-2026-0001', 'FUEL', 1850.00, 'ค่าน้ำมันดีเซล B7 รถพยาบาล EMS-01 (ภารกิจส่งต่อ รพ.ระยอง)', 1, 1, 1, 'INV-PTT-78912', CURRENT_DATE(), 'เติมน้ำมันเต็มถัง ปั๊ม ปตท. แยกปลวกแดง', 1
WHERE NOT EXISTS (SELECT 1 FROM system_expenses WHERE expense_no = 'EXP-2026-0001');

INSERT INTO system_expenses (expense_no, category, amount, title, mission_id, vehicle_id, facility_id, invoice_no, expense_date, notes, created_by)
SELECT 'EXP-2026-0002', 'OT_ALLOWANCE', 1200.00, 'ค่าตอบแทนเวรปฏิบัติการส่งต่อผู้ป่วยฉุกเฉินวิกฤต', 1, 1, 1, 'OT-2026-0901', CURRENT_DATE(), 'ทีมส่งต่อ 3 นาย (พว. รพ.ปลวกแดง + พลขับ)', 1
WHERE NOT EXISTS (SELECT 1 FROM system_expenses WHERE expense_no = 'EXP-2026-0002');

INSERT INTO system_expenses (expense_no, category, amount, title, mission_id, vehicle_id, facility_id, invoice_no, expense_date, notes, created_by)
SELECT 'EXP-2026-0003', 'MEDICAL_SUPPLIES', 3450.00, 'ออกซิเจนทางการแพทย์และชุดดามกระดูกฉุกเฉิน (มูลนิธิกู้ภัยอำเภอปลวกแดง)', NULL, 3, 2, 'MED-660921', CURRENT_DATE(), 'จัดซื้อเวชภัณฑ์ร่วมระหว่าง รพ.ปลวกแดง และ กู้ภัยปลวกแดง', 1
WHERE NOT EXISTS (SELECT 1 FROM system_expenses WHERE expense_no = 'EXP-2026-0003');

INSERT INTO system_expenses (expense_no, category, amount, title, mission_id, vehicle_id, facility_id, invoice_no, expense_date, notes, created_by)
SELECT 'EXP-2026-0004', 'MAINTENANCE', 4800.00, 'เปลี่ยนถ่ายน้ำมันเครื่องและตรวจเช็กระบบเบรก EMS-02 (รพ.ปลวกแดง)', NULL, 2, 1, 'SVC-TOYOTA-4401', CURRENT_DATE(), 'ศูนย์บริการโตโยต้า ระยอง สาขาปลวกแดง', 1
WHERE NOT EXISTS (SELECT 1 FROM system_expenses WHERE expense_no = 'EXP-2026-0004');

-- 4. Initial Audit Logs for system initialization
INSERT INTO audit_logs (user_id, user_name, action, entity, entity_id, details, ip_address, user_agent)
SELECT 1, 'admin', 'SYSTEM_INITIALIZATION', 'system_expenses', 'EXP-2026-0001', '{"message": "เริ่มต้นระบบบันทึกค่าใช้จ่ายและตรวจสอบสิทธิ์เครือข่าย รพ.ปลวกแดง"}', '127.0.0.1', 'Migration Script'
WHERE NOT EXISTS (SELECT 1 FROM audit_logs WHERE action = 'SYSTEM_INITIALIZATION');
