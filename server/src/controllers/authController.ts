import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { pool } from '../db/connection';
import { logAudit } from '../utils/auditLogger';

const LoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

export class AuthController {
  public static async login(req: Request, res: Response): Promise<void> {
    try {
      const { username, password } = LoginSchema.parse(req.body);

      const [rows]: any = await pool.query(
        `SELECT u.id, u.username, u.password_hash, u.full_name, u.active, r.name AS role_name
         FROM users u
         JOIN roles r ON r.id = u.role_id
         WHERE u.username = ?
         LIMIT 1`,
        [username]
      );

      if (rows.length === 0) {
        res.status(401).json({ success: false, message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
        return;
      }

      const user = rows[0];
      if (!user.active) {
        res.status(403).json({ success: false, message: 'บัญชีผู้ใช้นี้ถูกระงับการใช้งาน' });
        return;
      }

      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        res.status(401).json({ success: false, message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
        return;
      }

      const token = jwt.sign(
        {
          id: user.id,
          username: user.username,
          full_name: user.full_name,
          role: user.role_name
        },
        process.env.JWT_SECRET || 'super_secret_pdh_smart_ems_jwt_key_2026_change_in_production',
        { expiresIn: '7d' }
      );

      await logAudit({
        req,
        userId: user.id,
        userName: user.username,
        action: 'USER_LOGIN',
        entity: 'users',
        entityId: user.id,
        details: { role: user.role_name }
      });

      res.json({
        success: true,
        message: 'เข้าสู่ระบบสำเร็จ',
        token,
        user: {
          id: user.id,
          username: user.username,
          full_name: user.full_name,
          role: user.role_name
        }
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      res.status(500).json({ success: false, message: error.message });
    }
  }

  public static async getProfile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const [rows]: any = await pool.query(
        `SELECT u.id, u.username, u.full_name, u.phone, r.name AS role_name
         FROM users u
         JOIN roles r ON r.id = u.role_id
         WHERE u.id = ?`,
        [req.user.id]
      );

      if (rows.length === 0) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }

      res.json({ success: true, user: rows[0] });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
