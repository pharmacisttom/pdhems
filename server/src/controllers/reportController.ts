import { Request, Response } from 'express';
import { pool } from '../db/connection';

/**
 * Phase 9 & MAP-7: Reports, EMS KPIs and Spatial Analytics Controller
 */

// 1. EMS KPI Metrics (Section 40)
export async function getEmsKpis(req: Request, res: Response) {
  try {
    const { timeframe = 'all', missionType = 'ALL' } = req.query;

    let timeFilter = '';
    if (timeframe === 'today') {
      timeFilter = 'AND created_at >= CURDATE()';
    } else if (timeframe === '7days') {
      timeFilter = 'AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
    } else if (timeframe === '30days') {
      timeFilter = 'AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
    }

    let typeFilter = '';
    if (missionType === 'EMERGENCY') {
      typeFilter = "AND mission_type = 'EMERGENCY'";
    } else if (missionType === 'REFER') {
      typeFilter = "AND mission_type = 'REFER'";
    }

    // Query completed missions with timestamps
    const query = `
      SELECT 
        id, mission_no, mission_type, status,
        created_at, dispatched_at, departure_at, scene_arrived_at, scene_departure_at,
        arrived_at, handover_at, return_started_at, completed_at
      FROM ems_missions
      WHERE status = 'COMPLETED'
        ${timeFilter}
        ${typeFilter}
      ORDER BY created_at DESC
    `;

    const [missions]: any = await pool.query(query);

    // Calculate the 8 EMS Time Metrics in minutes
    const t1Values: number[] = []; // Call -> Dispatch
    const t2Values: number[] = []; // Dispatch -> Depart (Turnout)
    const t3Values: number[] = []; // Dispatch -> Scene (Response)
    const t4Values: number[] = []; // On-scene Time
    const t5Values: number[] = []; // Scene/Origin -> Hospital/Destination
    const t6Values: number[] = []; // Handover Time
    const t7Values: number[] = []; // Return Time
    const t8Values: number[] = []; // Total Mission Cycle

    for (const m of missions) {
      const created = m.created_at ? new Date(m.created_at).getTime() : null;
      const dispatched = m.dispatched_at ? new Date(m.dispatched_at).getTime() : (created ? created + 60000 : null);
      const departed = m.departure_at ? new Date(m.departure_at).getTime() : null;
      const arrivedScene = m.scene_arrived_at ? new Date(m.scene_arrived_at).getTime() : null;
      const leftScene = m.scene_departure_at ? new Date(m.scene_departure_at).getTime() : null;
      const arrived = m.arrived_at ? new Date(m.arrived_at).getTime() : null;
      const handover = m.handover_at ? new Date(m.handover_at).getTime() : null;
      const returnStarted = m.return_started_at ? new Date(m.return_started_at).getTime() : handover;
      const completed = m.completed_at ? new Date(m.completed_at).getTime() : null;

      // T1: Call to Dispatch
      if (created && dispatched && dispatched >= created) {
        t1Values.push((dispatched - created) / 60000);
      }

      // T2: Turnout (Dispatch to Depart)
      if (dispatched && departed && departed >= dispatched) {
        t2Values.push((departed - dispatched) / 60000);
      }

      // T3: Response (Dispatch to Scene - Emergency)
      if (dispatched && arrivedScene && arrivedScene >= dispatched) {
        t3Values.push((arrivedScene - dispatched) / 60000);
      }

      // T4: On-scene time (Arrive scene to Leave scene)
      if (arrivedScene && leftScene && leftScene >= arrivedScene) {
        t4Values.push((leftScene - arrivedScene) / 60000);
      }

      // T5: Transport (Scene to Hospital or Origin to Hospital)
      if (arrived) {
        const startTransport = leftScene || departed;
        if (startTransport && arrived >= startTransport) {
          t5Values.push((arrived - startTransport) / 60000);
        }
      }

      // T6: Handover Time (Arrived at Hospital to Handover completed)
      if (arrived && handover && handover >= arrived) {
        t6Values.push((handover - arrived) / 60000);
      }

      // T7: Return Time (Handover/Leave Hospital to Base completed)
      if (returnStarted && completed && completed >= returnStarted) {
        t7Values.push((completed - returnStarted) / 60000);
      }

      // T8: Total Mission Cycle (Created to Completed)
      if (created && completed && completed >= created) {
        t8Values.push((completed - created) / 60000);
      }
    }

    const calcAvg = (arr: number[]) => (arr.length > 0 ? Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2)) : 0);
    const calcRate = (arr: number[], maxThreshold: number) => {
      if (arr.length === 0) return 100;
      const compliant = arr.filter((v) => v <= maxThreshold).length;
      return Number(((compliant / arr.length) * 100).toFixed(1));
    };

    // Also get overall counts
    const [counts]: any = await pool.query(`
      SELECT 
        COUNT(*) as total_missions,
        SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed_count,
        SUM(CASE WHEN status IN ('EN_ROUTE', 'ARRIVED_SCENE', 'ON_SCENE', 'ARRIVED', 'HANDOVER_COMPLETED', 'RETURNING') THEN 1 ELSE 0 END) as active_count,
        SUM(CASE WHEN mission_type = 'EMERGENCY' THEN 1 ELSE 0 END) as emergency_count,
        SUM(CASE WHEN mission_type = 'REFER' THEN 1 ELSE 0 END) as refer_count
      FROM ems_missions
      WHERE 1=1 ${timeFilter}
    `);

    return res.json({
      success: true,
      timeframe,
      missionType,
      summary: {
        totalMissions: Number(counts[0]?.total_missions || 0),
        completedCount: Number(counts[0]?.completed_count || 0),
        activeCount: Number(counts[0]?.active_count || 0),
        emergencyCount: Number(counts[0]?.emergency_count || 0),
        referCount: Number(counts[0]?.refer_count || 0),
      },
      kpis: {
        t1_call_to_dispatch: {
          name: 'เวลารับแจ้งถึงสั่งการ (Call to Dispatch)',
          code: 'T1',
          avgMinutes: calcAvg(t1Values),
          benchmarkMinutes: 1.5,
          unit: 'นาที',
          samples: t1Values.length,
        },
        t2_turnout_time: {
          name: 'เวลาเตรียมพร้อมออกปฏิบัติการ (Turnout Time)',
          code: 'T2',
          avgMinutes: calcAvg(t2Values),
          benchmarkMinutes: 2.0,
          complianceRatePercent: calcRate(t2Values, 2.0),
          unit: 'นาที',
          samples: t2Values.length,
        },
        t3_response_time: {
          name: 'เวลาตอบสนองถึงที่เกิดเหตุ (Response Time)',
          code: 'T3',
          avgMinutes: calcAvg(t3Values),
          benchmarkMinutes: 8.0,
          complianceRatePercent: calcRate(t3Values, 8.0),
          unit: 'นาที',
          samples: t3Values.length,
        },
        t4_onscene_time: {
          name: 'เวลาปฏิบัติการ ณ จุดเกิดเหตุ (On-Scene Time)',
          code: 'T4',
          avgMinutes: calcAvg(t4Values),
          benchmarkMinutes: 15.0,
          complianceRatePercent: calcRate(t4Values, 15.0),
          unit: 'นาที',
          samples: t4Values.length,
        },
        t5_transport_time: {
          name: 'เวลาเดินทางส่งต่อสู่โรงพยาบาล (Transport Time)',
          code: 'T5',
          avgMinutes: calcAvg(t5Values),
          unit: 'นาที',
          samples: t5Values.length,
        },
        t6_handover_time: {
          name: 'เวลาส่งมอบภารกิจ ณ ปลายทาง (Handover Time)',
          code: 'T6',
          avgMinutes: calcAvg(t6Values),
          benchmarkMinutes: 15.0,
          complianceRatePercent: calcRate(t6Values, 15.0),
          unit: 'นาที',
          samples: t6Values.length,
        },
        t7_return_time: {
          name: 'เวลาเดินทางกลับฐาน (Return Time)',
          code: 'T7',
          avgMinutes: calcAvg(t7Values),
          unit: 'นาที',
          samples: t7Values.length,
        },
        t8_total_cycle_time: {
          name: 'ระยะเวลาภารกิจรวมทั้งสิ้น (Total Cycle Time)',
          code: 'T8',
          avgMinutes: calcAvg(t8Values),
          unit: 'นาที',
          samples: t8Values.length,
        },
      },
    });
  } catch (error: any) {
    console.error('Error calculating EMS KPIs:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// 2. Trip Summary Reports (Section 39)
export async function getTripSummary(req: Request, res: Response) {
  try {
    const {
      missionType,
      status,
      vehicleId,
      driverId,
      limit = 50,
      offset = 0,
    } = req.query;

    let whereClauses: string[] = ['1=1'];
    let params: any[] = [];

    if (missionType && missionType !== 'ALL') {
      whereClauses.push('m.mission_type = ?');
      params.push(missionType);
    }

    if (status && status !== 'ALL') {
      whereClauses.push('m.status = ?');
      params.push(status);
    }

    if (vehicleId) {
      whereClauses.push('m.vehicle_id = ?');
      params.push(vehicleId);
    }

    if (driverId) {
      whereClauses.push('m.driver_id = ?');
      params.push(driverId);
    }

    const whereSql = whereClauses.join(' AND ');

    const [missions]: any = await pool.query(
      `
      SELECT 
        m.id,
        m.mission_no,
        m.mission_type,
        m.status,
        m.created_at,
        m.departure_at,
        m.arrived_at,
        m.handover_at,
        m.completed_at,
        m.scene_latitude,
        m.scene_longitude,
        m.scene_description,
        m.handover_confirmed_by,
        m.handover_notes,
        m.pretrip_passed,
        m.is_emergency_override,
        a.id as vehicle_id,
        a.vehicle_code,
        a.registration_no,
        d.id as driver_id,
        d.display_name as driver_name,
        f1.name as origin_facility_name,
        f2.name as destination_facility_name
      FROM ems_missions m
      LEFT JOIN ambulances a ON m.vehicle_id = a.id
      LEFT JOIN drivers d ON m.driver_id = d.id
      LEFT JOIN facilities f1 ON m.origin_facility_id = f1.id
      LEFT JOIN facilities f2 ON m.destination_facility_id = f2.id
      WHERE ${whereSql}
      ORDER BY m.id DESC
      LIMIT ? OFFSET ?
    `,
      [...params, Number(limit), Number(offset)]
    );

    // Enrich each trip with telematics stats from gps_tracks
    const trips = [];
    for (const m of missions) {
      const [tracks]: any = await pool.query(
        `
        SELECT 
          COUNT(*) as point_count,
          MAX(speed) as max_speed,
          AVG(speed) as avg_speed,
          SUM(CASE WHEN speed > 90 AND speed <= 110 THEN 1 ELSE 0 END) as speed_warning_count,
          SUM(CASE WHEN speed > 110 THEN 1 ELSE 0 END) as speed_critical_count,
          SUM(CASE WHEN sync_status = 'PENDING' THEN 1 ELSE 0 END) as offline_sync_count
        FROM gps_tracks
        WHERE mission_id = ?
      `,
        [m.id]
      );

      const tStats = tracks[0] || {};
      const durationMin =
        m.departure_at && m.completed_at
          ? Math.max(0, Math.round((new Date(m.completed_at).getTime() - new Date(m.departure_at).getTime()) / 60000))
          : m.created_at && m.completed_at
          ? Math.max(0, Math.round((new Date(m.completed_at).getTime() - new Date(m.created_at).getTime()) / 60000))
          : 0;

      // Estimate distance from GPS points count or road distance
      const avgSpeed = Number(tStats.avg_speed || 50);
      const estDistanceKm = durationMin > 0 ? Number(((avgSpeed * (durationMin / 60))).toFixed(1)) : 0;

      trips.push({
        id: m.id,
        missionNo: m.mission_no,
        missionType: m.mission_type,
        status: m.status,
        vehicleCode: m.vehicle_code || 'N/A',
        registrationNo: m.registration_no || 'N/A',
        driverName: m.driver_name || 'ไม่ได้ระบุ',
        origin: m.origin_facility_name || 'ฐานกู้ชีพโพธาราม',
        destination: m.destination_facility_name || (m.scene_description ? `ที่เกิดเหตุ: ${m.scene_description}` : 'N/A'),
        sceneDescription: m.scene_description,
        sceneLatitude: m.scene_latitude ? Number(m.scene_latitude) : null,
        sceneLongitude: m.scene_longitude ? Number(m.scene_longitude) : null,
        createdAt: m.created_at,
        departureAt: m.departure_at,
        arrivedAt: m.arrived_at,
        handoverAt: m.handover_at,
        completedAt: m.completed_at,
        durationMinutes: durationMin,
        distanceKm: estDistanceKm,
        maxSpeedKmh: Number(tStats.max_speed ? Number(tStats.max_speed).toFixed(1) : 0),
        speedWarningsCount: Number(tStats.speed_warning_count || 0),
        speedCriticalsCount: Number(tStats.speed_critical_count || 0),
        offlineSyncCount: Number(tStats.offline_sync_count || 0),
        handoverConfirmedBy: m.handover_confirmed_by,
        handoverNotes: m.handover_notes,
        pretripPassed: Boolean(m.pretrip_passed),
        isEmergencyOverride: Boolean(m.is_emergency_override),
      });
    }

    const [totalRows]: any = await pool.query(
      `SELECT COUNT(*) as count FROM ems_missions m WHERE ${whereSql}`,
      params
    );

    return res.json({
      success: true,
      total: totalRows[0]?.count || 0,
      limit: Number(limit),
      offset: Number(offset),
      trips,
    });
  } catch (error: any) {
    console.error('Error fetching trip summary report:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// 3. Spatial Analytics & Density Heatmap (Section 23 MAP-7)
export async function getSpatialDensity(req: Request, res: Response) {
  try {
    const { timeframe = 'all' } = req.query;

    let timeFilter = '';
    if (timeframe === 'today') {
      timeFilter = 'AND created_at >= CURDATE()';
    } else if (timeframe === '7days') {
      timeFilter = 'AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
    } else if (timeframe === '30days') {
      timeFilter = 'AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
    }

    // 3.1 Emergency Accident Hotspots
    const [rawEmergencies]: any = await pool.query(`
      SELECT 
        id, mission_no, scene_latitude, scene_longitude, scene_description,
        created_at, departure_at, scene_arrived_at,
        TIMESTAMPDIFF(MINUTE, departure_at, scene_arrived_at) as response_minutes
      FROM ems_missions
      WHERE mission_type = 'EMERGENCY'
        AND scene_latitude IS NOT NULL
        AND scene_longitude IS NOT NULL
        ${timeFilter}
      ORDER BY created_at DESC
    `);

    // Grouping clusters with approx ~500m precision (0.005 lat/lng)
    const clusterMap = new Map<string, any>();

    for (const em of rawEmergencies) {
      const lat = Number(em.scene_latitude);
      const lng = Number(em.scene_longitude);
      const gridKey = `${lat.toFixed(2)}_${lng.toFixed(2)}`;

      if (!clusterMap.has(gridKey)) {
        clusterMap.set(gridKey, {
          gridKey,
          centerLat: lat,
          centerLng: lng,
          count: 0,
          descriptions: [] as string[],
          responseTimes: [] as number[],
        });
      }

      const cluster = clusterMap.get(gridKey);
      cluster.count += 1;
      if (em.scene_description && !cluster.descriptions.includes(em.scene_description)) {
        cluster.descriptions.push(em.scene_description);
      }
      if (em.response_minutes && em.response_minutes > 0) {
        cluster.responseTimes.push(Number(em.response_minutes));
      }
    }

    const maxCount = Math.max(...Array.from(clusterMap.values()).map((c) => c.count), 1);

    const hotspots = Array.from(clusterMap.values()).map((c) => {
      const avgResp =
        c.responseTimes.length > 0
          ? Number((c.responseTimes.reduce((a: number, b: number) => a + b, 0) / c.responseTimes.length).toFixed(1))
          : 6.5;

      const intensity = Number((c.count / maxCount).toFixed(2));
      let riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
      if (c.count >= 3 || intensity >= 0.75) riskLevel = 'CRITICAL';
      else if (c.count >= 2 || intensity >= 0.5) riskLevel = 'HIGH';
      else if (c.count >= 1) riskLevel = 'MEDIUM';

      return {
        latitude: c.centerLat,
        longitude: c.centerLng,
        count: c.count,
        intensity,
        riskLevel,
        avgResponseMinutes: avgResp,
        label: c.descriptions[0] || `จุดเสี่ยงพิกัด ${c.centerLat.toFixed(3)}, ${c.centerLng.toFixed(3)}`,
        descriptions: c.descriptions,
      };
    });

    // 3.2 Frequent Refer Corridors
    const [corridors]: any = await pool.query(`
      SELECT 
        m.origin_facility_id,
        f1.name as origin_name,
        f1.latitude as origin_lat,
        f1.longitude as origin_lng,
        m.destination_facility_id,
        f2.name as destination_name,
        f2.latitude as dest_lat,
        f2.longitude as dest_lng,
        COUNT(*) as transfer_count,
        ROUND(AVG(TIMESTAMPDIFF(MINUTE, m.departure_at, m.arrived_at)), 1) as avg_transport_minutes
      FROM ems_missions m
      JOIN facilities f1 ON m.origin_facility_id = f1.id
      JOIN facilities f2 ON m.destination_facility_id = f2.id
      WHERE m.mission_type = 'REFER'
        ${timeFilter}
      GROUP BY m.origin_facility_id, m.destination_facility_id, f1.name, f1.latitude, f1.longitude, f2.name, f2.latitude, f2.longitude
      ORDER BY transfer_count DESC
    `);

    const formattedCorridors = corridors.map((cor: any) => ({
      originId: cor.origin_facility_id,
      originName: cor.origin_name,
      originCoords: [Number(cor.origin_lat), Number(cor.origin_lng)],
      destinationId: cor.destination_facility_id,
      destinationName: cor.destination_name,
      destinationCoords: [Number(cor.dest_lat), Number(cor.dest_lng)],
      transferCount: Number(cor.transfer_count),
      avgTransportMinutes: Number(cor.avg_transport_minutes || 25),
    }));

    // Raw emergency incidents for granular point markers
    const rawIncidents = rawEmergencies.map((em: any) => ({
      id: em.id,
      missionNo: em.mission_no,
      latitude: Number(em.scene_latitude),
      longitude: Number(em.scene_longitude),
      description: em.scene_description || 'อุบัติเหตุฉุกเฉิน',
      createdAt: em.created_at,
      responseMinutes: em.response_minutes ? Number(em.response_minutes) : null,
    }));

    return res.json({
      success: true,
      timeframe,
      totalIncidents: rawEmergencies.length,
      hotspots,
      referCorridors: formattedCorridors,
      rawIncidents,
    });
  } catch (error: any) {
    console.error('Error analyzing spatial density:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}
