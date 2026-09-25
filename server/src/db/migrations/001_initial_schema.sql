-- PDH Smart EMS Schema - Foundation & Smart Map Core Module

CREATE TABLE IF NOT EXISTS roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id INT NOT NULL,
  permission_id INT NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  role_id INT NOT NULL,
  phone VARCHAR(20),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS drivers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_code VARCHAR(50) NOT NULL UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  display_name VARCHAR(150) NOT NULL,
  phone_optional VARCHAR(30),
  driver_license_no_optional VARCHAR(50),
  license_type_optional VARCHAR(50),
  license_expiry_optional DATE,
  employment_status ENUM('AVAILABLE','ON_MISSION','OFF_DUTY','LEAVE','SUSPENDED') NOT NULL DEFAULT 'AVAILABLE',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_driver_status (employment_status),
  INDEX idx_driver_active (active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ems_staff (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_code VARCHAR(50) NOT NULL UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  display_name VARCHAR(150) NOT NULL,
  position VARCHAR(100),
  profession VARCHAR(50) NOT NULL DEFAULT 'EMT',
  phone_optional VARCHAR(30),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_staff_profession (profession),
  INDEX idx_staff_active (active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ambulances (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vehicle_code VARCHAR(50) NOT NULL UNIQUE,
  registration_no VARCHAR(50) NOT NULL,
  vehicle_type VARCHAR(50) NOT NULL DEFAULT 'ALS_AMBULANCE',
  brand VARCHAR(50) NOT NULL,
  model VARCHAR(50) NOT NULL,
  year_optional INT,
  odometer DECIMAL(10,2) DEFAULT 0.00,
  status ENUM('AVAILABLE','ASSIGNED','EN_ROUTE','AT_SCENE','AT_DESTINATION','RETURNING','MAINTENANCE','OUT_OF_SERVICE','TRACKING_LOST') NOT NULL DEFAULT 'AVAILABLE',
  current_latitude DECIMAL(10,7) NULL,
  current_longitude DECIMAL(10,7) NULL,
  current_heading DECIMAL(5,2) NULL,
  current_speed DECIMAL(6,2) DEFAULT 0.00,
  last_gps_at TIMESTAMP NULL,
  gps_quality ENUM('GOOD','FAIR','POOR','INVALID') DEFAULT 'GOOD',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_ambulance_status (status),
  INDEX idx_ambulance_active (active),
  INDEX idx_ambulance_last_gps (last_gps_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ems_bases (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  geofence_radius INT NOT NULL DEFAULT 150,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_base_active (active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS facilities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  facility_code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  facility_type ENUM('HOSPITAL','COMMUNITY_HOSPITAL','GENERAL_HOSPITAL','REGIONAL_HOSPITAL','EMS_BASE','OTHER') NOT NULL DEFAULT 'HOSPITAL',
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  geofence_radius INT NOT NULL DEFAULT 200,
  phone_optional VARCHAR(50),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_facility_type (facility_type),
  INDEX idx_facility_active (active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS geofences (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  geofence_type ENUM('BASE','SCENE','HOSPITAL','DESTINATION','CUSTOM') NOT NULL DEFAULT 'HOSPITAL',
  reference_id INT NULL,
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  radius_meters INT NOT NULL DEFAULT 200,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_geofence_type (geofence_type),
  INDEX idx_geofence_active (active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ems_missions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  mission_no VARCHAR(50) NOT NULL UNIQUE,
  mission_type ENUM('REFER','EMERGENCY','OTHER') NOT NULL DEFAULT 'REFER',
  status ENUM(
    'CREATED',
    'ASSIGNED',
    'CREW_CONFIRMED',
    'READY',
    'DEPARTED',
    'EN_ROUTE',
    'ARRIVED_SCENE',
    'ON_SCENE',
    'LEAVING_SCENE',
    'EN_ROUTE_TO_HOSPITAL',
    'ARRIVED',
    'HANDOVER_COMPLETED',
    'RETURNING',
    'COMPLETED',
    'CANCELLED'
  ) NOT NULL DEFAULT 'CREATED',
  vehicle_id INT NULL,
  driver_id INT NULL,
  origin_facility_id INT NULL,
  destination_facility_id INT NULL,
  scene_latitude DECIMAL(10,7) NULL,
  scene_longitude DECIMAL(10,7) NULL,
  scene_accuracy DECIMAL(6,2) NULL,
  scene_description TEXT NULL,
  departure_at TIMESTAMP NULL,
  arrived_at TIMESTAMP NULL,
  handover_at TIMESTAMP NULL,
  return_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  cancelled_at TIMESTAMP NULL,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (vehicle_id) REFERENCES ambulances(id) ON DELETE SET NULL,
  FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL,
  FOREIGN KEY (origin_facility_id) REFERENCES facilities(id) ON DELETE SET NULL,
  FOREIGN KEY (destination_facility_id) REFERENCES facilities(id) ON DELETE SET NULL,
  INDEX idx_mission_type (mission_type),
  INDEX idx_mission_status (status),
  INDEX idx_mission_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mission_crew (
  id INT AUTO_INCREMENT PRIMARY KEY,
  mission_id INT NOT NULL,
  staff_id INT NOT NULL,
  crew_role ENUM('DRIVER','TEAM_LEADER','DOCTOR','NURSE','EMT','AEMT','PARAMEDIC','OTHER') NOT NULL DEFAULT 'EMT',
  is_team_leader BOOLEAN NOT NULL DEFAULT FALSE,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  assigned_by INT NULL,
  status VARCHAR(50) DEFAULT 'CONFIRMED',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (mission_id) REFERENCES ems_missions(id) ON DELETE CASCADE,
  FOREIGN KEY (staff_id) REFERENCES ems_staff(id) ON DELETE CASCADE,
  INDEX idx_crew_mission (mission_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mission_status_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  mission_id INT NOT NULL,
  status VARCHAR(50) NOT NULL,
  latitude DECIMAL(10,7) NULL,
  longitude DECIMAL(10,7) NULL,
  note TEXT NULL,
  logged_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (mission_id) REFERENCES ems_missions(id) ON DELETE CASCADE,
  INDEX idx_status_mission (mission_id),
  INDEX idx_status_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS gps_tracks (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  mission_id INT NULL,
  vehicle_id INT NOT NULL,
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  altitude DECIMAL(8,2) NULL,
  speed DECIMAL(6,2) DEFAULT 0.00,
  heading DECIMAL(5,2) NULL,
  accuracy DECIMAL(6,2) DEFAULT 10.00,
  gps_quality ENUM('GOOD','FAIR','POOR','INVALID') NOT NULL DEFAULT 'GOOD',
  sync_status ENUM('PENDING','SYNCED') NOT NULL DEFAULT 'SYNCED',
  recorded_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vehicle_id) REFERENCES ambulances(id) ON DELETE CASCADE,
  FOREIGN KEY (mission_id) REFERENCES ems_missions(id) ON DELETE SET NULL,
  INDEX idx_gps_vehicle_time (vehicle_id, recorded_at),
  INDEX idx_gps_mission_time (mission_id, recorded_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS system_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  description VARCHAR(255),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  user_name VARCHAR(100) NULL,
  action VARCHAR(100) NOT NULL,
  entity VARCHAR(100) NOT NULL,
  entity_id VARCHAR(100) NULL,
  details JSON NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_created (created_at),
  INDEX idx_audit_entity (entity, entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
