import bcrypt from 'bcryptjs';
import { pool } from './connection';

async function seed() {
  console.log('Seeding initial PDH Smart EMS data...');
  const conn = await pool.getConnection();

  try {
    // 1. Roles
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

    // 2. Users
    const passwordHash = await bcrypt.hash('admin1234', 10);
    const emsPasswordHash = await bcrypt.hash('ems1234', 10);

    const [adminRole]: any = await conn.query('SELECT id FROM roles WHERE name = "SUPER_ADMIN" LIMIT 1');
    const [dispRole]: any = await conn.query('SELECT id FROM roles WHERE name = "DISPATCHER" LIMIT 1');
    const [driverRole]: any = await conn.query('SELECT id FROM roles WHERE name = "DRIVER" LIMIT 1');

    await conn.query(`
      INSERT INTO users (username, password_hash, full_name, role_id, phone, active)
      VALUES 
        ('admin', ?, 'ผู้ดูแลระบบสูงสุด PDH', ?, '0812345678', 1),
        ('dispatcher', ?, 'เจ้าหน้าที่ศูนย์สั่งการ EMS', ?, '0823456789', 1),
        ('driver1', ?, 'นายสมชาย ใจดี (คนขับรถ)', ?, '0834567890', 1)
      ON DUPLICATE KEY UPDATE full_name = VALUES(full_name)
    `, [passwordHash, adminRole[0].id, emsPasswordHash, dispRole[0].id, emsPasswordHash, driverRole[0].id]);

    // 3. EMS Bases (Section 7)
    await conn.query(`
      INSERT INTO ems_bases (id, name, latitude, longitude, geofence_radius, active)
      VALUES
        (1, 'ศูนย์กู้ชีพและส่งต่อ รพ.โพธาราม (Main Station)', 13.693822, 99.851921, 150, 1),
        (2, 'จุดจอดรถพยาบาล รพ.สต.บ้านเลือก (North Sub-station)', 13.731500, 99.832100, 150, 1),
        (3, 'จุดจอดรถกู้ชีพแยกบางแพ (South Sub-station)', 13.655200, 99.912400, 150, 1)
      ON DUPLICATE KEY UPDATE name = VALUES(name), latitude = VALUES(latitude), longitude = VALUES(longitude)
    `);

    // 4. Facilities (Section 8)
    await conn.query(`
      INSERT INTO facilities (id, facility_code, name, facility_type, latitude, longitude, geofence_radius, phone_optional, active)
      VALUES
        (1, 'PDH', 'โรงพยาบาลโพธาราม (ศูนย์แม่ข่าย)', 'HOSPITAL', 13.693822, 99.851921, 200, '032-231021', 1),
        (2, 'RB-CENTRAL', 'โรงพยาบาลศูนย์ราชบุรี', 'REGIONAL_HOSPITAL', 13.529712, 99.816431, 300, '032-327999', 1),
        (3, 'BAN-PONG', 'โรงพยาบาลบ้านโป่ง', 'GENERAL_HOSPITAL', 13.815243, 99.877123, 250, '032-221111', 1),
        (4, 'DAMNOEN', 'โรงพยาบาลดำเนินสะดวก', 'COMMUNITY_HOSPITAL', 13.518290, 99.957110, 200, '032-241222', 1),
        (5, 'PAK-THO', 'โรงพยาบาลปากท่อ', 'COMMUNITY_HOSPITAL', 13.368140, 99.829150, 200, '032-281099', 1),
        (6, 'BASE-NORTH', 'ฐานกู้ชีพบ้านเลือก', 'EMS_BASE', 13.731500, 99.832100, 150, '032-231112', 1)
      ON DUPLICATE KEY UPDATE name = VALUES(name), latitude = VALUES(latitude), longitude = VALUES(longitude)
    `);

    // 5. Drivers (Section 6)
    await conn.query(`
      INSERT INTO drivers (id, employee_code, first_name, last_name, display_name, phone_optional, driver_license_no_optional, license_type_optional, employment_status, active)
      VALUES
        (1, 'DRV-001', 'สมชาย', 'ใจดี', 'สมชาย ใจดี', '081-111-2222', 'DL-7788991', 'ชนิดที่ 2 ทั่วไป/สาธารณะ', 'AVAILABLE', 1),
        (2, 'DRV-002', 'ประเสริฐ', 'เรืองเดช', 'ประเสริฐ เรืองเดช', '081-222-3333', 'DL-7788992', 'ชนิดที่ 2 สาธารณะ', 'ON_MISSION', 1),
        (3, 'DRV-003', 'วิชัย', 'วงศ์สุวรรณ', 'วิชัย วงศ์สุวรรณ', '081-333-4444', 'DL-7788993', 'ชนิดที่ 2 สาธารณะ', 'ON_MISSION', 1),
        (4, 'DRV-004', 'อำนาจ', 'มั่นคง', 'อำนาจ มั่นคง', '081-444-5555', 'DL-7788994', 'ชนิดที่ 2 สาธารณะ', 'OFF_DUTY', 1)
      ON DUPLICATE KEY UPDATE display_name = VALUES(display_name), employment_status = VALUES(employment_status)
    `);

    // 6. EMS Staff (Section 7)
    await conn.query(`
      INSERT INTO ems_staff (id, employee_code, first_name, last_name, display_name, position, profession, phone_optional, active)
      VALUES
        (1, 'STF-001', 'อนันต์', 'สุขประเสริฐ', 'นพ.อนันต์ สุขประเสริฐ', 'แพทย์เวชศาสตร์ฉุกเฉิน', 'Doctor', '089-111-0001', 1),
        (2, 'STF-002', 'สุภาพร', 'ศรีสุข', 'พว.สุภาพร ศรีสุข', 'พยาบาลวิชาชีพชำนาญการ (หัวหน้าทีม)', 'Nurse', '089-111-0002', 1),
        (3, 'STF-003', 'ธนวัฒน์', 'รักชาติ', 'นายธนวัฒน์ รักชาติ', 'นักปฏิบัติการฉุกเฉินการแพทย์ (Paramedic)', 'Paramedic', '089-111-0003', 1),
        (4, 'STF-004', 'ณัฐพล', 'ชัยสุวรรณ', 'นายณัฐพล ชัยสุวรรณ', 'พนักงานฉุกเฉินการแพทย์ (EMT)', 'EMT', '089-111-0004', 1),
        (5, 'STF-005', 'กานดา', 'บุญยืน', 'พว.กานดา บุญยืน', 'พยาบาลวิชาชีพ (Refer)', 'Nurse', '089-111-0005', 1)
      ON DUPLICATE KEY UPDATE display_name = VALUES(display_name), position = VALUES(position)
    `);

    // 7. Ambulances (Section 8)
    const now = new Date();
    const staleTime = new Date(Date.now() - 15 * 60 * 1000); // 15 mins ago

    await conn.query(`
      INSERT INTO ambulances (id, vehicle_code, registration_no, vehicle_type, brand, model, odometer, status, current_latitude, current_longitude, current_heading, current_speed, last_gps_at, gps_quality, active)
      VALUES
        (1, 'EMS-01', 'นข-1101 ราชบุรี', 'ALS_AMBULANCE', 'Toyota', 'Commuter D4D', 45210.5, 'AVAILABLE', 13.693822, 99.851921, 45.0, 0.0, NOW(), 'GOOD', 1),
        (2, 'EMS-02', 'นข-1102 ราชบุรี', 'ALS_AMBULANCE', 'Toyota', 'Commuter High Roof', 68420.0, 'EN_ROUTE', 13.621200, 99.834000, 180.0, 68.5, NOW(), 'GOOD', 1),
        (3, 'EMS-03', 'นข-1103 ราชบุรี', 'BLS_AMBULANCE', 'Toyota', 'Commuter', 82140.2, 'AT_SCENE', 13.712400, 99.845100, 90.0, 0.0, NOW(), 'GOOD', 1),
        (4, 'EMS-04', 'นข-1104 ราชบุรี', 'ALS_AMBULANCE', 'Toyota', 'Hiace Super GL', 32190.8, 'RETURNING', 13.568000, 99.821000, 355.0, 62.0, NOW(), 'GOOD', 1),
        (5, 'EMS-05', 'นข-1105 ราชบุรี', 'INTERMEDIATE', 'Toyota', 'Commuter', 115200.0, 'TRACKING_LOST', 13.682000, 99.810000, 270.0, 0.0, ?, 'POOR', 1)
      ON DUPLICATE KEY UPDATE status = VALUES(status), current_latitude = VALUES(current_latitude), current_longitude = VALUES(current_longitude), current_speed = VALUES(current_speed), last_gps_at = VALUES(last_gps_at)
    `, [staleTime]);

    // 8. Active Sample Missions
    await conn.query(`
      INSERT INTO ems_missions (id, mission_no, mission_type, status, vehicle_id, driver_id, origin_facility_id, destination_facility_id, departure_at, created_at)
      VALUES
        (1, 'REF-2026-000124', 'REFER', 'EN_ROUTE', 2, 2, 1, 2, NOW(), NOW())
      ON DUPLICATE KEY UPDATE mission_no = VALUES(mission_no), status = VALUES(status)
    `);

    await conn.query(`
      INSERT INTO ems_missions (id, mission_no, mission_type, status, vehicle_id, driver_id, origin_facility_id, destination_facility_id, scene_latitude, scene_longitude, scene_accuracy, scene_description, departure_at, arrived_at, created_at)
      VALUES
        (2, 'EMS-2026-000045', 'EMERGENCY', 'ARRIVED_SCENE', 3, 3, 1, 1, 13.712400, 99.845100, 5.0, 'อุบัติเหตุ จยย. ชนเสาไฟ สี่แยกบ้านเลือก มีผู้บาดเจ็บ 1 ราย รู้สึกตัวดี', NOW(), NOW(), NOW())
      ON DUPLICATE KEY UPDATE mission_no = VALUES(mission_no), status = VALUES(status)
    `);

    // 9. Mission Crew for Active Missions
    await conn.query(`
      INSERT INTO mission_crew (mission_id, staff_id, crew_role, is_team_leader, status)
      VALUES
        (1, 2, 'TEAM_LEADER', 1, 'CONFIRMED'),
        (1, 3, 'PARAMEDIC', 0, 'CONFIRMED'),
        (1, 4, 'EMT', 0, 'CONFIRMED'),
        (2, 5, 'TEAM_LEADER', 1, 'CONFIRMED'),
        (2, 4, 'EMT', 0, 'CONFIRMED')
      ON DUPLICATE KEY UPDATE status = VALUES(status)
    `);

    // 10. Recorded GPS Tracks for Active Missions (Phase MAP-2)
    const tracksM1 = [
      [1, 2, 13.693822, 99.851921, 25.0, 180.0, 'GOOD', 15],
      [1, 2, 13.682100, 99.848900, 56.0, 182.0, 'GOOD', 12],
      [1, 2, 13.668500, 99.843200, 68.0, 185.0, 'GOOD', 9],
      [1, 2, 13.651200, 99.837100, 72.0, 180.0, 'GOOD', 6],
      [1, 2, 13.635000, 99.835000, 70.0, 178.0, 'GOOD', 3],
      [1, 2, 13.621200, 99.834000, 68.5, 180.0, 'GOOD', 1]
    ];

    for (const [mId, vId, lat, lng, spd, hdg, qual, minAgo] of tracksM1) {
      await conn.query(`
        INSERT INTO gps_tracks (mission_id, vehicle_id, latitude, longitude, speed, heading, gps_quality, sync_status, recorded_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'SYNCED', DATE_SUB(NOW(), INTERVAL ? MINUTE))
      `, [mId, vId, lat, lng, spd, hdg, qual, minAgo]);
    }

    const tracksM2 = [
      [2, 3, 13.693822, 99.851921, 30.0, 350.0, 'GOOD', 10],
      [2, 3, 13.702500, 99.848200, 62.0, 345.0, 'GOOD', 6],
      [2, 3, 13.712400, 99.845100, 0.0, 90.0, 'GOOD', 2]
    ];

    for (const [mId, vId, lat, lng, spd, hdg, qual, minAgo] of tracksM2) {
      await conn.query(`
        INSERT INTO gps_tracks (mission_id, vehicle_id, latitude, longitude, speed, heading, gps_quality, sync_status, recorded_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'SYNCED', DATE_SUB(NOW(), INTERVAL ? MINUTE))
      `, [mId, vId, lat, lng, spd, hdg, qual, minAgo]);
    }

    // 10. System Settings
    const settings = [
      ['NORMAL_SYNC_INTERVAL_SEC', '300', 'Batch sync interval for normal refer (seconds)'],
      ['EMERGENCY_SYNC_INTERVAL_SEC', '45', 'Sync interval for active emergency (seconds)'],
      ['GPS_STALE_THRESHOLD_SEC', '120', 'Time without update to trigger TRACKING_DELAYED (seconds)'],
      ['GPS_LOST_THRESHOLD_SEC', '300', 'Time without update to trigger TRACKING_LOST (seconds)'],
      ['MAX_SPEED_WARNING_KMH', '90', 'Speed warning trigger limit (km/h)'],
      ['MAX_SPEED_CRITICAL_KMH', '110', 'Critical speed alarm trigger limit (km/h)'],
      ['DEFAULT_MAP_PROVIDER', 'openstreetmap', 'Map provider engine (openstreetmap, mapbox, google)'],
      ['DEFAULT_ROUTING_PROVIDER', 'simple_estimate', 'Routing engine adapter (simple_estimate, osrm, graphhopper)'],
      ['MAP_DEFAULT_CENTER_LAT', '13.693822', 'Default center latitude for map (PDH)'],
      ['MAP_DEFAULT_CENTER_LNG', '99.851921', 'Default center longitude for map (PDH)'],
      ['MAP_DEFAULT_ZOOM', '12', 'Default zoom level for command center map']
    ];

    for (const [key, val, desc] of settings) {
      await conn.query(`
        INSERT INTO system_settings (setting_key, setting_value, description)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), description = VALUES(description)
      `, [key, val, desc]);
    }

    console.log('Seed completed successfully with initial master records!');
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    conn.release();
    await pool.end();
  }
}

seed();
