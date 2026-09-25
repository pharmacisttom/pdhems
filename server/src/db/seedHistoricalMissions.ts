import { pool } from './connection';

export async function seedHistoricalMissions() {
  console.log('Seeding realistic historical missions for EMS KPIs and Spatial Analytics...');
  const conn = await pool.getConnection();

  try {
    // Check if rich historical missions already seeded
    const [existing]: any = await conn.query('SELECT COUNT(*) as count FROM ems_missions WHERE mission_no = "EMS-2026-HIST-001"');
    if (existing[0]?.count > 0) {
      console.log('Historical test missions already exist in DB. Skipping historical seed.');
      return;
    }

    const historicalMissions = [
      {
        mission_no: 'EMS-2026-HIST-001',
        mission_type: 'EMERGENCY',
        status: 'COMPLETED',
        vehicle_id: 1,
        driver_id: 1,
        origin_facility_id: 1,
        destination_facility_id: 1, // PDH
        scene_lat: 13.712400,
        scene_lng: 99.845100,
        scene_desc: 'จยย. ล้มหน้าตลาดสดบ้านเลือก บาดเจ็บ 1 ราย',
        // Call: -2 days, 14:00
        call_sub_hours: 48,
        t1_dispatch_min: 1.2,
        t2_turnout_min: 1.8,
        t3_response_min: 6.5,
        t4_onscene_min: 11.5,
        t5_transport_min: 8.0,
        t6_handover_min: 7.0,
        t7_return_min: 12.0
      },
      {
        mission_no: 'EMS-2026-HIST-002',
        mission_type: 'EMERGENCY',
        status: 'COMPLETED',
        vehicle_id: 3,
        driver_id: 3,
        origin_facility_id: 1,
        destination_facility_id: 1,
        scene_lat: 13.655200,
        scene_lng: 99.912400,
        scene_desc: 'เก๋งชนปิคอัพ สี่แยกบางแพ ชาย 1 ราย ศีรษะแตก',
        call_sub_hours: 40,
        t1_dispatch_min: 0.8,
        t2_turnout_min: 1.5,
        t3_response_min: 7.2,
        t4_onscene_min: 14.0,
        t5_transport_min: 13.0,
        t6_handover_min: 9.0,
        t7_return_min: 15.0
      },
      {
        mission_no: 'EMS-2026-HIST-003',
        mission_type: 'EMERGENCY',
        status: 'COMPLETED',
        vehicle_id: 2,
        driver_id: 2,
        origin_facility_id: 1,
        destination_facility_id: 2, // RB-CENTRAL
        scene_lat: 13.670500,
        scene_lng: 99.825000,
        scene_desc: 'ชนท้ายรถบรรทุก ถนนเพชรเกษม กม.82 ผู้บาดเจ็บสาหัส (Red Alert)',
        call_sub_hours: 32,
        t1_dispatch_min: 1.0,
        t2_turnout_min: 1.6,
        t3_response_min: 5.9,
        t4_onscene_min: 13.5,
        t5_transport_min: 18.0,
        t6_handover_min: 10.0,
        t7_return_min: 22.0
      },
      {
        mission_no: 'EMS-2026-HIST-004',
        mission_type: 'EMERGENCY',
        status: 'COMPLETED',
        vehicle_id: 4,
        driver_id: 4,
        origin_facility_id: 1,
        destination_facility_id: 1,
        scene_lat: 13.691200,
        scene_lng: 99.855400,
        scene_desc: 'ผู้สูงอายุล้มหมดสติ บริเวณวงเวียนโพธาราม',
        call_sub_hours: 24,
        t1_dispatch_min: 0.6,
        t2_turnout_min: 1.2,
        t3_response_min: 4.5,
        t4_onscene_min: 9.8,
        t5_transport_min: 4.0,
        t6_handover_min: 6.0,
        t7_return_min: 8.0
      },
      {
        mission_no: 'EMS-2026-HIST-005',
        mission_type: 'EMERGENCY',
        status: 'COMPLETED',
        vehicle_id: 1,
        driver_id: 1,
        origin_facility_id: 1,
        destination_facility_id: 1,
        scene_lat: 13.712400,
        scene_lng: 99.845100, // Spot 1 recurring hotspot!
        scene_desc: 'จยย. เฉี่ยวชนคนเดินเท้า หน้าตลาดบ้านเลือก',
        call_sub_hours: 18,
        t1_dispatch_min: 1.1,
        t2_turnout_min: 1.7,
        t3_response_min: 6.8,
        t4_onscene_min: 12.0,
        t5_transport_min: 7.5,
        t6_handover_min: 6.5,
        t7_return_min: 10.0
      },
      {
        mission_no: 'REF-2026-HIST-001',
        mission_type: 'REFER',
        status: 'COMPLETED',
        vehicle_id: 2,
        driver_id: 2,
        origin_facility_id: 1, // PDH
        destination_facility_id: 2, // RB-CENTRAL
        scene_lat: null,
        scene_lng: null,
        scene_desc: null,
        call_sub_hours: 36,
        t1_dispatch_min: 4.0,
        t2_turnout_min: 5.0, // Refer has longer prep
        t3_response_min: 0,
        t4_onscene_min: 0,
        t5_transport_min: 28.0,
        t6_handover_min: 14.0,
        t7_return_min: 26.0
      },
      {
        mission_no: 'REF-2026-HIST-002',
        mission_type: 'REFER',
        status: 'COMPLETED',
        vehicle_id: 1,
        driver_id: 1,
        origin_facility_id: 1, // PDH
        destination_facility_id: 3, // BAN-PONG
        scene_lat: null,
        scene_lng: null,
        scene_desc: null,
        call_sub_hours: 12,
        t1_dispatch_min: 3.5,
        t2_turnout_min: 4.5,
        t3_response_min: 0,
        t4_onscene_min: 0,
        t5_transport_min: 22.0,
        t6_handover_min: 12.0,
        t7_return_min: 20.0
      },
      {
        mission_no: 'REF-2026-HIST-003',
        mission_type: 'REFER',
        status: 'COMPLETED',
        vehicle_id: 4,
        driver_id: 4,
        origin_facility_id: 1, // PDH
        destination_facility_id: 2, // RB-CENTRAL
        scene_lat: null,
        scene_lng: null,
        scene_desc: null,
        call_sub_hours: 6,
        t1_dispatch_min: 2.5,
        t2_turnout_min: 3.5,
        t3_response_min: 0,
        t4_onscene_min: 0,
        t5_transport_min: 27.0,
        t6_handover_min: 15.0,
        t7_return_min: 25.0
      }
    ];

    for (const m of historicalMissions) {
      // Calculate timestamps from sub_hours
      const baseCallTime = new Date(Date.now() - m.call_sub_hours * 3600 * 1000);
      const dispatchedAt = new Date(baseCallTime.getTime() + m.t1_dispatch_min * 60 * 1000);
      const departedAt = new Date(dispatchedAt.getTime() + m.t2_turnout_min * 60 * 1000);

      let arrivedSceneAt = null;
      let leftSceneAt = null;
      let arrivedDestAt = null;

      if (m.mission_type === 'EMERGENCY') {
        arrivedSceneAt = new Date(departedAt.getTime() + m.t3_response_min * 60 * 1000);
        leftSceneAt = new Date(arrivedSceneAt.getTime() + m.t4_onscene_min * 60 * 1000);
        arrivedDestAt = new Date(leftSceneAt.getTime() + m.t5_transport_min * 60 * 1000);
      } else {
        arrivedDestAt = new Date(departedAt.getTime() + m.t5_transport_min * 60 * 1000);
      }

      const handoverAt = new Date(arrivedDestAt.getTime() + m.t6_handover_min * 60 * 1000);
      const returnStartedAt = handoverAt;
      const completedAt = new Date(returnStartedAt.getTime() + m.t7_return_min * 60 * 1000);

      const [res]: any = await conn.query(`
        INSERT INTO ems_missions (
          mission_no, mission_type, status, vehicle_id, driver_id, origin_facility_id, destination_facility_id,
          scene_latitude, scene_longitude, scene_accuracy, scene_description,
          created_at, dispatched_at, departure_at, scene_arrived_at, scene_departure_at, arrived_at, handover_at,
          return_started_at, return_at, completed_at, handover_confirmed_by, handover_notes, pretrip_passed
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 5.0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'พว.สมหญิง (พยาบาลเวรรับส่ง)', 'รับผู้ป่วยเรียบร้อย สัญญาณชีพอิสระปกติ', 1)
        ON DUPLICATE KEY UPDATE status = VALUES(status)
      `, [
        m.mission_no, m.mission_type, m.status, m.vehicle_id, m.driver_id, m.origin_facility_id, m.destination_facility_id,
        m.scene_lat, m.scene_lng, m.scene_desc,
        baseCallTime, dispatchedAt, departedAt, arrivedSceneAt, leftSceneAt, arrivedDestAt, handoverAt,
        returnStartedAt, completedAt, completedAt
      ]);

      const missionId = res.insertId;

      if (missionId) {
        // Seed crew
        await conn.query(`
          INSERT INTO mission_crew (mission_id, staff_id, crew_role, is_team_leader, status, confirmed)
          VALUES (?, 2, 'TEAM_LEADER', 1, 'CONFIRMED', 1), (?, 3, 'PARAMEDIC', 0, 'CONFIRMED', 1)
        `, [missionId, missionId]);

        // Seed 10 GPS track points with realistic speeds and 1 or 2 overspeed records for testing audit rules
        const points = 8;
        for (let i = 0; i < points; i++) {
          const ptTime = new Date(departedAt.getTime() + i * 4 * 60 * 1000);
          const speed = (i === 4 && m.mission_type === 'EMERGENCY') ? 94.5 : (i === 5 && m.mission_type === 'EMERGENCY') ? 96.0 : 65.0;
          const lat = (m.scene_lat ? m.scene_lat : 13.60) + (i * 0.01);
          const lng = (m.scene_lng ? m.scene_lng : 99.83) + (i * 0.005);

          await conn.query(`
            INSERT INTO gps_tracks (mission_id, vehicle_id, latitude, longitude, speed, heading, accuracy, gps_quality, sync_status, recorded_at)
            VALUES (?, ?, ?, ?, ?, 180.0, 5.0, 'GOOD', ?, ?)
          `, [missionId, m.vehicle_id, lat, lng, speed, i % 3 === 0 ? 'PENDING' : 'SYNCED', ptTime]);
        }
      }
    }

    console.log('✓ Successfully seeded 8 historical missions and GPS tracks for KPIs and Heatmap.');
  } catch (err) {
    console.error('Failed to seed historical missions:', err);
  } finally {
    conn.release();
  }
}

if (process.env.RUN_STANDALONE === 'true') {
  seedHistoricalMissions().then(() => pool.end());
}
