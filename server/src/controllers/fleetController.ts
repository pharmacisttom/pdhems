import { Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../db/connection';
import { logAudit } from '../utils/auditLogger';

const AmbulanceSchema = z.object({
  vehicle_code: z.string().min(2).max(50),
  registration_no: z.string().min(2).max(50),
  vehicle_type: z.enum(['ALS_AMBULANCE', 'BLS_AMBULANCE', 'INTERMEDIATE']).default('ALS_AMBULANCE'),
  brand: z.string().min(1).max(50),
  model: z.string().min(1).max(50),
  year_optional: z.number().int().min(1990).max(2035).optional().nullable(),
  odometer: z.number().min(0).default(0),
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
  ]).default('AVAILABLE'),
  current_latitude: z.number().min(-90).max(90).optional().nullable(),
  current_longitude: z.number().min(-180).max(180).optional().nullable(),
});

const DriverSchema = z.object({
  employee_code: z.string().min(2).max(50),
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  display_name: z.string().min(1).max(150),
  phone_optional: z.string().max(30).optional().nullable(),
  driver_license_no_optional: z.string().max(50).optional().nullable(),
  license_type_optional: z.string().max(50).optional().nullable(),
  employment_status: z.enum(['AVAILABLE', 'ON_MISSION', 'OFF_DUTY', 'LEAVE', 'SUSPENDED']).default('AVAILABLE'),
});

const StaffSchema = z.object({
  employee_code: z.string().min(2).max(50),
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  display_name: z.string().min(1).max(150),
  position: z.string().max(100).optional().nullable(),
  profession: z.enum(['Doctor', 'Nurse', 'Paramedic', 'EMT', 'Driver', 'Other']).default('EMT'),
  phone_optional: z.string().max(30).optional().nullable(),
});

