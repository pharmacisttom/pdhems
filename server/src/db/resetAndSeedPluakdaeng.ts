import bcrypt from 'bcryptjs';
import { pool } from './connection';

export async function resetAndSeedPluakdaeng() {
  console.log('=== [PDH SMART EMS] Zeroing Database & Resetting to Pluak Daeng EMS Network ===');
  const conn = await pool.getConnection();

  try {
    await conn.query("SET time_zone = '+00:00'");
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');

    // 1. Wipe all operational and master tables completely
    const tablesToWipe = [
      'gps_tracks',
      'mission_status_logs',
      'pretrip_checklists',
      'mission_crew',
      'ems_missions',
      'geofences',
      'ambulances',
      'drivers',
      'ems_staff',
      'facilities',
      'ems_bases',
      'audit_logs',
      'security_events',
      'sessions',
      'auth_rate_limits',
      'system_settings',
    ];

    for (const table of tablesToWipe) {
      console.log(`Clearing table: ${table}...`);
      await conn.query(`TRUNCATE TABLE \`${table}\``);
    }

    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('✓ All previous database records zeroed successfully.');

    // 2. Roles
    const roles = [
      ['SUPER_ADMIN', 'Super Administrator with full system control'],
      ['EMS_ADMIN', 'EMS Administrator for master data and policies'],
      ['REFER_CENTER', 'Referral Center Coordinator'],
      ['DISPATCHER', 'Emergency Dispatcher and Controller'],
      ['EMS_COMMANDER', 'EMS Chief / Commander'],
      ['DRIVER', 'Ambulance Driver'],
      ['EMS_STAFF', 'EMS Crew (Nurse, EMT, Paramedic, Doctor)'],
      ['VIEWER', 'Read-only viewer']
    ];

    for (const [name, desc] of roles) {
      await conn.query(
        'INSERT IGNORE INTO roles (name, description) VALUES (?, ?)',
        [name, desc]
      );
    }

    // 3. Admin & Staff Users
    const adminPass = process.env.SEED_ADMIN_PASSWORD || 'Smartems10832';
    const staffPass = process.env.SEED_STAFF_PASSWORD || 'Smartems10832';
    const passwordHash = await bcrypt.hash(adminPass, 12);
    const emsPasswordHash = await bcrypt.hash(staffPass, 12);

    const [adminRole]: any = await conn.query('SELECT id FROM roles WHERE name = "SUPER_ADMIN" LIMIT 1');
    const [dispRole]: any = await conn.query('SELECT id FROM roles WHERE name = "DISPATCHER" LIMIT 1');
    const [driverRole]: any = await conn.query('SELECT id FROM roles WHERE name = "DRIVER" LIMIT 1');

    await conn.query(`
      INSERT INTO users (username, password_hash, full_name, role_id, phone, active)
      VALUES 
        ('admin', ?, 'ผู้ดูแลระบบสูงสุด รพ.ปลวกแดง', ?, '038-659171', 1),
        ('dispatcher', ?, 'เจ้าหน้าที่ศูนย์สั่งการ EMS ปลวกแดง', ?, '038-659172', 1),
        ('driver1', ?, 'นายสมชาย ใจดี (คนขับรถ รพ.ปลวกแดง)', ?, '081-111-2222', 1)
      ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), password_hash = VALUES(password_hash)
    `, [passwordHash, adminRole[0].id, emsPasswordHash, dispRole[0].id, emsPasswordHash, driverRole[0].id]);

    // 4. EMS Bases Master (Pluak Daeng Network)
    await conn.query(`
      INSERT INTO ems_bases (id, name, latitude, longitude, geofence_radius, active)
      VALUES
        (1, 'ศูนย์สั่งการกู้ชีพและส่งต่อ รพ.ปลวกแดง (Main Command Station)', 12.975600, 101.215500, 150, 1),
        (2, 'ศูนย์วิทยุและปฏิบัติการ มูลนิธิกู้ภัยอำเภอปลวกแดง (Rescue Base)', 12.980500, 101.221000, 150, 1),
        (3, 'จุดจอดกู้ชีพฉุกเฉิน รพ.กรุงเทพปลวกแดง (BHP EMS Base)', 12.978562, 101.196742, 150, 1),
        (4, 'จุดจอดกู้ชีพ อบต.มาบยางพร (West Sub-station)', 12.962000, 101.148000, 150, 1),
        (5, 'จุดจอดกู้ชีพแม่น้ำคู้ (South Sub-station)', 12.923000, 101.282000, 150, 1)
    `);

    // 5. Facilities Master (Pluak Daeng & Rayong Network)
    await conn.query(`
      INSERT INTO facilities (id, facility_code, name, facility_type, latitude, longitude, geofence_radius, phone_optional, active)
      VALUES
        (1, 'PDH', 'โรงพยาบาลปลวกแดง (ศูนย์แม่ข่าย)', 'HOSPITAL', 12.975600, 101.215500, 200, '038-659171', 1),
        (2, 'BHP', 'โรงพยาบาลกรุงเทพปลวกแดง', 'GENERAL_HOSPITAL', 12.978562, 101.196742, 200, '033-221339', 1),
        (3, 'RY-CENTRAL', 'โรงพยาบาลระยอง (ศูนย์ตติยภูมิ)', 'REGIONAL_HOSPITAL', 12.684100, 101.281800, 300, '038-611104', 1),
        (4, 'BAN-KHAI', 'โรงพยาบาลบ้านค่าย', 'GENERAL_HOSPITAL', 12.784500, 101.298500, 250, '038-641194', 1),
        (5, 'NIKHOM', 'โรงพยาบาลนิคมพัฒนา', 'COMMUNITY_HOSPITAL', 12.825000, 101.178000, 200, '038-636400', 1),
        (6, 'MABTAPHUT', 'โรงพยาบาลเฉลิมพระเกียรติฯ มาบตาพุด', 'COMMUNITY_HOSPITAL', 12.721400, 101.168500, 200, '038-684444', 1),
        (7, 'MABYANGPORN', 'รพ.สต. มาบยางพร (อมตะซิตี้)', 'HEALTH_CENTER', 12.965000, 101.145000, 150, '038-027111', 1),
        (8, 'TASIT', 'รพ.สต. ตาสิทธิ์ (อีสเทิร์นซีบอร์ด)', 'HEALTH_CENTER', 12.998000, 101.265000, 150, '038-028222', 1)
    `);

    // 6. Drivers Master (Affiliated with Pluak Daeng, Rescue Foundation, and BHP)
    await conn.query(`
      INSERT INTO drivers (id, employee_code, first_name, last_name, display_name, phone_optional, driver_license_no_optional, license_type_optional, employment_status, active)
      VALUES
        (1, 'DRV-001', 'สมชาย', 'ใจดี', 'สมชาย ใจดี (รพ.ปลวกแดง)', '081-111-2222', 'DL-7788991', 'ชนิดที่ 2 ทั่วไป/สาธารณะ', 'AVAILABLE', 1),
        (2, 'DRV-002', 'ประเสริฐ', 'เรืองเดช', 'ประเสริฐ เรืองเดช (รพ.ปลวกแดง)', '081-222-3333', 'DL-7788992', 'ชนิดที่ 2 สาธารณะ', 'ON_MISSION', 1),
        (3, 'DRV-003', 'วิชัย', 'วงศ์สุวรรณ', 'วิชัย วงศ์สุวรรณ (มูลนิธิกู้ภัยอำเภอปลวกแดง)', '081-333-4444', 'DL-7788993', 'ชนิดที่ 2 สาธารณะ', 'ON_MISSION', 1),
        (4, 'DRV-004', 'อำนาจ', 'มั่นคง', 'อำนาจ มั่นคง (รพ.กรุงเทพปลวกแดง)', '081-444-5555', 'DL-7788994', 'ชนิดที่ 2 สาธารณะ', 'AVAILABLE', 1)
    `);

    // 7. EMS Staff Master (Paramedic, Nurse, Doctor, EMT across network)
    await conn.query(`
      INSERT INTO ems_staff (id, employee_code, first_name, last_name, display_name, position, profession, phone_optional, active)
      VALUES
        (1, 'STF-001', 'อนันต์', 'สุขประเสริฐ', 'นพ.อนันต์ สุขประเสริฐ (รพ.ปลวกแดง)', 'แพทย์เวชศาสตร์ฉุกเฉิน', 'Doctor', '089-111-0001', 1),
        (2, 'STF-002', 'สุภาพร', 'ศรีสุข', 'พว.สุภาพร ศรีสุข (รพ.ปลวกแดง)', 'พยาบาลวิชาชีพชำนาญการ (หัวหน้าทีม)', 'Nurse', '089-111-0002', 1),
        (3, 'STF-003', 'ธนวัฒน์', 'รักชาติ', 'นายธนวัฒน์ รักชาติ (มูลนิธิกู้ภัยอำเภอปลวกแดง)', 'นักปฏิบัติการฉุกเฉินการแพทย์ (Paramedic)', 'Paramedic', '089-111-0003', 1),
        (4, 'STF-004', 'ณัฐพล', 'ชัยสุวรรณ', 'นายณัฐพล ชัยสุวรรณ (มูลนิธิกู้ภัยอำเภอปลวกแดง)', 'พนักงานฉุกเฉินการแพทย์ (EMT)', 'EMT', '089-111-0004', 1),
        (5, 'STF-005', 'กานดา', 'บุญยืน', 'พว.กานดา บุญยืน (รพ.กรุงเทพปลวกแดง)', 'พยาบาลวิชาชีพ (Refer)', 'Nurse', '089-111-0005', 1)
    `);

    // 8. Ambulances (Fresh GPS timestamps with NOW(), All Rayong registration numbers)
    await conn.query(`
      INSERT INTO ambulances (id, vehicle_code, registration_no, vehicle_type, brand, model, odometer, status, current_latitude, current_longitude, current_heading, current_speed, last_gps_at, gps_quality, active)
      VALUES
        (1, 'EMS-01', 'กข-1101 ระยอง', 'ALS_AMBULANCE', 'Toyota', 'Commuter D4D (รพ.ปลวกแดง)', 45210.5, 'AVAILABLE', 12.975600, 101.215500, 45.0, 0.0, NOW(), 'GOOD', 1),
        (2, 'EMS-02', 'กข-1102 ระยอง', 'ALS_AMBULANCE', 'Toyota', 'Commuter High Roof (รพ.ปลวกแดง)', 68420.0, 'EN_ROUTE', 12.977200, 101.206500, 260.0, 62.5, NOW(), 'GOOD', 1),
        (3, 'RESCUE-01', 'กข-1103 ระยอง', 'BLS_AMBULANCE', 'Toyota', 'Hilux Revo (มูลนิธิกู้ภัยอำเภอปลวกแดง)', 82140.2, 'AT_SCENE', 12.964000, 101.152000, 270.0, 0.0, NOW(), 'GOOD', 1),
        (4, 'BHP-01', 'กข-1104 ระยอง', 'ALS_AMBULANCE', 'Toyota', 'Hiace Super GL (รพ.กรุงเทพปลวกแดง)', 32190.8, 'AVAILABLE', 12.978562, 101.196742, 180.0, 0.0, NOW(), 'GOOD', 1),
        (5, 'RESCUE-02', 'กข-1105 ระยอง', 'INTERMEDIATE', 'Toyota', 'Commuter (มูลนิธิกู้ภัยอำเภอปลวกแดง)', 115200.0, 'AVAILABLE', 12.980500, 101.221000, 90.0, 0.0, NOW(), 'GOOD', 1)
    `);

    // 9. Active Missions (Only Pluak Daeng, Rayong & Rescue Foundation)
    // Mission 1: REFER from รพ.ปลวกแดง to รพ.กรุงเทพปลวกแดง
    await conn.query(`
      INSERT INTO ems_missions (
        id, mission_no, mission_type, status, vehicle_id, driver_id, origin_facility_id, destination_facility_id,
        created_at, dispatched_at, departure_at, pretrip_passed
      )
      VALUES
        (1, 'REF-2026-000101', 'REFER', 'EN_ROUTE', 2, 2, 1, 2,
         DATE_SUB(NOW(), INTERVAL 15 MINUTE), DATE_SUB(NOW(), INTERVAL 14 MINUTE), DATE_SUB(NOW(), INTERVAL 10 MINUTE), 1)
    `);

    // Mission 2: EMERGENCY with Rescue Foundation & Pluak Daeng Hospital at Saphan Si intersection
    await conn.query(`
      INSERT INTO ems_missions (
        id, mission_no, mission_type, status, vehicle_id, driver_id, origin_facility_id, destination_facility_id,
        scene_latitude, scene_longitude, scene_accuracy, scene_description,
        created_at, dispatched_at, departure_at, arrived_at, pretrip_passed
      )
      VALUES
        (2, 'EMS-2026-000001', 'EMERGENCY', 'ARRIVED_SCENE', 3, 3, 1, 1,
         12.964000, 101.152000, 5.0, 'อุบัติเหตุ จยย. ชนรถกระบะ สี่แยกสะพานสี่ ต.มาบยางพร อ.ปลวกแดง (มูลนิธิกู้ภัยอำเภอปลวกแดง ร่วม รพ.ปลวกแดง)',
         DATE_SUB(NOW(), INTERVAL 20 MINUTE), DATE_SUB(NOW(), INTERVAL 18 MINUTE), DATE_SUB(NOW(), INTERVAL 16 MINUTE), DATE_SUB(NOW(), INTERVAL 5 MINUTE), 1)
    `);

    // 10. Mission Crew
    await conn.query(`
      INSERT INTO mission_crew (mission_id, staff_id, crew_role, is_team_leader, status, confirmed)
      VALUES
        (1, 2, 'TEAM_LEADER', 1, 'CONFIRMED', 1),
        (1, 5, 'NURSE', 0, 'CONFIRMED', 1),
        (2, 3, 'TEAM_LEADER', 1, 'CONFIRMED', 1),
        (2, 4, 'EMT', 0, 'CONFIRMED', 1)
    `);

    // 11. GPS Tracks for Active Missions in Pluak Daeng
    const tracksM1 = [
      [1, 2, 12.975600, 101.215500, 20.0, 250.0, 'GOOD', 10],
      [1, 2, 12.976200, 101.212000, 48.0, 255.0, 'GOOD', 8],
      [1, 2, 12.976800, 101.209000, 58.0, 258.0, 'GOOD', 5],
      [1, 2, 12.977200, 101.206500, 62.5, 260.0, 'GOOD', 1]
    ];

    for (const [mId, vId, lat, lng, spd, hdg, qual, minAgo] of tracksM1) {
      await conn.query(`
        INSERT INTO gps_tracks (mission_id, vehicle_id, latitude, longitude, speed, heading, gps_quality, sync_status, recorded_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'SYNCED', DATE_SUB(NOW(), INTERVAL ? MINUTE))
      `, [mId, vId, lat, lng, spd, hdg, qual, minAgo]);
    }

    const tracksM2 = [
      [2, 3, 12.980500, 101.221000, 30.0, 240.0, 'GOOD', 16],
      [2, 3, 12.975600, 101.215500, 60.0, 245.0, 'GOOD', 12],
      [2, 3, 12.969000, 101.185000, 68.0, 250.0, 'GOOD', 8],
      [2, 3, 12.964000, 101.152000, 0.0, 270.0, 'GOOD', 5]
    ];

    for (const [mId, vId, lat, lng, spd, hdg, qual, minAgo] of tracksM2) {
      await conn.query(`
        INSERT INTO gps_tracks (mission_id, vehicle_id, latitude, longitude, speed, heading, gps_quality, sync_status, recorded_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'SYNCED', DATE_SUB(NOW(), INTERVAL ? MINUTE))
      `, [mId, vId, lat, lng, spd, hdg, qual, minAgo]);
    }

    // 12. System Settings
    const settings = [
      ['NORMAL_SYNC_INTERVAL_SEC', '300', 'Batch sync interval for normal refer (seconds)'],
      ['EMERGENCY_SYNC_INTERVAL_SEC', '45', 'Sync interval for active emergency (seconds)'],
      ['GPS_STALE_THRESHOLD_SEC', '120', 'Time without update to trigger TRACKING_DELAYED (seconds)'],
      ['GPS_LOST_THRESHOLD_SEC', '300', 'Time without update to trigger TRACKING_LOST (seconds)'],
      ['MAX_SPEED_WARNING_KMH', '90', 'Speed warning trigger limit (km/h)'],
      ['MAX_SPEED_CRITICAL_KMH', '110', 'Critical speed alarm trigger limit (km/h)'],
      ['DEFAULT_MAP_PROVIDER', 'openstreetmap', 'Map provider engine (openstreetmap, mapbox, google)'],
      ['DEFAULT_ROUTING_PROVIDER', 'simple_estimate', 'Routing engine adapter (simple_estimate, osrm, graphhopper)'],
      ['MAP_DEFAULT_CENTER_LAT', '12.975600', 'Default center latitude for map (PDH Pluak Daeng)'],
      ['MAP_DEFAULT_CENTER_LNG', '101.215500', 'Default center longitude for map (PDH Pluak Daeng)'],
      ['MAP_DEFAULT_ZOOM', '12', 'Default zoom level for command center map']
    ];

    for (const [key, val, desc] of settings) {
      await conn.query(`
        INSERT INTO system_settings (setting_key, setting_value, description)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), description = VALUES(description)
      `, [key, val, desc]);
    }

    console.log('========================================================================');
    console.log('✓ SUCCESS: Database has been 100% reset to ZERO and seeded with:');
    console.log('  - โรงพยาบาลปลวกแดง (ศูนย์แม่ข่าย & สั่งการ)');
    console.log('  - มูลนิธิกู้ภัยอำเภอปลวกแดง (Rescue Foundation Base)');
    console.log('  - โรงพยาบาลกรุงเทพปลวกแดง (Bangkok Hospital Pluak Daeng)');
    console.log('  - เครือข่าย EMS ปลวกแดง (รพ.ระยอง, รพ.บ้านค่าย, รพ.นิคมพัฒนา, รพ.สต.)');
    console.log('  - ทะเบียนรถระยองทั้งหมด 5 คัน สดใหม่พร้อมใช้งาน');
    console.log('========================================================================');
  } catch (error) {
    console.error('Reset and seed failed:', error);
    process.exit(1);
  } finally {
    conn.release();
    await pool.end();
  }
}

resetAndSeedPluakdaeng();
