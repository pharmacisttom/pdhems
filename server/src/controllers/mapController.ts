import { Request, Response } from 'express';
import { pool } from '../db/connection';
import { MapProviderFactory } from '../adapters/map/IMapProvider';
import { VehicleMarkerData, TrackingHealthStatus } from '../types/map.types';

export class MapController {
  /**
   * Get all vehicles with real-time telematics, status, driver, mission & freshness calculation
   */
  public static async getVehicles(req: Request, res: Response): Promise<void> {
    try {
      const staleThreshold = Number(process.env.GPS_STALE_THRESHOLD_SEC) || 120;
      const lostThreshold = Number(process.env.GPS_LOST_THRESHOLD_SEC) || 300;

      // Query ambulances + latest active mission + driver + crew count
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

        return {
          id: r.id,
          vehicle_code: r.vehicle_code,
          registration_no: r.registration_no,
          vehicle_type: r.vehicle_type,
          status: effectiveStatus,
          current_latitude: r.current_latitude !== null ? Number(r.current_latitude) : null,
          current_longitude: r.current_longitude !== null ? Number(r.current_longitude) : null,
          current_heading: r.current_heading !== null ? Number(r.current_heading) : null,
          current_speed: Number(r.current_speed || 0),
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
                scene_description: r.scene_description
              }
            : null,
          driver: r.driver_id
            ? {
                id: r.driver_id,
                display_name: r.driver_name,
                phone: r.driver_phone
              }
            : null,
          crew_count: Number(r.crew_count || 0)
        };
      });

      res.json({
        success: true,
        count: vehicles.length,
        data: vehicles,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('Error fetching vehicle markers:', error);
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
        defaultCenter: provider.getDefaultCenter()
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
