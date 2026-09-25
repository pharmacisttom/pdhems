import { Request, Response } from 'express';
import { pool } from '../db/connection';
import { logAudit } from '../utils/auditLogger';

// Helper to generate sequential formatted mission number
async function generateMissionNumber(type: 'REFER' | 'EMERGENCY' = 'REFER'): Promise<string> {
  const prefix = type === 'REFER' ? 'REF' : 'EMS';
  const year = new Date().getFullYear();
  const [rows]: any = await pool.query(
    'SELECT COUNT(*) as count FROM ems_missions WHERE mission_no LIKE ?',
    [`${prefix}-${year}-%`]
  );
  const nextSeq = (rows[0]?.count || 0) + 1;
  return `${prefix}-${year}-${String(nextSeq).padStart(6, '0')}`;
}

export const missionController = {
  // 1. List Missions with filters
  async listMissions(req: Request, res: Response): Promise<void> {
    try {
      const { status, type, limit = 50 } = req.query;
      let query = `
        SELECT 
          m.*,
          v.vehicle_code,
          v.registration_no,
          v.status as vehicle_current_status,
          d.display_name as driver_name,
          d.phone_optional as driver_phone,
          f_orig.name as origin_facility_name,
          f_dest.name as destination_facility_name
        FROM ems_missions m
        LEFT JOIN ambulances v ON m.vehicle_id = v.id
        LEFT JOIN drivers d ON m.driver_id = d.id
        LEFT JOIN facilities f_orig ON m.origin_facility_id = f_orig.id
        LEFT JOIN facilities f_dest ON m.destination_facility_id = f_dest.id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (status) {
        query += ' AND m.status = ?';
        params.push(status);
      }
      if (type) {
        query += ' AND m.mission_type = ?';
        params.push(type);
      }

      query += ' ORDER BY m.created_at DESC LIMIT ?';
      params.push(Number(limit));

      const [missions]: any = await pool.query(query, params);
      res.json({ success: true, count: missions.length, data: missions });
    } catch (error: any) {
      console.error('listMissions error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // 2. Get Single Mission Detail (with crew, checklist, logs)
  async getMission(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const [missions]: any = await pool.query(
        `SELECT 
          m.*,
          v.vehicle_code, v.registration_no, v.brand, v.model, v.current_speed, v.current_latitude, v.current_longitude,
          d.display_name as driver_name, d.phone_optional as driver_phone, d.driver_license_no_optional,
          f_orig.name as origin_facility_name, f_orig.latitude as origin_lat, f_orig.longitude as origin_lng,
          f_dest.name as destination_facility_name, f_dest.latitude as dest_lat, f_dest.longitude as dest_lng
        FROM ems_missions m
        LEFT JOIN ambulances v ON m.vehicle_id = v.id
        LEFT JOIN drivers d ON m.driver_id = d.id
        LEFT JOIN facilities f_orig ON m.origin_facility_id = f_orig.id
        LEFT JOIN facilities f_dest ON m.destination_facility_id = f_dest.id
        WHERE m.id = ?`,
        [id]
      );

      if (!missions.length) {
        res.status(404).json({ success: false, message: 'Mission not found' });
        return;
      }

      const mission = missions[0];

      // Fetch crew
      const [crew]: any = await pool.query(
        `SELECT mc.*, es.display_name, es.position, es.profession, es.phone_optional
         FROM mission_crew mc
         JOIN ems_staff es ON mc.staff_id = es.id
         WHERE mc.mission_id = ?`,
        [id]
      );

      // Fetch checklist
      const [checklists]: any = await pool.query(
        `SELECT * FROM pretrip_checklists WHERE mission_id = ? ORDER BY created_at DESC LIMIT 1`,
        [id]
      );

      // Fetch status logs
      const [statusLogs]: any = await pool.query(
        `SELECT msl.*, u.full_name as logged_by_name
         FROM mission_status_logs msl
         LEFT JOIN users u ON msl.logged_by = u.id
         WHERE msl.mission_id = ? ORDER BY msl.created_at ASC`,
        [id]
      );

      res.json({
        success: true,
        data: {
          ...mission,
          crew,
          pretrip_checklist: checklists[0] || null,
          status_logs: statusLogs,
        },
      });
    } catch (error: any) {
      console.error('getMission error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // 3. Create Refer Mission
  async createReferMission(req: Request, res: Response): Promise<void> {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const { originFacilityId, destinationFacilityId, notes } = req.body;
      const user = (req as any).user;

      if (!originFacilityId || !destinationFacilityId) {
        res.status(400).json({ success: false, message: 'Origin and Destination facilities are required' });
        return;
      }

      const missionNo = await generateMissionNumber('REFER');

      const [result]: any = await conn.query(
        `INSERT INTO ems_missions 
          (mission_no, mission_type, status, origin_facility_id, destination_facility_id, created_by)
         VALUES (?, 'REFER', 'CREATED', ?, ?, ?)`,
        [missionNo, originFacilityId, destinationFacilityId, user?.id || null]
      );

      const missionId = result.insertId;

      // Status Log
      await conn.query(
        `INSERT INTO mission_status_logs (mission_id, status, note, logged_by)
         VALUES (?, 'CREATED', ?, ?)`,
        [missionId, notes || 'Refer mission created', user?.id || null]
      );

      await conn.commit();

      await logAudit({
        userId: user?.id,
        userName: user?.fullName,
        action: 'CREATE_REFER_MISSION',
        entity: 'ems_missions',
        entityId: String(missionId),
        details: { missionNo, originFacilityId, destinationFacilityId },
        req,
      });

      res.status(201).json({
        success: true,
        message: 'Refer mission created successfully',
        data: { id: missionId, missionNo, status: 'CREATED' },
      });
    } catch (error: any) {
      await conn.rollback();
      console.error('createReferMission error:', error);
      res.status(500).json({ success: false, message: error.message });
    } finally {
      conn.release();
    }
  },

  // 4. Assign Vehicle, Driver & Crew (with Conflict Checks - Section 5)
  async assignMission(req: Request, res: Response): Promise<void> {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const { id } = req.params;
      const { vehicleId, driverId, crew } = req.body; // crew: [{ staffId, role, isTeamLeader }]
      const user = (req as any).user;

      // Check mission state
      const [missions]: any = await conn.query(
        'SELECT * FROM ems_missions WHERE id = ? FOR UPDATE',
        [id]
      );
      if (!missions.length) {
        res.status(404).json({ success: false, message: 'Mission not found' });
        return;
      }
      const mission = missions[0];
      if (['COMPLETED', 'CANCELLED'].includes(mission.status)) {
        res.status(400).json({ success: false, message: `Cannot reassign mission with status ${mission.status}` });
        return;
      }

      // Conflict Check 1: Vehicle Availability
      if (vehicleId) {
        const [vehicles]: any = await conn.query(
          'SELECT * FROM ambulances WHERE id = ? FOR UPDATE',
          [vehicleId]
        );
        if (!vehicles.length) {
          res.status(400).json({ success: false, message: 'Selected vehicle does not exist' });
          return;
        }
        const v = vehicles[0];
        if (!v.active) {
          res.status(400).json({ success: false, message: `Vehicle ${v.vehicle_code} is inactive` });
          return;
        }
        if (['MAINTENANCE', 'OUT_OF_SERVICE'].includes(v.status)) {
          res.status(400).json({ success: false, message: `Vehicle ${v.vehicle_code} is currently ${v.status}` });
          return;
        }
        // If vehicle is in another active mission
        const [vehMissions]: any = await conn.query(
          `SELECT id, mission_no FROM ems_missions 
           WHERE vehicle_id = ? AND id != ? AND status NOT IN ('COMPLETED', 'CANCELLED')`,
          [vehicleId, id]
        );
        if (vehMissions.length > 0) {
          res.status(409).json({
            success: false,
            message: `Conflict: Vehicle ${v.vehicle_code} is already assigned to active mission ${vehMissions[0].mission_no}`,
          });
          return;
        }
      }

      // Conflict Check 2: Driver Availability
      if (driverId) {
        const [drivers]: any = await conn.query(
          'SELECT * FROM drivers WHERE id = ? FOR UPDATE',
          [driverId]
        );
        if (!drivers.length) {
          res.status(400).json({ success: false, message: 'Selected driver does not exist' });
          return;
        }
        const d = drivers[0];
        if (!d.active) {
          res.status(400).json({ success: false, message: `Driver ${d.display_name} is inactive` });
          return;
        }
        if (['OFF_DUTY', 'LEAVE', 'SUSPENDED'].includes(d.employment_status)) {
          res.status(400).json({ success: false, message: `Driver ${d.display_name} is ${d.employment_status}` });
          return;
        }
        // If driver is on another active mission
        const [driverMissions]: any = await conn.query(
          `SELECT id, mission_no FROM ems_missions 
           WHERE driver_id = ? AND id != ? AND status NOT IN ('COMPLETED', 'CANCELLED')`,
          [driverId, id]
        );
        if (driverMissions.length > 0) {
          res.status(409).json({
            success: false,
            message: `Conflict: Driver ${d.display_name} is already assigned to active mission ${driverMissions[0].mission_no}`,
          });
          return;
        }
      }

      // Conflict Check 3: Crew Member Availability
      if (Array.isArray(crew) && crew.length > 0) {
        for (const member of crew) {
          const [staffRows]: any = await conn.query(
            'SELECT * FROM ems_staff WHERE id = ?',
            [member.staffId]
          );
          if (!staffRows.length || !staffRows[0].active) {
            res.status(400).json({
              success: false,
              message: `Staff member ID ${member.staffId} does not exist or is inactive`,
            });
            return;
          }

          // Check if staff is already on another active mission
          const [activeCrewRows]: any = await conn.query(
            `SELECT m.id, m.mission_no 
             FROM mission_crew mc
             JOIN ems_missions m ON mc.mission_id = m.id
             WHERE mc.staff_id = ? AND m.id != ? AND m.status NOT IN ('COMPLETED', 'CANCELLED')`,
            [member.staffId, id]
          );
          if (activeCrewRows.length > 0) {
            res.status(409).json({
              success: false,
              message: `Conflict: Staff ${staffRows[0].display_name} is already assigned to active mission ${activeCrewRows[0].mission_no}`,
            });
            return;
          }
        }
      }

      // Update Mission
      await conn.query(
        `UPDATE ems_missions 
         SET vehicle_id = ?, driver_id = ?, status = 'ASSIGNED', updated_at = NOW()
         WHERE id = ?`,
        [vehicleId || null, driverId || null, id]
      );

      // Update Vehicle status
      if (vehicleId) {
        await conn.query(
          `UPDATE ambulances SET status = 'ASSIGNED' WHERE id = ?`,
          [vehicleId]
        );
      }

      // Update Driver status
      if (driverId) {
        await conn.query(
          `UPDATE drivers SET employment_status = 'ON_MISSION' WHERE id = ?`,
          [driverId]
        );
      }

      // Re-insert Crew
      if (Array.isArray(crew) && crew.length > 0) {
        await conn.query('DELETE FROM mission_crew WHERE mission_id = ?', [id]);
        for (const member of crew) {
          await conn.query(
            `INSERT INTO mission_crew (mission_id, staff_id, crew_role, is_team_leader, assigned_by)
             VALUES (?, ?, ?, ?, ?)`,
            [
              id,
              member.staffId,
              member.role || 'EMT',
              member.isTeamLeader ? 1 : 0,
              user?.id || null,
            ]
          );
        }
      }

      // Status Log
      await conn.query(
        `INSERT INTO mission_status_logs (mission_id, status, note, logged_by)
         VALUES (?, 'ASSIGNED', 'Assigned vehicle, driver, and crew', ?)`,
        [id, user?.id || null]
      );

      await conn.commit();

      await logAudit({
        userId: user?.id,
        userName: user?.fullName,
        action: 'ASSIGN_MISSION',
        entity: 'ems_missions',
        entityId: String(id),
        details: { vehicleId, driverId, crewCount: crew?.length || 0 },
        req,
      });

      res.json({
        success: true,
        message: 'Mission assigned successfully with all conflict checks passed',
      });
    } catch (error: any) {
      await conn.rollback();
      console.error('assignMission error:', error);
      res.status(500).json({ success: false, message: error.message });
    } finally {
      conn.release();
    }
  },

  // 5. Driver / Crew Confirm Readiness
  async confirmReadiness(req: Request, res: Response): Promise<void> {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const { id } = req.params;
      const { confirmedBy } = req.body; // 'DRIVER' or 'CREW'
      const user = (req as any).user;

      const [missions]: any = await conn.query(
        'SELECT * FROM ems_missions WHERE id = ? FOR UPDATE',
        [id]
      );
      if (!missions.length) {
        res.status(404).json({ success: false, message: 'Mission not found' });
        return;
      }
      const mission = missions[0];

      if (confirmedBy === 'DRIVER') {
        await conn.query(
          'UPDATE ems_missions SET driver_confirmed_at = NOW() WHERE id = ?',
          [id]
        );
      } else {
        await conn.query(
          'UPDATE ems_missions SET crew_confirmed_at = NOW() WHERE id = ?',
          [id]
        );
      }

      // Check if both driver and crew are confirmed
      const [updated]: any = await conn.query(
        'SELECT driver_confirmed_at, crew_confirmed_at, pretrip_passed FROM ems_missions WHERE id = ?',
        [id]
      );
      const isBothConfirmed = updated[0].driver_confirmed_at && updated[0].crew_confirmed_at;
      const isReady = isBothConfirmed && updated[0].pretrip_passed;

      let newStatus = mission.status;
      if (isReady) {
        newStatus = 'READY';
      } else if (isBothConfirmed) {
        newStatus = 'CREW_CONFIRMED';
      }

      if (newStatus !== mission.status) {
        await conn.query('UPDATE ems_missions SET status = ? WHERE id = ?', [newStatus, id]);
        await conn.query(
          'INSERT INTO mission_status_logs (mission_id, status, note, logged_by) VALUES (?, ?, ?, ?)',
          [id, newStatus, `Readiness confirmed by ${confirmedBy}`, user?.id || null]
        );
      }

      await conn.commit();

      res.json({
        success: true,
        message: `${confirmedBy} readiness confirmed`,
        data: { newStatus },
      });
    } catch (error: any) {
      await conn.rollback();
      console.error('confirmReadiness error:', error);
      res.status(500).json({ success: false, message: error.message });
    } finally {
      conn.release();
    }
  },

  // 6. Pre-Trip Vehicle Checklist (Section 5)
  async submitPretripChecklist(req: Request, res: Response): Promise<void> {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const { id } = req.params;
      const {
        fuelLevel = 'FULL',
        oxygenLevelPsi = 2000,
        medicalEquipmentReady = true,
        lightsSirenWorking = true,
        tiresBrakesChecked = true,
        communicationDeviceReady = true,
        dashcamGpsReady = true,
        notes = '',
      } = req.body;
      const user = (req as any).user;

      const [missions]: any = await conn.query(
        'SELECT * FROM ems_missions WHERE id = ? FOR UPDATE',
        [id]
      );
      if (!missions.length) {
        res.status(404).json({ success: false, message: 'Mission not found' });
        return;
      }
      const mission = missions[0];

      if (!mission.vehicle_id) {
        res.status(400).json({ success: false, message: 'Cannot submit checklist without assigned vehicle' });
        return;
      }

      const isPassed =
        medicalEquipmentReady &&
        lightsSirenWorking &&
        tiresBrakesChecked &&
        communicationDeviceReady &&
        dashcamGpsReady &&
        fuelLevel !== 'LOW' &&
        oxygenLevelPsi >= 500;

      await conn.query(
        `INSERT INTO pretrip_checklists 
          (mission_id, vehicle_id, inspector_id, fuel_level, oxygen_level_psi, medical_equipment_ready, lights_siren_working, tires_brakes_checked, communication_device_ready, dashcam_gps_ready, notes, is_passed)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          mission.vehicle_id,
          user?.id || 1,
          fuelLevel,
          oxygenLevelPsi,
          medicalEquipmentReady ? 1 : 0,
          lightsSirenWorking ? 1 : 0,
          tiresBrakesChecked ? 1 : 0,
          communicationDeviceReady ? 1 : 0,
          dashcamGpsReady ? 1 : 0,
          notes,
          isPassed ? 1 : 0,
        ]
      );

      // Update mission checklist status
      await conn.query(
        'UPDATE ems_missions SET pretrip_passed = ? WHERE id = ?',
        [isPassed ? 1 : 0, id]
      );

      // Check if mission is now READY
      if (isPassed && mission.driver_confirmed_at && mission.crew_confirmed_at) {
        await conn.query("UPDATE ems_missions SET status = 'READY' WHERE id = ?", [id]);
        await conn.query(
          "INSERT INTO mission_status_logs (mission_id, status, note, logged_by) VALUES (?, 'READY', 'Vehicle and crew verified ready for departure', ?)",
          [id, user?.id || null]
        );
      }

      await conn.commit();

      res.status(201).json({
        success: true,
        message: isPassed
          ? 'Pre-trip checklist PASSED'
          : 'Pre-trip checklist FAILED due to critical equipment/readiness deficiency',
        isPassed,
      });
    } catch (error: any) {
      await conn.rollback();
      console.error('submitPretripChecklist error:', error);
      res.status(500).json({ success: false, message: error.message });
    } finally {
      conn.release();
    }
  },

  // 7. Depart Mission with Policy & Emergency Override (Section 5 & 6)
  async departMission(req: Request, res: Response): Promise<void> {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const { id } = req.params;
      const { isEmergencyOverride = false, overrideReason = '' } = req.body;
      const user = (req as any).user;

      const [missions]: any = await conn.query(
        'SELECT * FROM ems_missions WHERE id = ? FOR UPDATE',
        [id]
      );
      if (!missions.length) {
        res.status(404).json({ success: false, message: 'Mission not found' });
        return;
      }
      const mission = missions[0];

      // Double-click / State idempotency check
      if (['DEPARTED', 'EN_ROUTE', 'ARRIVED', 'HANDOVER_COMPLETED', 'RETURNING', 'COMPLETED'].includes(mission.status)) {
        res.status(400).json({
          success: false,
          message: `Mission has already departed (Current status: ${mission.status})`,
        });
        return;
      }

      // Check readiness prerequisites
      const isNormalReady = mission.pretrip_passed && mission.driver_confirmed_at && mission.crew_confirmed_at;

      if (!isNormalReady) {
        if (!isEmergencyOverride) {
          const missing: string[] = [];
          if (!mission.pretrip_passed) missing.push('Pre-trip inspection passed');
          if (!mission.driver_confirmed_at) missing.push('Driver confirmation');
          if (!mission.crew_confirmed_at) missing.push('Crew confirmation');

          res.status(403).json({
            success: false,
            message: `Normal departure blocked by safety policy. Missing requirements: ${missing.join(', ')}. Use Emergency Override if critical.`,
            missingRequirements: missing,
          });
          return;
        }

        // Emergency Override requires reason
        if (!overrideReason || overrideReason.trim().length < 5) {
          res.status(400).json({
            success: false,
            message: 'Emergency override requires a valid documented reason (minimum 5 characters)',
          });
          return;
        }

        // Mark override columns
        await conn.query(
          `UPDATE ems_missions 
           SET is_emergency_override = 1, override_reason = ?, override_by_user_id = ?, override_at = NOW()
           WHERE id = ?`,
          [overrideReason, user?.id || null, id]
        );

        await logAudit({
          userId: user?.id,
          userName: user?.fullName,
          action: 'EMERGENCY_DEPARTURE_OVERRIDE',
          entity: 'ems_missions',
          entityId: String(id),
          details: { reason: overrideReason, unfulfilledPolicy: true },
          req,
        });
      }

      // Transition to EN_ROUTE
      await conn.query(
        `UPDATE ems_missions 
         SET status = 'EN_ROUTE', departure_at = NOW(), updated_at = NOW()
         WHERE id = ?`,
        [id]
      );

      if (mission.vehicle_id) {
        await conn.query(
          "UPDATE ambulances SET status = 'EN_ROUTE' WHERE id = ?",
          [mission.vehicle_id]
        );
      }

      await conn.query(
        `INSERT INTO mission_status_logs (mission_id, status, note, logged_by)
         VALUES (?, 'EN_ROUTE', ?, ?)`,
        [
          id,
          isEmergencyOverride ? `Departed via EMERGENCY OVERRIDE: ${overrideReason}` : 'Departed normally',
          user?.id || null,
        ]
      );

      await conn.commit();

      res.json({
        success: true,
        message: 'Mission departed and en route',
        status: 'EN_ROUTE',
      });
    } catch (error: any) {
      await conn.rollback();
      console.error('departMission error:', error);
      res.status(500).json({ success: false, message: error.message });
    } finally {
      conn.release();
    }
  },

  // 8. Arrived at Destination (Section 6)
  async markArrived(req: Request, res: Response): Promise<void> {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const { id } = req.params;
      const user = (req as any).user;

      const [missions]: any = await conn.query(
        'SELECT * FROM ems_missions WHERE id = ? FOR UPDATE',
        [id]
      );
      if (!missions.length) {
        res.status(404).json({ success: false, message: 'Mission not found' });
        return;
      }
      const mission = missions[0];

      if (mission.status === 'ARRIVED') {
        res.json({ success: true, message: 'Already marked as arrived' });
        return;
      }

      await conn.query(
        `UPDATE ems_missions 
         SET status = 'ARRIVED', arrived_at = NOW(), updated_at = NOW()
         WHERE id = ?`,
        [id]
      );

      if (mission.vehicle_id) {
        await conn.query(
          "UPDATE ambulances SET status = 'AT_DESTINATION' WHERE id = ?",
          [mission.vehicle_id]
        );
      }

      await conn.query(
        `INSERT INTO mission_status_logs (mission_id, status, note, logged_by)
         VALUES (?, 'ARRIVED', 'Ambulance arrived at destination facility', ?)`,
        [id, user?.id || null]
      );

      await conn.commit();

      res.json({ success: true, message: 'Arrived at destination', status: 'ARRIVED' });
    } catch (error: any) {
      await conn.rollback();
      console.error('markArrived error:', error);
      res.status(500).json({ success: false, message: error.message });
    } finally {
      conn.release();
    }
  },

  // 9. Confirm Handover (Section 12: HANDOVER AUDIT - Human Confirmation Required)
  async confirmHandover(req: Request, res: Response): Promise<void> {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const { id } = req.params;
      const { receiverName, notes = '' } = req.body;
      const user = (req as any).user;

      if (!receiverName || receiverName.trim().length === 0) {
        res.status(400).json({
          success: false,
          message: 'Human handover confirmation requires destination receiver staff name',
        });
        return;
      }

      const [missions]: any = await conn.query(
        'SELECT * FROM ems_missions WHERE id = ? FOR UPDATE',
        [id]
      );
      if (!missions.length) {
        res.status(404).json({ success: false, message: 'Mission not found' });
        return;
      }
      const mission = missions[0];

      if (mission.status === 'HANDOVER_COMPLETED') {
        res.json({ success: true, message: 'Handover already completed' });
        return;
      }

      await conn.query(
        `UPDATE ems_missions 
         SET status = 'HANDOVER_COMPLETED', handover_at = NOW(), handover_confirmed_by = ?, handover_notes = ?, updated_at = NOW()
         WHERE id = ?`,
        [receiverName, notes, id]
      );

      await conn.query(
        `INSERT INTO mission_status_logs (mission_id, status, note, logged_by)
         VALUES (?, 'HANDOVER_COMPLETED', ?, ?)`,
        [id, `Handover confirmed with ${receiverName}. Notes: ${notes}`, user?.id || null]
      );

      await conn.commit();

      await logAudit({
        userId: user?.id,
        userName: user?.fullName,
        action: 'CONFIRM_HANDOVER',
        entity: 'ems_missions',
        entityId: String(id),
        details: { receiverName, notes },
        req,
      });

      res.json({
        success: true,
        message: 'Handover completed and verified by human confirmation',
        status: 'HANDOVER_COMPLETED',
      });
    } catch (error: any) {
      await conn.rollback();
      console.error('confirmHandover error:', error);
      res.status(500).json({ success: false, message: error.message });
    } finally {
      conn.release();
    }
  },

  // 10. Start Return Trip (Section 13: RETURN TRIP AUDIT)
  async startReturnTrip(req: Request, res: Response): Promise<void> {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const { id } = req.params;
      const user = (req as any).user;

      const [missions]: any = await conn.query(
        'SELECT * FROM ems_missions WHERE id = ? FOR UPDATE',
        [id]
      );
      if (!missions.length) {
        res.status(404).json({ success: false, message: 'Mission not found' });
        return;
      }
      const mission = missions[0];

      if (mission.status !== 'HANDOVER_COMPLETED') {
        res.status(400).json({
          success: false,
          message: `Cannot start return trip before handover is completed (Current status: ${mission.status})`,
        });
        return;
      }

      await conn.query(
        `UPDATE ems_missions 
         SET status = 'RETURNING', return_started_at = NOW(), updated_at = NOW()
         WHERE id = ?`,
        [id]
      );

      if (mission.vehicle_id) {
        await conn.query(
          "UPDATE ambulances SET status = 'RETURNING' WHERE id = ?",
          [mission.vehicle_id]
        );
      }

      await conn.query(
        `INSERT INTO mission_status_logs (mission_id, status, note, logged_by)
         VALUES (?, 'RETURNING', 'Ambulance departed destination returning to base', ?)`,
        [id, user?.id || null]
      );

      await conn.commit();

      res.json({
        success: true,
        message: 'Return trip started. Telematics tracking remains active.',
        status: 'RETURNING',
      });
    } catch (error: any) {
      await conn.rollback();
      console.error('startReturnTrip error:', error);
      res.status(500).json({ success: false, message: error.message });
    } finally {
      conn.release();
    }
  },

  // 11. Complete Mission at Base (Section 13)
  async completeMission(req: Request, res: Response): Promise<void> {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const { id } = req.params;
      const user = (req as any).user;

      const [missions]: any = await conn.query(
        'SELECT * FROM ems_missions WHERE id = ? FOR UPDATE',
        [id]
      );
      if (!missions.length) {
        res.status(404).json({ success: false, message: 'Mission not found' });
        return;
      }
      const mission = missions[0];

      if (mission.status === 'COMPLETED') {
        res.json({ success: true, message: 'Mission is already completed' });
        return;
      }

      await conn.query(
        `UPDATE ems_missions 
         SET status = 'COMPLETED', return_completed_at = NOW(), completed_at = NOW(), updated_at = NOW()
         WHERE id = ?`,
        [id]
      );

      // Release vehicle back to AVAILABLE
      if (mission.vehicle_id) {
        await conn.query(
          "UPDATE ambulances SET status = 'AVAILABLE' WHERE id = ?",
          [mission.vehicle_id]
        );
      }

      // Release driver back to AVAILABLE
      if (mission.driver_id) {
        await conn.query(
          "UPDATE drivers SET employment_status = 'AVAILABLE' WHERE id = ?",
          [mission.driver_id]
        );
      }

      await conn.query(
        `INSERT INTO mission_status_logs (mission_id, status, note, logged_by)
         VALUES (?, 'COMPLETED', 'Mission closed. Vehicle and driver released to AVAILABLE.', ?)`,
        [id, user?.id || null]
      );

      await conn.commit();

      await logAudit({
        userId: user?.id,
        userName: user?.fullName,
        action: 'COMPLETE_MISSION',
        entity: 'ems_missions',
        entityId: String(id),
        details: { vehicleId: mission.vehicle_id, driverId: mission.driver_id },
        req,
      });

      res.json({
        success: true,
        message: 'Mission successfully completed. Asset status reset to AVAILABLE.',
        status: 'COMPLETED',
      });
    } catch (error: any) {
      await conn.rollback();
      console.error('completeMission error:', error);
      res.status(500).json({ success: false, message: error.message });
    } finally {
      conn.release();
    }
  },

  // 12. Helper to fetch available resources for assignment
  async getAvailableResources(req: Request, res: Response): Promise<void> {
    try {
      const [vehicles]: any = await pool.query(
        "SELECT * FROM ambulances WHERE status = 'AVAILABLE' AND active = 1 ORDER BY vehicle_code ASC"
      );
      const [drivers]: any = await pool.query(
        "SELECT * FROM drivers WHERE employment_status = 'AVAILABLE' AND active = 1 ORDER BY display_name ASC"
      );
      const [staff]: any = await pool.query(
        `SELECT s.* FROM ems_staff s
         WHERE s.active = 1
         AND s.id NOT IN (
           SELECT mc.staff_id FROM mission_crew mc
           JOIN ems_missions m ON mc.mission_id = m.id
           WHERE m.status NOT IN ('COMPLETED', 'CANCELLED')
         )
         ORDER BY s.profession ASC, s.display_name ASC`
      );

      res.json({
        success: true,
        data: {
          availableVehicles: vehicles,
          availableDrivers: drivers,
          availableStaff: staff,
        },
      });
    } catch (error: any) {
      console.error('getAvailableResources error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  },
};
