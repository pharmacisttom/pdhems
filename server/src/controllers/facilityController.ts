import { Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../db/connection';
import { logAudit } from '../utils/auditLogger';

const FacilitySchema = z.object({
  facility_code: z.string().min(2).max(50),
  name: z.string().min(2).max(150),
  facility_type: z.enum([
    'HOSPITAL',
    'COMMUNITY_HOSPITAL',
    'GENERAL_HOSPITAL',
    'REGIONAL_HOSPITAL',
    'EMS_BASE',
    'OTHER'
  ]),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  geofence_radius: z.number().min(50).max(2000).default(200),
  phone_optional: z.string().max(50).optional().nullable(),
  active: z.boolean().default(true)
});

export class FacilityController {
  public static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const [rows]: any = await pool.query(
        'SELECT * FROM facilities WHERE active = 1 ORDER BY name ASC'
      );
      const facilities = rows.map((r: any) => ({
        ...r,
        latitude: Number(r.latitude),
        longitude: Number(r.longitude),
        geofence_radius: Number(r.geofence_radius),
        active: Boolean(r.active)
      }));
      res.json({ success: true, count: facilities.length, data: facilities });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public static async getById(req: Request, res: Response): Promise<void> {
    try {
      const [rows]: any = await pool.query('SELECT * FROM facilities WHERE id = ?', [req.params.id]);
      if (rows.length === 0) {
        res.status(404).json({ success: false, message: 'Facility not found' });
        return;
      }
      res.json({ success: true, data: rows[0] });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public static async create(req: Request, res: Response): Promise<void> {
    try {
      const parsed = FacilitySchema.parse(req.body);
      const [result]: any = await pool.query(
        `INSERT INTO facilities (facility_code, name, facility_type, latitude, longitude, geofence_radius, phone_optional, active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          parsed.facility_code,
          parsed.name,
          parsed.facility_type,
          parsed.latitude,
          parsed.longitude,
          parsed.geofence_radius,
          parsed.phone_optional || null,
          parsed.active ? 1 : 0
        ]
      );

      await logAudit({
        req,
        action: 'CREATE_FACILITY',
        entity: 'facilities',
        entityId: result.insertId,
        details: parsed
      });

      res.status(201).json({
        success: true,
        message: 'Facility created successfully',
        data: { id: result.insertId, ...parsed }
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public static async update(req: Request, res: Response): Promise<void> {
    try {
      const parsed = FacilitySchema.partial().parse(req.body);
      const facilityId = Number(req.params.id);

      const [existing]: any = await pool.query('SELECT * FROM facilities WHERE id = ?', [facilityId]);
      if (existing.length === 0) {
        res.status(404).json({ success: false, message: 'Facility not found' });
        return;
      }

      const updates: string[] = [];
      const values: any[] = [];

      Object.entries(parsed).forEach(([key, val]) => {
        if (val !== undefined) {
          updates.push(`${key} = ?`);
          values.push(typeof val === 'boolean' ? (val ? 1 : 0) : val);
        }
      });

      if (updates.length > 0) {
        values.push(facilityId);
        await pool.query(`UPDATE facilities SET ${updates.join(', ')} WHERE id = ?`, values);

        await logAudit({
          req,
          action: 'UPDATE_FACILITY',
          entity: 'facilities',
          entityId: facilityId,
          details: { before: existing[0], after: parsed }
        });
      }

      res.json({ success: true, message: 'Facility updated successfully' });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public static async delete(req: Request, res: Response): Promise<void> {
    try {
      const facilityId = Number(req.params.id);
      // Soft-delete
      await pool.query('UPDATE facilities SET active = 0 WHERE id = ?', [facilityId]);

      await logAudit({
        req,
        action: 'DEACTIVATE_FACILITY',
        entity: 'facilities',
        entityId: facilityId
      });

      res.json({ success: true, message: 'Facility deactivated successfully' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
