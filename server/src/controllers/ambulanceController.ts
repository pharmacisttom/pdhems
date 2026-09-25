import { Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../db/connection';
import { logAudit } from '../utils/auditLogger';

const LocationUpdateSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  speed: z.number().min(0).max(200).default(0),
  heading: z.number().min(0).max(360).optional().nullable(),
  gps_quality: z.enum(['GOOD', 'FAIR', 'POOR', 'INVALID']).default('GOOD'),
  status: z.enum([
    'AVAILABLE',
    'ASSIGNED',
    'EN_ROUTE',
    'AT_SCENE',
    'AT_DESTINATION',
    'RETURNING',
    'MAINTENANCE',
    'OUT_OF_SERVICE',
    'TRACKING_LOST'
  ]).optional()
});

export class AmbulanceController {
  public static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const [rows]: any = await pool.query(`
        SELECT 
          id, vehicle_code, registration_no, vehicle_type, brand, model, 
          odometer, status, current_latitude, current_longitude, 
          current_heading, current_speed, last_gps_at, gps_quality, active
        FROM ambulances 
        WHERE active = 1 
        ORDER BY vehicle_code ASC
      `);
      res.json({ success: true, count: rows.length, data: rows });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public static async getById(req: Request, res: Response): Promise<void> {
    try {
      const [rows]: any = await pool.query('SELECT * FROM ambulances WHERE id = ?', [req.params.id]);
      if (!rows.length) {
        res.status(404).json({ success: false, message: 'Ambulance not found' });
        return;
      }
      res.json({ success: true, data: rows[0] });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public static async updateLocation(req: Request, res: Response): Promise<void> {
    try {
      const vehicleId = Number(req.params.id);
      const parsed = LocationUpdateSchema.parse(req.body);

      const [vehicle]: any = await pool.query('SELECT * FROM ambulances WHERE id = ?', [vehicleId]);
      if (vehicle.length === 0) {
        res.status(404).json({ success: false, message: 'Ambulance not found' });
        return;
      }

      const updates = [
        'current_latitude = ?',
        'current_longitude = ?',
        'current_speed = ?',
        'current_heading = ?',
        'last_gps_at = NOW()',
        'gps_quality = ?'
      ];
      const params: any[] = [
        parsed.latitude,
        parsed.longitude,
        parsed.speed,
        parsed.heading !== undefined ? parsed.heading : vehicle[0].current_heading,
        parsed.gps_quality
      ];

      if (parsed.status) {
        updates.push('status = ?');
        params.push(parsed.status);
      }

      params.push(vehicleId);

      await pool.query(`UPDATE ambulances SET ${updates.join(', ')} WHERE id = ?`, params);

      // Record track point
      await pool.query(
        `INSERT INTO gps_tracks (vehicle_id, latitude, longitude, speed, heading, gps_quality, recorded_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [vehicleId, parsed.latitude, parsed.longitude, parsed.speed, parsed.heading || 0, parsed.gps_quality]
      );

      res.json({ success: true, message: 'Ambulance GPS telematics updated' });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
