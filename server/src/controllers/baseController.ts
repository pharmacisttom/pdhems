import { Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../db/connection';
import { logAudit } from '../utils/auditLogger';

const BaseSchema = z.object({
  name: z.string().min(2).max(150),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  geofence_radius: z.number().min(50).max(1000).default(150),
  active: z.boolean().default(true)
});

export class BaseController {
  public static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const [rows]: any = await pool.query(
        'SELECT * FROM ems_bases WHERE active = 1 ORDER BY name ASC'
      );
      const bases = rows.map((r: any) => ({
        ...r,
        latitude: Number(r.latitude),
        longitude: Number(r.longitude),
        geofence_radius: Number(r.geofence_radius),
        active: Boolean(r.active)
      }));
      res.json({ success: true, count: bases.length, data: bases });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public static async getById(req: Request, res: Response): Promise<void> {
    try {
      const [rows]: any = await pool.query('SELECT * FROM ems_bases WHERE id = ?', [req.params.id]);
      if (rows.length === 0) {
        res.status(404).json({ success: false, message: 'EMS Base not found' });
        return;
      }
      res.json({ success: true, data: rows[0] });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public static async create(req: Request, res: Response): Promise<void> {
    try {
      const parsed = BaseSchema.parse(req.body);
      const [result]: any = await pool.query(
        `INSERT INTO ems_bases (name, latitude, longitude, geofence_radius, active)
         VALUES (?, ?, ?, ?, ?)`,
        [
          parsed.name,
          parsed.latitude,
          parsed.longitude,
          parsed.geofence_radius,
          parsed.active ? 1 : 0
        ]
      );

      await logAudit({
        req,
        action: 'CREATE_EMS_BASE',
        entity: 'ems_bases',
        entityId: result.insertId,
        details: parsed
      });

      res.status(201).json({
        success: true,
        message: 'EMS Base created successfully',
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
      const parsed = BaseSchema.partial().parse(req.body);
      const baseId = Number(req.params.id);

      const [existing]: any = await pool.query('SELECT * FROM ems_bases WHERE id = ?', [baseId]);
      if (existing.length === 0) {
        res.status(404).json({ success: false, message: 'EMS Base not found' });
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
        values.push(baseId);
        await pool.query(`UPDATE ems_bases SET ${updates.join(', ')} WHERE id = ?`, values);

        await logAudit({
          req,
          action: 'UPDATE_EMS_BASE',
          entity: 'ems_bases',
          entityId: baseId,
          details: { before: existing[0], after: parsed }
        });
      }

      res.json({ success: true, message: 'EMS Base updated successfully' });
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
      const baseId = Number(req.params.id);
      await pool.query('UPDATE ems_bases SET active = 0 WHERE id = ?', [baseId]);

      await logAudit({
        req,
        action: 'DEACTIVATE_EMS_BASE',
        entity: 'ems_bases',
        entityId: baseId
      });

      res.json({ success: true, message: 'EMS Base deactivated successfully' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
