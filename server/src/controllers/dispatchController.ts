import { Request, Response } from 'express';
import { pool } from '../db/connection';
import { SimpleEstimateRoutingProvider } from '../adapters/routing/IRoutingProvider';
import { logAudit } from '../utils/auditLogger';

const routingProvider = new SimpleEstimateRoutingProvider();

export const dispatchController = {
  /**
   * MAP-5: Find Nearest Available Ambulances
   * Considers: Status, GPS Freshness, GPS Quality, Straight-line distance, Road factor (1.35x), Estimated Travel Time
   */
  async findNearestAmbulances(req: Request, res: Response): Promise<void> {
    try {
      const { latitude, longitude, urgency = 'EMERGENCY' } = req.body;

      if (!latitude || !longitude) {
        res.status(400).json({ success: false, message: 'Latitude and Longitude are required' });
        return;
      }

      const targetLat = Number(latitude);
      const targetLng = Number(longitude);

      // Query active vehicles with valid coordinates
      const [vehicles]: any = await pool.query(`
        SELECT 
          id, vehicle_code, registration_no, vehicle_type, brand, model,
          status, current_latitude, current_longitude, current_speed, current_heading,
          last_gps_at, gps_quality,
          TIMESTAMPDIFF(SECOND, last_gps_at, NOW()) AS seconds_since_last_gps
        FROM ambulances
        WHERE active = 1 AND current_latitude IS NOT NULL AND current_longitude IS NOT NULL
      `);

      const candidates = [];

      for (const v of vehicles) {
        const vLat = Number(v.current_latitude);
        const vLng = Number(v.current_longitude);
        const secSinceGps = v.seconds_since_last_gps ?? 999999;

        // Freshness assessment
        let freshness: 'FRESH' | 'DELAYED' | 'LOST' = 'FRESH';
        if (secSinceGps > 300) freshness = 'LOST';
        else if (secSinceGps > 120) freshness = 'DELAYED';

        // Calculate suggested route and estimated road distance
        const route = await routingProvider.calculateSuggestedRoute(
          { latitude: vLat, longitude: vLng },
          { latitude: targetLat, longitude: targetLng }
        );

        // Straight-line distance
        const R = 6371;
        const dLat = (targetLat - vLat) * (Math.PI / 180);
        const dLon = (targetLng - vLng) * (Math.PI / 180);
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(vLat * (Math.PI / 180)) * Math.cos(targetLat * (Math.PI / 180));
        const straightLineKm = Number((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2));

        // Eligibility & Scoring
        let isEligible = true;
        let suitabilityScore = 100; // Base score

        // 1. Status factor
        if (v.status === 'AVAILABLE') {
          suitabilityScore += 20;
        } else if (v.status === 'RETURNING') {
          suitabilityScore += 5; // Returning can potentially be diverted in critical emergency
        } else {
          isEligible = false; // Assigned, En route, At scene, Maintenance, Out of service
          suitabilityScore -= 50;
        }

        // 2. Distance penalty (every km deducts score)
        suitabilityScore -= route.distanceKm * 2.5;

        // 3. Freshness penalty
        if (freshness === 'DELAYED') suitabilityScore -= 15;
        if (freshness === 'LOST') {
          suitabilityScore -= 40;
          isEligible = false;
        }

        // 4. GPS Quality penalty
        if (v.gps_quality === 'POOR') suitabilityScore -= 10;
        if (v.gps_quality === 'INVALID') isEligible = false;

        candidates.push({
          vehicle_id: v.id,
          vehicle_code: v.vehicle_code,
          registration_no: v.registration_no,
          vehicle_type: v.vehicle_type,
          current_status: v.status,
          current_coordinates: { latitude: vLat, longitude: vLng },
          straight_line_distance_km: straightLineKm,
          estimated_road_distance_km: route.distanceKm,
          estimated_travel_minutes: route.estimatedDurationMinutes,
          gps_freshness: freshness,
          seconds_since_last_gps: secSinceGps,
          gps_quality: v.gps_quality,
          suitability_score: Math.max(0, Math.round(suitabilityScore)),
          is_eligible: isEligible,
          reason: !isEligible
            ? v.status !== 'AVAILABLE'
              ? `รถไม่ว่าง (สถานะ: ${v.status})`
              : 'สัญญาณ GPS ขาดหายเกินเกณฑ์ความปลอดภัย'
            : 'พร้อมปฏิบัติภารกิจ',
        });
      }

      // Sort by suitability score descending
      candidates.sort((a, b) => b.suitability_score - a.suitability_score);

      res.json({
        success: true,
        target_scene: { latitude: targetLat, longitude: targetLng },
        ranking_policy: 'Road factor 1.35x + GPS freshness + Vehicle availability',
        disclaimer: 'ผลลัพธ์เป็นคำแนะนำเบื้องต้น (Candidate Recommendation) ผู้สั่งการ (Dispatcher) ต้องเป็นผู้ยืนยันขั้นสุดท้าย',
        candidates,
      });
    } catch (error: any) {
      console.error('findNearestAmbulances error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * MAP-5 & Phase 7: Quick Dispatch for Emergency EMS
   * Minimal form: quick dispatch with 1-click candidate selection
   */
  async quickDispatch(req: Request, res: Response): Promise<void> {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const { sceneLatitude, sceneLongitude, sceneDescription, vehicleId, driverId, urgency = 'CRITICAL' } = req.body;
      const user = (req as any).user;

      if (!sceneLatitude || !sceneLongitude || !vehicleId) {
        res.status(400).json({
          success: false,
          message: 'Scene coordinates and assigned vehicle are required for emergency dispatch',
        });
        return;
      }

      // Generate emergency mission number
      const year = new Date().getFullYear();
      const [rows]: any = await conn.query(
        "SELECT COUNT(*) as count FROM ems_missions WHERE mission_no LIKE 'EMS-%'"
      );
      const missionNo = `EMS-${year}-${String((rows[0]?.count || 0) + 1).padStart(6, '0')}`;

      // Insert Emergency mission
      const [result]: any = await conn.query(
        `INSERT INTO ems_missions 
          (mission_no, mission_type, status, vehicle_id, driver_id, scene_latitude, scene_longitude, scene_description, departure_at, created_by)
         VALUES (?, 'EMERGENCY', 'EN_ROUTE', ?, ?, ?, ?, ?, NOW(), ?)`,
        [
          missionNo,
          vehicleId,
          driverId || null,
          Number(sceneLatitude),
          Number(sceneLongitude),
          sceneDescription || 'เหตุฉุกเฉินรับแจ้งด่วน (Quick Dispatch)',
          user?.id || null,
        ]
      );

      const missionId = result.insertId;

      // Update vehicle status
      await conn.query("UPDATE ambulances SET status = 'EN_ROUTE' WHERE id = ?", [vehicleId]);

      // If driver is provided, set on mission
      if (driverId) {
        await conn.query("UPDATE drivers SET employment_status = 'ON_MISSION' WHERE id = ?", [driverId]);
      }

      // Log status transition
      await conn.query(
        `INSERT INTO mission_status_logs (mission_id, status, note, logged_by)
         VALUES (?, 'EN_ROUTE', 'Emergency Quick Dispatched immediately', ?)`,
        [missionId, user?.id || null]
      );

      await conn.commit();

      await logAudit({
        userId: user?.id,
        userName: user?.fullName,
        action: 'EMERGENCY_QUICK_DISPATCH',
        entity: 'ems_missions',
        entityId: String(missionId),
        details: { missionNo, vehicleId, urgency },
        req,
      });

      res.status(201).json({
        success: true,
        message: 'Emergency Quick Dispatch completed. Ambulance en route to scene.',
        data: {
          missionId,
          missionNo,
          status: 'EN_ROUTE',
          vehicleId,
        },
      });
    } catch (error: any) {
      await conn.rollback();
      console.error('quickDispatch error:', error);
      res.status(500).json({ success: false, message: error.message });
    } finally {
      conn.release();
    }
  },
};
