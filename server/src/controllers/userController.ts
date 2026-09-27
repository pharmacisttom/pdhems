import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { pool } from '../db/connection';

// Helper to validate 13-digit Thai Citizen ID
export function validateCitizenId(id: string): { valid: boolean; message?: string } {
  if (!id) return { valid: false, message: 'กรุณากรอกเลขบัตรประชาชน 13 หลัก' };
  const clean = id.replace(/[\s-]/g, '');
  if (!/^\d{13}$/.test(clean)) {
    return { valid: false, message: 'เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลักเท่านั้น' };
  }
  return { valid: true };
}

// Generate random strong password: e.g. Pdh@7829!
export function generateSecurePassword(): string {
  const digits = Math.floor(1000 + Math.random() * 9000);
  const specials = ['@', '#', '$', '!', '&'];
  const special = specials[Math.floor(Math.random() * specials.length)];
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const letter = letters[Math.floor(Math.random() * letters.length)];
  return `Pdh${special}${digits}${letter}`;
}

// Generate user identifier based on role
export function generateUsername(roleName: string): string {
  const prefixMap: Record<string, string> = {
    SUPER_ADMIN: 'adm',
    EMS_ADMIN: 'adm',
    DISPATCHER: 'dsp',
    DRIVER: 'drv',
    EMS_STAFF: 'stf',
    REFER_CENTER: 'ref',
    VIEWER: 'usr',
  };
  const prefix = prefixMap[roleName] || 'pdh';
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}_${randomSuffix}`;
}

async function logAudit(
  conn: any,
  req: Request,
  action: string,
  entityId: string | null,
  details: Record<string, any>
) {
  try {
    const user = (req as any).user;
    await conn.query(
      `INSERT INTO audit_logs (user_id, user_name, action, entity, entity_id, details, ip_address, user_agent)
       VALUES (?, ?, ?, 'users', ?, ?, ?, ?)`,
      [
        user?.id ?? null,
        user?.username ?? 'SYSTEM',
        action,
        entityId,
        JSON.stringify(details),
        req.ip ?? '127.0.0.1',
        (req.get('user-agent') ?? '').slice(0, 255),
      ]
    );
  } catch (err) {
    console.error('Audit log failed:', err);
  }
}

export class UserController {
  /**
   * Get all users with role details, password expiration status, and masked Citizen ID
   */
  static async getUsers(req: Request, res: Response): Promise<void> {
    try {
      const [rows]: any = await pool.query(`
        SELECT 
          u.id,
          u.username,
          u.employee_code,
          u.full_name,
          u.first_name,
          u.last_name,
          u.display_name,
          u.phone,
          u.citizen_id,
          u.agency_affiliation,
          u.email_optional,
          u.active,
          u.status,
          u.must_change_password,
          u.password_changed_at,
          u.last_login_at,
          u.last_login_ip,
          u.created_at,
          r.id AS role_id,
          r.name AS role_name,
          r.description AS role_description
        FROM users u
        LEFT JOIN roles r ON r.id = u.role_id
        ORDER BY u.created_at DESC
      `);

      // Enhance with password age (in days) and 90-day expiration status
      const now = Date.now();
      const users = rows.map((u: any) => {
        let passwordAgeDays = 0;
        let isPasswordExpired = false;
        let daysUntilExpiration = 90;

        if (u.password_changed_at) {
          const changedAt = new Date(u.password_changed_at).getTime();
          passwordAgeDays = Math.max(0, Math.floor((now - changedAt) / (1000 * 60 * 60 * 24)));
          isPasswordExpired = passwordAgeDays >= 90;
          daysUntilExpiration = Math.max(0, 90 - passwordAgeDays);
        } else {
          isPasswordExpired = true; // Never changed, expired by default
          passwordAgeDays = 999;
          daysUntilExpiration = 0;
        }

        // Mask citizen ID for security (e.g. 1-1002-XXXXX-XX-X)
        const rawId = u.citizen_id || '';
        const maskedCitizenId = rawId.length === 13
          ? `${rawId.slice(0, 1)}-${rawId.slice(1, 5)}-XXXXX-${rawId.slice(10, 12)}-${rawId.slice(12)}`
          : rawId;

        return {
          ...u,
          raw_citizen_id: rawId,
          masked_citizen_id: maskedCitizenId,
          password_age_days: passwordAgeDays,
          is_password_expired: isPasswordExpired,
          days_until_expiration: daysUntilExpiration,
          effective_must_change: Boolean(u.must_change_password || isPasswordExpired),
        };
      });

      res.json({ success: true, count: users.length, data: users });
    } catch (error: any) {
      console.error('Error fetching users:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Get all system roles
   */
  static async getRoles(req: Request, res: Response): Promise<void> {
    try {
      const [rows]: any = await pool.query('SELECT * FROM roles ORDER BY id ASC');
      res.json({ success: true, data: rows });
    } catch (error: any) {
      console.error('Error fetching roles:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Create User with Auto-generated Username & Temporary Password
   * Requires 13-digit Thai Citizen ID and Phone Number
   */
  static async createUser(req: Request, res: Response): Promise<void> {
    const {
      full_name,
      role_id,
      citizen_id,
      phone,
      agency_affiliation = 'โรงพยาบาลปลวกแดง',
      custom_username,
      custom_password,
    } = req.body;

    if (!full_name || !role_id || !citizen_id || !phone) {
      res.status(400).json({
        success: false,
        message: 'กรุณากรอกข้อมูลให้ครบถ้วน: ชื่อ-สกุล, ตำแหน่ง/สิทธิ์, เลขบัตรประชาชน 13 หลัก, และเบอร์โทรศัพท์',
      });
      return;
    }

    // Validate Citizen ID (13 digits)
    const cidCheck = validateCitizenId(citizen_id);
    if (!cidCheck.valid) {
      res.status(400).json({ success: false, message: cidCheck.message });
      return;
    }
    const cleanCitizenId = citizen_id.replace(/[\s-]/g, '');

    // Validate Phone Number
    const cleanPhone = phone.replace(/[\s-]/g, '');
    if (!/^\d{9,10}$/.test(cleanPhone)) {
      res.status(400).json({ success: false, message: 'เบอร์โทรศัพท์ต้องเป็นตัวเลข 9-10 หลัก' });
      return;
    }

    let conn: any;
    try {
      conn = await pool.getConnection();
      await conn.beginTransaction();

      // Check duplicate Citizen ID
      const [existingCid]: any = await conn.query(
        'SELECT id, username, full_name FROM users WHERE citizen_id = ?',
        [cleanCitizenId]
      );
      if (existingCid.length > 0) {
        await conn.rollback();
        res.status(400).json({
          success: false,
          message: `เลขบัตรประชาชนนี้ถูกใช้งานแล้วในระบบ (ผู้ใช้: ${existingCid[0].username} - ${existingCid[0].full_name})`,
        });
        return;
      }

      // Fetch Role
      const [roleRows]: any = await conn.query('SELECT name FROM roles WHERE id = ?', [role_id]);
      if (roleRows.length === 0) {
        await conn.rollback();
        res.status(400).json({ success: false, message: 'ไม่พบสิทธิ์การใช้งาน (Role) ที่ระบุ' });
        return;
      }
      const roleName = roleRows[0].name;

      // Auto-generate Username and Password if not provided
      let finalUsername = custom_username?.trim();
      if (!finalUsername) {
        let attempts = 0;
        let candidate = generateUsername(roleName);
        while (attempts < 10) {
          const [uExists]: any = await conn.query('SELECT id FROM users WHERE username = ?', [candidate]);
          if (uExists.length === 0) {
            finalUsername = candidate;
            break;
          }
          candidate = generateUsername(roleName);
          attempts++;
        }
        if (!finalUsername) finalUsername = `usr_${Date.now().toString().slice(-6)}`;
      } else {
        // Verify custom username is unique
        const [uExists]: any = await conn.query('SELECT id FROM users WHERE username = ?', [finalUsername]);
        if (uExists.length > 0) {
          await conn.rollback();
          res.status(400).json({ success: false, message: 'ชื่อผู้ใช้งาน (Username) นี้มีอยู่ในระบบแล้ว' });
          return;
        }
      }

      const generatedPassword = custom_password?.trim() || generateSecurePassword();
      const passwordHash = await bcrypt.hash(generatedPassword, 12);
      const employeeCode = `EMP-${Date.now().toString().slice(-4)}`;

      // Insert User: Enforce must_change_password = 1 and password_changed_at = NULL (Requires first-login password reset)
      const [result]: any = await conn.query(
        `INSERT INTO users (
          username, password_hash, full_name, display_name, employee_code,
          role_id, phone, citizen_id, agency_affiliation,
          active, status, must_change_password, password_changed_at,
          created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'ACTIVE', 1, NULL, ?)`,
        [
          finalUsername,
          passwordHash,
          full_name,
          full_name,
          employeeCode,
          role_id,
          cleanPhone,
          cleanCitizenId,
          agency_affiliation,
          (req as any).user?.id || 1,
        ]
      );

      const newUserId = result.insertId;

      // Audit Log
      await logAudit(conn, req, 'CREATE_USER', String(newUserId), {
        username: finalUsername,
        full_name,
        role: roleName,
        citizen_id: cleanCitizenId,
        phone: cleanPhone,
        agency_affiliation,
        must_change_password: true,
      });

      await conn.commit();

      res.status(201).json({
        success: true,
        message: 'สร้างผู้ใช้งานใหม่สำเร็จ (ระบบได้ Gen Username และ Password ชั่วคราวให้แล้ว)',
        data: {
          id: newUserId,
          username: finalUsername,
          temporary_password: generatedPassword, // Sent to Admin to pass to new user
          full_name,
          role: roleName,
          citizen_id: cleanCitizenId,
          phone: cleanPhone,
          agency_affiliation,
          must_change_password: true,
        },
      });
    } catch (error: any) {
      if (conn) await conn.rollback();
      console.error('Error creating user:', error);
      res.status(500).json({ success: false, message: error.message });
    } finally {
      if (conn) conn.release();
    }
  }

  /**
   * Reset user password (Auto-generates new temporary password and sets must_change_password = 1)
   */
  static async resetPassword(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    let conn: any;
    try {
      conn = await pool.getConnection();
      await conn.beginTransaction();

      const [users]: any = await conn.query('SELECT * FROM users WHERE id = ?', [id]);
      if (users.length === 0) {
        await conn.rollback();
        res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้งาน' });
        return;
      }
      const targetUser = users[0];

      const newTempPassword = generateSecurePassword();
      const passwordHash = await bcrypt.hash(newTempPassword, 12);

      await conn.query(
        `UPDATE users SET 
          password_hash = ?, 
          must_change_password = 1, 
          password_changed_at = NULL,
          failed_login_attempts = 0,
          locked_until = NULL
         WHERE id = ?`,
        [passwordHash, id]
      );

      // Revoke all active sessions for this user
      await conn.query(
        "UPDATE sessions SET revoked_at = UTC_TIMESTAMP(), revocation_reason = 'ADMIN_RESET' WHERE user_id = ? AND revoked_at IS NULL",
        [id]
      );

      await logAudit(conn, req, 'RESET_PASSWORD', String(id), {
        target_username: targetUser.username,
        reset_by: (req as any).user?.username || 'ADMIN',
      });

      await conn.commit();

      res.json({
        success: true,
        message: 'รีเซ็ตรหัสผ่านสำเร็จ ระบบได้สร้างรหัสผ่านชั่วคราวใหม่เรียบร้อยแล้ว',
        data: {
          username: targetUser.username,
          temporary_password: newTempPassword,
          must_change_password: true,
        },
      });
    } catch (error: any) {
      if (conn) await conn.rollback();
      console.error('Error resetting password:', error);
      res.status(500).json({ success: false, message: error.message });
    } finally {
      if (conn) conn.release();
    }
  }

  /**
   * Update User Information
   */
  static async updateUser(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const { full_name, role_id, phone, citizen_id, agency_affiliation, active, status } = req.body;

    let conn: any;
    try {
      conn = await pool.getConnection();
      await conn.beginTransaction();

      const [users]: any = await conn.query('SELECT * FROM users WHERE id = ?', [id]);
      if (users.length === 0) {
        await conn.rollback();
        res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้งาน' });
        return;
      }

      const updates: string[] = [];
      const values: any[] = [];

      if (full_name) {
        updates.push('full_name = ?', 'display_name = ?');
        values.push(full_name, full_name);
      }
      if (role_id) {
        updates.push('role_id = ?');
        values.push(role_id);
      }
      if (phone) {
        updates.push('phone = ?');
        values.push(phone.replace(/[\s-]/g, ''));
      }
      if (citizen_id) {
        const cleanCid = citizen_id.replace(/[\s-]/g, '');
        updates.push('citizen_id = ?');
        values.push(cleanCid);
      }
      if (agency_affiliation) {
        updates.push('agency_affiliation = ?');
        values.push(agency_affiliation);
      }
      if (typeof active === 'boolean') {
        updates.push('active = ?');
        values.push(active ? 1 : 0);
      }
      if (status) {
        updates.push('status = ?');
        values.push(status);
      }

      if (updates.length > 0) {
        values.push(id);
        await conn.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
        await logAudit(conn, req, 'UPDATE_USER', String(id), { updates: req.body });
      }

      await conn.commit();
      res.json({ success: true, message: 'อัปเดตข้อมูลผู้ใช้งานสำเร็จ' });
    } catch (error: any) {
      if (conn) await conn.rollback();
      console.error('Error updating user:', error);
      res.status(500).json({ success: false, message: error.message });
    } finally {
      if (conn) conn.release();
    }
  }

  /**
   * Toggle Active / Inactive Status
   */
  static async toggleStatus(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    let conn: any;
    try {
      conn = await pool.getConnection();
      await conn.beginTransaction();

      const [users]: any = await conn.query('SELECT active, status, username FROM users WHERE id = ?', [id]);
      if (users.length === 0) {
        await conn.rollback();
        res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้งาน' });
        return;
      }

      const nextActive = users[0].active ? 0 : 1;
      const nextStatus = nextActive ? 'ACTIVE' : 'INACTIVE';

      await conn.query('UPDATE users SET active = ?, status = ? WHERE id = ?', [nextActive, nextStatus, id]);

      if (!nextActive) {
        // If deactivated, revoke sessions
        await conn.query(
          "UPDATE sessions SET revoked_at = UTC_TIMESTAMP(), revocation_reason = 'USER_DEACTIVATED' WHERE user_id = ? AND revoked_at IS NULL",
          [id]
        );
      }

      await logAudit(conn, req, 'TOGGLE_USER_STATUS', String(id), {
        target_username: users[0].username,
        active: nextActive,
        status: nextStatus,
      });

      await conn.commit();
      res.json({
        success: true,
        message: nextActive ? 'เปิดใช้งานบัญชีแล้ว' : 'ระงับการใช้งานบัญชีแล้ว',
        active: Boolean(nextActive),
        status: nextStatus,
      });
    } catch (error: any) {
      if (conn) await conn.rollback();
      console.error('Error toggling status:', error);
      res.status(500).json({ success: false, message: error.message });
    } finally {
      if (conn) conn.release();
    }
  }
}
