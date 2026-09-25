import { Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../db/connection';
import { MapProviderFactory } from '../adapters/map/IMapProvider';
import {
  VehicleMarkerData,
  TrackingHealthStatus,
  GpsTrackPoint,
  MissionTrackResponse,
  TrackingHealthSummary,
} from '../types/map.types';

// Validation schema for batch sync (Phase MAP-2)
const GpsBatchSyncSchema = z.object({
  vehicle_id: z.number().int().positive(),
  mission_id: z.number().int().positive().optional().nullable(),
  points: z.array(
    z.object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      altitude: z.number().optional().nullable(),
      speed: z.number().min(0).max(250).default(0),
      heading: z.number().min(0).max(360).optional().nullable(),
      accuracy: z.number().min(0).max(500).default(10),
      gps_quality: z.enum(['GOOD', 'FAIR', 'POOR', 'INVALID']).default('GOOD'),
      recorded_at: z.string(),
    })
  ).min(1).max(500),
});

/**
 * Calculate Haversine distance in kilometers between two GPS points
 */
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export class MapController {
  /**
   * Get all vehicles with real-time telematics, status, driver, mission & freshness calculation
   */
  public static async getVehicles(req: Request, res: Response): Promise<void> {
    try {
      const staleThreshold = Number(process.env.GPS_STALE_THRESHOLD_SEC) || 120;
      const lostThreshold = Number(process.env.GPS_LOST_THRESHOLD_SEC) || 300;

      const [rows]: any = await pool.query(`
        SELECT 
          a.id,
          a.vehicle_code,
          a.registration_no,
          a.vehicle_type,
          a.status,
          a.current_latitude,
          a.current_longitude,
          a.current_heading,
          a.current_speed,
          a.last_gps_at,
          a.gps_quality,
          TIMESTAMPDIFF(SECOND, a.last_gps_at, NOW()) AS seconds_since_last_gps,
          m.id AS mission_id,
          m.mission_no,
          m.mission_type,
          m.status AS mission_status,
          m.scene_description,
          f_dest.name AS destination_name,
          d.id AS driver_id,
          d.display_name AS driver_name,
          d.phone_optional AS driver_phone,
          (
            SELECT COUNT(*) 
            FROM mission_crew mc 
            WHERE mc.mission_id = m.id
          ) AS crew_count
        FROM ambulances a
        LEFT JOIN ems_missions m ON m.vehicle_id = a.id AND m.status NOT IN ('COMPLETED', 'CANCELLED')
        LEFT JOIN facilities f_dest ON f_dest.id = m.destination_facility_id
        LEFT JOIN drivers d ON d.id = m.driver_id
        WHERE a.active = 1
        ORDER BY a.vehicle_code ASC
      `);

      const vehicles: VehicleMarkerData[] = rows.map((r: any) => {
        const sec = r.seconds_since_last_gps !== null ? Number(r.seconds_since_last_gps) : null;
        let trackingHealth: TrackingHealthStatus = 'TRACKING';
        let effectiveStatus = r.status;
        const currentSpeed = Number(r.current_speed || 0);

        if (r.current_latitude === null || r.current_longitude === null) {
          trackingHealth = 'GPS_UNAVAILABLE';
        } else if (sec === null || sec > lostThreshold) {
          trackingHealth = 'TRACKING_LOST';
          if (effectiveStatus !== 'MAINTENANCE' && effectiveStatus !== 'OUT_OF_SERVICE') {
            effectiveStatus = 'TRACKING_LOST';
          }
        } else if (sec > staleThreshold) {
          trackingHealth = 'TRACKING_DELAYED';
        }

        // Section 33: Differentiate stopped vehicle from GPS lost
        const isStopped = currentSpeed === 0 && trackingHealth === 'TRACKING';

        return {
          id: r.id,
          vehicle_code: r.vehicle_code,
          registration_no: r.registration_no,
          vehicle_type: r.vehicle_type,
          status: effectiveStatus,
          current_latitude: r.current_latitude !== null ? Number(r.current_latitude) : null,
          current_longitude: r.current_longitude !== null ? Number(r.current_longitude) : null,
          current_heading: r.current_heading !== null ? Number(r.current_heading) : null,
          current_speed: currentSpeed,
          is_stopped: isStopped,
          last_gps_at: r.last_gps_at,
          gps_quality: r.gps_quality || 'GOOD',
          seconds_since_last_gps: sec,
          tracking_health: trackingHealth,
          active_mission: r.mission_id
            ? {
                id: r.mission_id,
                mission_no: r.mission_no,
                mission_type: r.mission_type,
                status: r.mission_status,
                destination_name: r.destination_name,
                scene_description: r.scene_description,
              }
            : null,
          driver: r.driver_id
            ? {
                id: r.driver_id,
                display_name: r.driver_name,
                phone: r.driver_phone,
              }
            : null,
          crew_count: Number(r.crew_count || 0),
        };
      });

      res.json({
        success: true,
        count: vehicles.length,
        data: vehicles,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('Error fetching vehicle markers:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Get recorded GPS track for a specific mission with quality validation and distance calculation (Section 13, 25, 35)
   */
  public static async getMissionTrack(req: Request, res: Response): Promise<void> {
    try {
      const identifier = String(req.params.id); // numeric mission_id or string mission_no
      const limit = Math.min(Number(req.query.limit) || 500, 1000);
      const isNumeric = /^\d+$/.test(identifier);

      // Find mission record
      const [missionRows]: any = await pool.query(
        `SELECT m.id, m.mission_no, m.mission_type, a.vehicle_code 
         FROM ems_missions m
         LEFT JOIN ambulances a ON a.id = m.vehicle_id
         WHERE ${isNumeric ? 'm.id = ?' : 'm.mission_no = ?'} LIMIT 1`,
        [identifier]
      );

      if (missionRows.length === 0) {
        res.status(404).json({ success: false, message: 'Mission not found' });
        return;
      }

      const mission = missionRows[0];

      // Query recorded GPS tracks with index vehicle_id, mission_id, recorded_at
      const [trackRows]: any = await pool.query(
        `SELECT id, latitude, longitude, altitude, speed, heading, accuracy, gps_quality, recorded_at
         FROM gps_tracks
         WHERE mission_id = ?
         ORDER BY recorded_at ASC
         LIMIT ?`,
        [mission.id, limit]
      );

      const trackPoints: GpsTrackPoint[] = trackRows.map((t: any) => ({
        id: t.id,
        latitude: Number(t.latitude),
        longitude: Number(t.longitude),
        altitude: t.altitude !== null ? Number(t.altitude) : null,
        speed: Number(t.speed || 0),
        heading: t.heading !== null ? Number(t.heading) : null,
        accuracy: Number(t.accuracy || 10),
        gps_quality: t.gps_quality,
        recorded_at: t.recorded_at,
      }));

      // Calculate raw distance vs validated distance (Section 25)
      let rawDistanceKm = 0;
      let validatedDistanceKm = 0;

      for (let i = 1; i < trackPoints.length; i++) {
        const prev = trackPoints[i - 1];
        const curr = trackPoints[i];
        const segment = haversineDistance(
          prev.latitude,
          prev.longitude,
          curr.latitude,
          curr.longitude
        );

        rawDistanceKm += segment;

        // Validated distance filters out INVALID points and impossible teleportation jumps (>150 km/h)
        const isQualityValid =
          curr.gps_quality !== 'INVALID' && prev.gps_quality !== 'INVALID';
        const timeDiffSeconds = Math.max(
          1,
          (new Date(curr.recorded_at).getTime() -
            new Date(prev.recorded_at).getTime()) /
            1000
        );
        const segmentSpeedKmh = (segment / (timeDiffSeconds / 3600));

        if (isQualityValid && segmentSpeedKmh < 180 && segment > 0.005) {
          validatedDistanceKm += segment;
        }
      }

      const response: MissionTrackResponse = {
        success: true,
        mission_id: mission.id,
        mission_no: mission.mission_no,
        mission_type: mission.mission_type,
        vehicle_code: mission.vehicle_code || 'EMS',
        points_count: trackPoints.length,
        raw_distance_km: Math.round(rawDistanceKm * 100) / 100,
        validated_distance_km: Math.round(validatedDistanceKm * 100) / 100,
        track_points: trackPoints,
      };

      res.json(response);
    } catch (error: any) {
      console.error('Error fetching mission track:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Get recent GPS track for a vehicle (Section 35)
   */
  public static async getVehicleTrack(req: Request, res: Response): Promise<void> {
    try {
      const vehicleId = Number(req.params.id);
      const limit = Math.min(Number(req.query.limit) || 100, 500);

      const [rows]: any = await pool.query(
        `SELECT id, latitude, longitude, altitude, speed, heading, accuracy, gps_quality, recorded_at
         FROM gps_tracks
         WHERE vehicle_id = ?
         ORDER BY recorded_at DESC
         LIMIT ?`,
        [vehicleId, limit]
      );

      const points = rows.reverse().map((t: any) => ({
        id: t.id,
        latitude: Number(t.latitude),
        longitude: Number(t.longitude),
        altitude: t.altitude !== null ? Number(t.altitude) : null,
        speed: Number(t.speed || 0),
        heading: t.heading !== null ? Number(t.heading) : null,
        accuracy: Number(t.accuracy || 10),
        gps_quality: t.gps_quality,
        recorded_at: t.recorded_at,
      }));

      res.json({ success: true, count: points.length, data: points });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Batch Sync GPS points from Driver PWA / Mobile device (Section 19, 20, 21)
   */
  public static async syncGpsBatch(req: Request, res: Response): Promise<void> {
    try {
      const parsed = GpsBatchSyncSchema.parse(req.body);
      const { vehicle_id, mission_id, points } = parsed;

      let insertedCount = 0;
      let lastPoint = points[points.length - 1];

      for (const p of points) {
        // Prevent duplicate insertion: check if point exists within 5 seconds for same vehicle
        const [existing]: any = await pool.query(
          `SELECT id FROM gps_tracks 
           WHERE vehicle_id = ? AND ABS(TIMESTAMPDIFF(SECOND, recorded_at, ?)) < 3 
           LIMIT 1`,
          [vehicle_id, p.recorded_at]
        );

        if (existing.length === 0) {
          await pool.query(
            `INSERT INTO gps_tracks (mission_id, vehicle_id, latitude, longitude, altitude, speed, heading, accuracy, gps_quality, sync_status, recorded_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'SYNCED', ?)`,
            [
              mission_id || null,
              vehicle_id,
              p.latitude,
              p.longitude,
              p.altitude || null,
              p.speed,
              p.heading || null,
              p.accuracy,
              p.gps_quality,
              p.recorded_at,
            ]
          );
          insertedCount++;
        }
      }

      // Update vehicle latest known telematics from the newest valid point
      if (lastPoint) {
        await pool.query(
          `UPDATE ambulances 
           SET current_latitude = ?, current_longitude = ?, current_speed = ?, current_heading = ?, last_gps_at = ?, gps_quality = ?
           WHERE id = ?`,
          [
            lastPoint.latitude,
            lastPoint.longitude,
            lastPoint.speed,
            lastPoint.heading || null,
            lastPoint.recorded_at,
            lastPoint.gps_quality,
            vehicle_id,
          ]
        );
      }

      res.status(201).json({
        success: true,
        message: `Batch sync complete: ${insertedCount} new points stored`,
        received: points.length,
        inserted: insertedCount,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Get Tracking Health Breakdown for fleet dashboard (Section 33)
   */
  public static async getTrackingHealth(req: Request, res: Response): Promise<void> {
    try {
      const staleThreshold = Number(process.env.GPS_STALE_THRESHOLD_SEC) || 120;
      const lostThreshold = Number(process.env.GPS_LOST_THRESHOLD_SEC) || 300;

      const [rows]: any = await pool.query(`
        SELECT 
          current_latitude, 
          current_longitude, 
          current_speed,
          TIMESTAMPDIFF(SECOND, last_gps_at, NOW()) AS sec_since
        FROM ambulances 
        WHERE active = 1
      `);

      let onlineMoving = 0;
      let onlineStopped = 0;
      let trackingDelayed = 0;
      let trackingLost = 0;
      let gpsUnavailable = 0;

      for (const r of rows) {
        if (r.current_latitude === null || r.current_longitude === null) {
          gpsUnavailable++;
        } else if (r.sec_since === null || r.sec_since > lostThreshold) {
          trackingLost++;
        } else if (r.sec_since > staleThreshold) {
          trackingDelayed++;
        } else if (Number(r.current_speed || 0) === 0) {
          onlineStopped++;
        } else {
          onlineMoving++;
        }
      }

      const summary: TrackingHealthSummary = {
        total_vehicles: rows.length,
        online_moving: onlineMoving,
        online_stopped: onlineStopped,
        tracking_delayed: trackingDelayed,
        tracking_lost: trackingLost,
        gps_unavailable: gpsUnavailable,
      };

      res.json({ success: true, data: summary });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Get active missions with coordinates and progress
   */
  public static async getActiveMissions(req: Request, res: Response): Promise<void> {
    try {
      const [rows]: any = await pool.query(`
        SELECT 
          m.id,
          m.mission_no,
          m.mission_type,
          m.status,
          m.scene_latitude,
          m.scene_longitude,
          m.scene_description,
          m.departure_at,
          m.arrived_at,
          m.created_at,
          v.id AS vehicle_id,
          v.vehicle_code,
          v.current_latitude AS vehicle_lat,
          v.current_longitude AS vehicle_lng,
          v.current_speed,
          d.display_name AS driver_name,
          f_orig.name AS origin_name,
          f_orig.latitude AS origin_lat,
          f_orig.longitude AS origin_lng,
          f_dest.name AS destination_name,
          f_dest.latitude AS destination_lat,
          f_dest.longitude AS destination_lng
        FROM ems_missions m
        LEFT JOIN ambulances v ON v.id = m.vehicle_id
        LEFT JOIN drivers d ON d.id = m.driver_id
        LEFT JOIN facilities f_orig ON f_orig.id = m.origin_facility_id
        LEFT JOIN facilities f_dest ON f_dest.id = m.destination_facility_id
        WHERE m.status NOT IN ('COMPLETED', 'CANCELLED')
        ORDER BY m.created_at DESC
      `);

      res.json({ success: true, count: rows.length, data: rows });
    } catch (error: any) {
      console.error('Error fetching active missions:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Get Map Provider and Tile configuration (OpenStreetMap, etc.)
   */
  public static async getMapConfig(req: Request, res: Response): Promise<void> {
    try {
      const provider = MapProviderFactory.getProvider();
      res.json({
        success: true,
        tileConfig: provider.getTileConfig(),
        defaultCenter: provider.getDefaultCenter(),
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