export class FleetController {
  // --- AMBULANCES ---
  public static async createAmbulance(req: Request, res: Response): Promise<void> {
    try {
      const data = AmbulanceSchema.parse(req.body);
      const [existing]: any = await pool.query(
        'SELECT id FROM ambulances WHERE vehicle_code = ?',
        [data.vehicle_code]
      );
      if (existing.length > 0) {
        res.status(409).json({ success: false, message: `รหัสรถ ${data.vehicle_code} มีอยู่ในระบบแล้ว` });
        return;
      }

      const defaultLat = data.current_latitude ?? 12.9756;
      const defaultLng = data.current_longitude ?? 101.2155;

      const [result]: any = await pool.query(
        `INSERT INTO ambulances 
          (vehicle_code, registration_no, vehicle_type, brand, model, year_optional, odometer, status, current_latitude, current_longitude, current_speed, last_gps_at, gps_quality, active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0.0, NOW(), 'GOOD', 1)`,
        [
          data.vehicle_code,
          data.registration_no,
          data.vehicle_type,
          data.brand,
          data.model,
          data.year_optional ?? null,
          data.odometer,
          data.status,
          defaultLat,
          defaultLng,
        ]
      );

      res.status(201).json({
        success: true,
        message: 'เพิ่มข้อมูลรถพยาบาลเรียบร้อยแล้ว',
        data: { id: result.insertId, ...data }
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public static async updateAmbulance(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      const data = AmbulanceSchema.partial().parse(req.body);

      const updates: string[] = [];
      const params: any[] = [];

      for (const [key, value] of Object.entries(data)) {
        if (value !== undefined) {
          updates.push(`${key} = ?`);
          params.push(value);
        }
      }

      if (updates.length === 0) {
        res.status(400).json({ success: false, message: 'ไม่มีข้อมูลที่ต้องการแก้ไข' });
        return;
      }

      params.push(id);
      await pool.query(`UPDATE ambulances SET ${updates.join(', ')} WHERE id = ?`, params);
      res.json({ success: true, message: 'อัปเดตข้อมูลรถพยาบาลเรียบร้อยแล้ว' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public static async deleteAmbulance(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      await pool.query('UPDATE ambulances SET active = 0 WHERE id = ?', [id]);
      res.json({ success: true, message: 'ลบข้อมูลรถพยาบาลเรียบร้อยแล้ว' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // --- DRIVERS ---
  public static async getDrivers(req: Request, res: Response): Promise<void> {
    try {
      const [rows]: any = await pool.query(
        'SELECT * FROM drivers WHERE active = 1 ORDER BY display_name ASC'
      );
      res.json({ success: true, count: rows.length, data: rows });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public static async createDriver(req: Request, res: Response): Promise<void> {
    try {
      const data = DriverSchema.parse(req.body);
      const [result]: any = await pool.query(
        `INSERT INTO drivers (employee_code, first_name, last_name, display_name, phone_optional, driver_license_no_optional, license_type_optional, employment_status, active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          data.employee_code,
          data.first_name,
          data.last_name,
          data.display_name,
          data.phone_optional ?? null,
          data.driver_license_no_optional ?? null,
          data.license_type_optional ?? null,
          data.employment_status,
        ]
      );
      res.status(201).json({ success: true, message: 'เพิ่มข้อมูลพลขับเรียบร้อยแล้ว', data: { id: result.insertId, ...data } });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public static async updateDriver(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      const data = DriverSchema.partial().parse(req.body);

      const updates: string[] = [];
      const params: any[] = [];
      for (const [key, value] of Object.entries(data)) {
        if (value !== undefined) {
          updates.push(`${key} = ?`);
          params.push(value);
        }
      }
      if (updates.length === 0) {
        res.status(400).json({ success: false, message: 'ไม่มีข้อมูลที่ต้องการแก้ไข' });
        return;
      }
      params.push(id);
      await pool.query(`UPDATE drivers SET ${updates.join(', ')} WHERE id = ?`, params);
      res.json({ success: true, message: 'อัปเดตข้อมูลพลขับเรียบร้อยแล้ว' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public static async deleteDriver(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      await pool.query('UPDATE drivers SET active = 0 WHERE id = ?', [id]);
      res.json({ success: true, message: 'ลบข้อมูลพลขับเรียบร้อยแล้ว' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // --- EMS STAFF ---
  public static async getStaff(req: Request, res: Response): Promise<void> {
    try {
      const [rows]: any = await pool.query(
        'SELECT * FROM ems_staff WHERE active = 1 ORDER BY display_name ASC'
      );
      res.json({ success: true, count: rows.length, data: rows });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public static async createStaff(req: Request, res: Response): Promise<void> {
    try {
      const data = StaffSchema.parse(req.body);
      const [result]: any = await pool.query(
        `INSERT INTO ems_staff (employee_code, first_name, last_name, display_name, position, profession, phone_optional, active)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          data.employee_code,
          data.first_name,
          data.last_name,
          data.display_name,
          data.position ?? null,
          data.profession,
          data.phone_optional ?? null,
        ]
      );
      res.status(201).json({ success: true, message: 'เพิ่มข้อมูลเจ้าหน้าที่กู้ชีพเรียบร้อยแล้ว', data: { id: result.insertId, ...data } });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public static async updateStaff(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      const data = StaffSchema.partial().parse(req.body);

      const updates: string[] = [];
      const params: any[] = [];
      for (const [key, value] of Object.entries(data)) {
        if (value !== undefined) {
          updates.push(`${key} = ?`);
          params.push(value);
        }
      }
      if (updates.length === 0) {
        res.status(400).json({ success: false, message: 'ไม่มีข้อมูลที่ต้องการแก้ไข' });
        return;
      }
      params.push(id);
      await pool.query(`UPDATE ems_staff SET ${updates.join(', ')} WHERE id = ?`, params);
      res.json({ success: true, message: 'อัปเดตข้อมูลเจ้าหน้าที่กู้ชีพเรียบร้อยแล้ว' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public static async deleteStaff(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      await pool.query('UPDATE ems_staff SET active = 0 WHERE id = ?', [id]);
      res.json({ success: true, message: 'ลบข้อมูลเจ้าหน้าที่กู้ชีพเรียบร้อยแล้ว' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // --- SUMMARY ---
  public static async getFleetSummary(req: Request, res: Response): Promise<void> {
    try {
      const [vehicles]: any = await pool.query(
        'SELECT status, count(*) as count FROM ambulances WHERE active = 1 GROUP BY status'
      );
      const [drivers]: any = await pool.query(
        'SELECT employment_status, count(*) as count FROM drivers WHERE active = 1 GROUP BY employment_status'
      );
      const [staff]: any = await pool.query(
        'SELECT profession, count(*) as count FROM ems_staff WHERE active = 1 GROUP BY profession'
      );

      res.json({
        success: true,
        summary: {
          vehicles,
          drivers,
          staff
        }
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
