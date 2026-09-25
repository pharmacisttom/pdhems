-- Phase 2 & 3: Crew, Pre-trip Readiness & Refer Workflow Migration

-- 1. Create pretrip_checklists table
CREATE TABLE IF NOT EXISTS pretrip_checklists (
  id INT AUTO_INCREMENT PRIMARY KEY,
  mission_id INT NOT NULL,
  vehicle_id INT NOT NULL,
  inspector_id INT NOT NULL,
  fuel_level ENUM('FULL','THREE_QUARTERS','HALF','ONE_QUARTER','LOW') NOT NULL DEFAULT 'FULL',
  oxygen_level_psi INT NOT NULL DEFAULT 2000,
  medical_equipment_ready BOOLEAN NOT NULL DEFAULT TRUE,
  lights_siren_working BOOLEAN NOT NULL DEFAULT TRUE,
  tires_brakes_checked BOOLEAN NOT NULL DEFAULT TRUE,
  communication_device_ready BOOLEAN NOT NULL DEFAULT TRUE,
  dashcam_gps_ready BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT NULL,
  is_passed BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (mission_id) REFERENCES ems_missions(id) ON DELETE CASCADE,
  FOREIGN KEY (vehicle_id) REFERENCES ambulances(id) ON DELETE CASCADE,
  INDEX idx_pretrip_mission (mission_id),
  INDEX idx_pretrip_vehicle (vehicle_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Enhance mission_crew with confirmation status
ALTER TABLE mission_crew 
  ADD COLUMN IF NOT EXISTS confirmed BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP NULL;

-- 3. Enhance ems_missions with crew confirmation, override, handover, and return tracking
ALTER TABLE ems_missions
  ADD COLUMN IF NOT EXISTS driver_confirmed_at TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS crew_confirmed_at TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS pretrip_passed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_emergency_override BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS override_reason TEXT NULL,
  ADD COLUMN IF NOT EXISTS override_by_user_id INT NULL,
  ADD COLUMN IF NOT EXISTS override_at TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS handover_confirmed_by VARCHAR(150) NULL,
  ADD COLUMN IF NOT EXISTS handover_notes TEXT NULL,
  ADD COLUMN IF NOT EXISTS return_started_at TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS return_completed_at TIMESTAMP NULL;
