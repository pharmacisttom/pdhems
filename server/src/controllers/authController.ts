import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { pool } from '../db/connection';
import {
  authError,
  clearSessionCookie,
  digest,
  randomToken,
  sessionToken,
  setSessionCookie,
  setting,
  navigation,
} from '../utils/session';

const LoginSchema = z.object({
  username: z.string().trim().min(1).max(50),
  password: z.string().min(1).max(72),
  remember: z.boolean().optional(),
});

const dummyHash = bcrypt.hashSync('constant-work-for-unknown-account', 12);

async function audit(conn: any, req: Request, action: string, user?: any, details?: any) {
  try {
    await conn.query(
      `INSERT INTO audit_logs (user_id, user_name, action, entity, entity_id, details, ip_address, user_agent)
       VALUES (?, ?, ?, 'users', ?, ?, ?, ?)`,
      [
        user?.id ?? null,
        user?.username ?? 'UNKNOWN',
        action,
        user?.id ? String(user.id) : null,
        details ? JSON.stringify(details) : null,
        req.ip ?? '',
        (req.get('user-agent') ?? '').slice(0, 255),
      ]
    );
  } catch (e) {
    console.error('Audit write error:', e);
  }
}

export class AuthController {
  static async login(req: Request, res: Response): Promise<void> {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success || Buffer.byteLength(parsed.data.password, 'utf8') > 72) {
      authError(res, 400, 'INVALID_INPUT', 'กรุณากรอกรหัสผู้ใช้งานและรหัสผ่าน');
      return;
    }
    let conn: any;
    try {
      conn = await pool.getConnection();
      await conn.beginTransaction();

      const bucket = digest(req.ip ?? 'unknown');
      await conn.query(
        `INSERT INTO auth_rate_limits (bucket, attempts, window_started) VALUES (?, 1, UTC_TIMESTAMP()) 
         ON DUPLICATE KEY UPDATE
           attempts = IF(window_started < DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? SECOND), 1, attempts + 1),
           window_started = IF(window_started < DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? SECOND), UTC_TIMESTAMP(), window_started)`,
        [bucket, setting('LOGIN_RATE_WINDOW', 900), setting('LOGIN_RATE_WINDOW', 900)]
      );

      const [rate]: any = await conn.query('SELECT attempts FROM auth_rate_limits WHERE bucket = ?', [bucket]);
      if (rate[0].attempts > setting('LOGIN_RATE_LIMIT', 30)) {
        await audit(conn, req, 'RATE_LIMIT_TRIGGERED');
        await conn.commit();
        res.setHeader('Retry-After', String(setting('LOGIN_RATE_WINDOW', 900)));
        authError(res, 429, 'RATE_LIMITED', 'มีคำขอมากเกินไป กรุณารอสักครู่');
        return;
      }

      const [rows]: any = await conn.query(
        `SELECT u.*, r.name AS role 
         FROM users u 
         JOIN roles r ON r.id = u.role_id
         WHERE u.username = ? OR u.employee_code = ? FOR UPDATE`,
        [parsed.data.username, parsed.data.username]
      );

      const user = rows.length === 1 ? rows[0] : undefined;
      const valid = await bcrypt.compare(parsed.data.password, user?.password_hash ?? dummyHash);
      const locked = user?.locked_until && new Date(user.locked_until).getTime() > Date.now();

      if (!user || !valid || !user.active || user.status !== 'ACTIVE' || locked) {
        if (user && !locked && user.active && user.status === 'ACTIVE') {
          const failures = (user.locked_until ? 0 : user.failed_login_attempts) + 1;
          await conn.query(
            'UPDATE users SET failed_login_attempts = ?, locked_until = IF(? >= ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? SECOND), NULL) WHERE id = ?',
            [failures, failures, setting('MAX_FAILED_LOGIN', 5), setting('LOCK_DURATION', 900), user.id]
          );
        }
        await audit(conn, req, 'LOGIN_FAILED', user);
        await conn.commit();
        authError(res, 401, 'INVALID_CREDENTIALS', 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง หรือบัญชีไม่พร้อมใช้งาน');
        return;
      }

      const old = sessionToken(req);
      if (old) {
        await conn.query(
          "UPDATE sessions SET revoked_at = UTC_TIMESTAMP(), revocation_reason = 'RELOGIN' WHERE token_hash = ? AND revoked_at IS NULL",
          [digest(old)]
        );
      }

      const token = randomToken();
      const sid = randomToken();
      await conn.query(
        `INSERT INTO sessions (user_id, session_id, token_hash, ip_address, user_agent, created_at, last_activity_at, expires_at)
         VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP(), DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? SECOND))`,
        [
          user.id,
          sid,
          digest(token),
          req.ip ?? '',
          (req.get('user-agent') ?? '').slice(0, 255),
          setting('SESSION_MAX_LIFETIME', 43200),
        ]
      );

      await conn.query(
        'UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login_at = UTC_TIMESTAMP(), last_login_ip = ? WHERE id = ?',
        [req.ip ?? '', user.id]
      );

      // Password Age & 90-Day (3 months) Expiration Check
      const now = Date.now();
      const changedTime = user.password_changed_at ? new Date(user.password_changed_at).getTime() : 0;
      const passwordAgeDays = changedTime ? Math.floor((now - changedTime) / (1000 * 60 * 60 * 24)) : 999;
      const isPasswordExpired = !changedTime || passwordAgeDays >= 90;
      const effectiveMustChange = Boolean(user.must_change_password || isPasswordExpired);

      await audit(conn, req, 'LOGIN_SUCCESS', user);
      await conn.commit();

      setSessionCookie(res, token, parsed.data.remember);

      res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          full_name: user.full_name,
          role: user.role,
          navigation: navigation(user.role),
          employee_code: user.employee_code,
          status: user.status,
          phone: user.phone,
          citizen_id: user.citizen_id,
          agency_affiliation: user.agency_affiliation,
          must_change_password: effectiveMustChange,
          password_expired: isPasswordExpired,
          password_age_days: passwordAgeDays,
          password_days_remaining: Math.max(0, 90 - passwordAgeDays),
        },
      });
    } catch {
      if (conn) await conn.rollback();
      authError(res, 503, 'AUTH_UNAVAILABLE', 'ระบบยืนยันตัวตนไม่พร้อม กรุณาลองอีกครั้ง');
    } finally {
      conn?.release();
    }
  }

  static async getProfile(req: Request, res: Response): Promise<void> {
    const user = req.user!;
    res.json({
      success: true,
      user: {
        ...user,
        navigation: navigation(user.role),
      },
    });
  }

  static async logout(req: Request, res: Response): Promise<void> {
    await AuthController.revoke(req, res, false);
  }

  static async logoutAll(req: Request, res: Response): Promise<void> {
    await AuthController.revoke(req, res, true);
  }

  private static async revoke(req: Request, res: Response, all: boolean): Promise<void> {
    let conn: any;
    try {
      conn = await pool.getConnection();
      await conn.beginTransaction();
      await conn.query(
        `UPDATE sessions SET revoked_at = UTC_TIMESTAMP(), revocation_reason = 'LOGOUT' WHERE ${
          all ? 'user_id' : 'session_id'
        } = ? AND revoked_at IS NULL`,
        [all ? req.user!.id : req.sessionId]
      );
      await audit(conn, req, all ? 'LOGOUT_ALL' : 'LOGOUT', req.user);
      await conn.commit();
      clearSessionCookie(res);
      res.json({ success: true });
    } catch {
      if (conn) await conn.rollback();
      authError(res, 503, 'LOGOUT_FAILED', 'ยังออกจากระบบไม่สำเร็จ กรุณาลองอีกครั้ง');
    } finally {
      conn?.release();
    }
  }

  /**
   * First Login Verification & Password Setup
   * Requires: 13-digit Thai Citizen ID + Registered Phone + Temporary Password + New Password
   */
  static async verifyFirstLogin(req: Request, res: Response): Promise<void> {
    const { citizen_id, phone, currentPassword, newPassword } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      authError(res, 401, 'UNAUTHENTICATED', 'กรุณาเข้าสู่ระบบด้วยรหัสชั่วคราวก่อนดำเนินการ');
      return;
    }

    if (!citizen_id || !phone || !currentPassword || !newPassword) {
      authError(
        res,
        400,
        'INVALID_INPUT',
        'กรุณากรอกข้อมูลให้ครบถ้วน: เลขบัตรประชาชน 13 หลัก, เบอร์โทรศัพท์, รหัสผ่านเดิม และรหัสผ่านใหม่'
      );
      return;
    }

    const cleanInputCid = String(citizen_id).replace(/[\s-]/g, '');
    const cleanInputPhone = String(phone).replace(/[\s-]/g, '');

    if (newPassword.length < 8 || Buffer.byteLength(newPassword) > 72 || currentPassword === newPassword) {
      authError(
        res,
        400,
        'INVALID_PASSWORD',
        'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 8 ตัวอักษร และต้องไม่ซ้ำกับรหัสผ่านเดิม'
      );
      return;
    }

    let conn: any;
    try {
      conn = await pool.getConnection();
      await conn.beginTransaction();

      const [rows]: any = await conn.query(
        'SELECT id, username, password_hash, citizen_id, phone FROM users WHERE id = ? FOR UPDATE',
        [userId]
      );

      if (rows.length === 0) {
        await conn.rollback();
        authError(res, 404, 'USER_NOT_FOUND', 'ไม่พบข้อมูลผู้ใช้งาน');
        return;
      }

      const user = rows[0];

      // 1. Verify Temporary Password
      const validPass = await bcrypt.compare(currentPassword, user.password_hash);
      if (!validPass) {
        await conn.rollback();
        authError(res, 400, 'INVALID_PASSWORD', 'รหัสผ่านปัจจุบันไม่ถูกต้อง');
        return;
      }

      // 2. Verify 13-digit Thai Citizen ID
      const userCid = String(user.citizen_id || '').replace(/[\s-]/g, '');
      if (userCid && userCid !== cleanInputCid) {
        await conn.rollback();
        authError(res, 400, 'IDENTITY_MISMATCH', 'เลขประจำตัวประชาชน 13 หลักไม่ตรงกับข้อมูลที่ลงทะเบียนไว้');
        return;
      }

      // 3. Verify Phone Number
      const userPhone = String(user.phone || '').replace(/[\s-]/g, '');
      if (userPhone && userPhone !== cleanInputPhone) {
        await conn.rollback();
        authError(res, 400, 'IDENTITY_MISMATCH', 'เบอร์โทรศัพท์ไม่ตรงกับข้อมูลที่ลงทะเบียนไว้');
        return;
      }

      // 4. Update Password, Reset must_change_password, and Set password_changed_at = NOW()
      const newHash = await bcrypt.hash(newPassword, 12);
      await conn.query(
        `UPDATE users SET 
          password_hash = ?, 
          citizen_id = COALESCE(NULLIF(citizen_id, ''), ?),
          phone = COALESCE(NULLIF(phone, ''), ?),
          must_change_password = 0, 
          password_changed_at = UTC_TIMESTAMP() 
         WHERE id = ?`,
        [newHash, cleanInputCid, cleanInputPhone, userId]
      );

      // Security Audit & Security Event Logging
      await conn.query(
        `INSERT INTO security_events (user_id, username_attempt, event_type, ip_address, user_agent, details)
         VALUES (?, ?, 'PASSWORD_CHANGED', ?, ?, ?)`,
        [
          userId,
          user.username,
          req.ip ?? '',
          (req.get('user-agent') ?? '').slice(0, 255),
          JSON.stringify({ reason: 'FIRST_LOGIN_IDENTITY_VERIFIED', citizen_id_verified: true, phone_verified: true }),
        ]
      );

      await audit(conn, req, 'FIRST_LOGIN_IDENTITY_VERIFIED', user, {
        citizen_id_verified: true,
        phone_verified: true,
      });

      await conn.commit();

      res.json({
        success: true,
        message: 'ยืนยันตัวตนและตั้งรหัสผ่านใหม่เรียบร้อยแล้ว สามารถเริ่มเข้าใช้งานระบบได้ทันที',
      });
    } catch (err: any) {
      if (conn) await conn.rollback();
      console.error('Error verifying first login:', err);
      authError(res, 503, 'AUTH_UNAVAILABLE', 'ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      conn?.release();
    }
  }

  static async changePassword(req: Request, res: Response): Promise<void> {
    const { currentPassword, newPassword } = req.body;
    if (
      typeof currentPassword !== 'string' ||
      typeof newPassword !== 'string' ||
      newPassword.length < 8 ||
      Buffer.byteLength(newPassword) > 72 ||
      Buffer.byteLength(currentPassword) > 72 ||
      currentPassword === newPassword
    ) {
      authError(
        res,
        400,
        'INVALID_PASSWORD',
        'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 8 ตัวอักษร และต้องไม่ตรงกับรหัสเดิม'
      );
      return;
    }
    let conn: any;
    try {
      const bucket = digest(`password-change:${req.user!.id}`);
      await pool.query(
        `INSERT INTO auth_rate_limits (bucket, attempts, window_started) VALUES (?, 1, UTC_TIMESTAMP()) 
         ON DUPLICATE KEY UPDATE
           attempts = IF(window_started < DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? SECOND), 1, attempts + 1),
           window_started = IF(window_started < DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? SECOND), UTC_TIMESTAMP(), window_started)`,
        [bucket, setting('LOGIN_RATE_WINDOW', 900), setting('LOGIN_RATE_WINDOW', 900)]
      );
      const [rate]: any = await pool.query('SELECT attempts FROM auth_rate_limits WHERE bucket = ?', [bucket]);
      if (rate[0].attempts > setting('MAX_FAILED_LOGIN', 5)) {
        authError(res, 429, 'RATE_LIMITED', 'กรุณารอสักครู่ก่อนลองอีกครั้ง');
        return;
      }
      conn = await pool.getConnection();
      await conn.beginTransaction();
      const [rows]: any = await conn.query('SELECT password_hash FROM users WHERE id = ? FOR UPDATE', [
        req.user!.id,
      ]);
      if (!(await bcrypt.compare(currentPassword, rows[0].password_hash))) {
        await conn.rollback();
        authError(res, 400, 'INVALID_PASSWORD', 'รหัสผ่านปัจจุบันไม่ถูกต้อง');
        return;
      }
      await conn.query(
        'UPDATE users SET password_hash = ?, must_change_password = 0, password_changed_at = UTC_TIMESTAMP() WHERE id = ?',
        [await bcrypt.hash(newPassword, 12), req.user!.id]
      );
      await conn.query(
        "UPDATE sessions SET revoked_at = UTC_TIMESTAMP(), revocation_reason = 'PASSWORD_CHANGED' WHERE user_id = ? AND revoked_at IS NULL",
        [req.user!.id]
      );
      await audit(conn, req, 'PASSWORD_CHANGED', req.user);
      await conn.commit();
      clearSessionCookie(res);
      res.json({ success: true, message: 'เปลี่ยนรหัสผ่านสำเร็จ กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่' });
    } catch {
      if (conn) await conn.rollback();
      authError(res, 503, 'AUTH_UNAVAILABLE', 'ไม่สามารถเปลี่ยนรหัสผ่านได้');
    } finally {
      conn?.release();
    }
  }
}
