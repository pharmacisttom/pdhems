import { Request, Response, NextFunction } from 'express';
import { pool } from '../db/connection';
import { authError, clearSessionCookie, digest, sessionToken, setting } from '../utils/session';

export interface AuthUser {
  id: number;
  username: string;
  full_name: string;
  role: string;
  employee_code?: string;
  status?: string;
  must_change_password?: boolean;
  password_changed_at?: string | null;
  citizen_id?: string | null;
  phone?: string | null;
  agency_affiliation?: string | null;
  password_expired?: boolean;
  password_age_days?: number;
  password_days_remaining?: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      sessionId?: string;
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  if (req.user) return next();
  res.setHeader('Cache-Control', 'no-store');
  const token = sessionToken(req);
  if (!token) return authError(res, 401, 'UNAUTHENTICATED', 'กรุณาเข้าสู่ระบบ');
  try {
    const [rows]: any = await pool.query(
      `SELECT s.session_id, u.id, u.username, u.full_name, u.employee_code,
        u.status, u.must_change_password, u.password_changed_at, u.citizen_id, u.phone, u.agency_affiliation, u.last_login_at, r.name AS role
        FROM sessions s JOIN users u ON u.id=s.user_id JOIN roles r ON r.id=u.role_id
        WHERE s.token_hash=? AND s.revoked_at IS NULL AND s.expires_at>UTC_TIMESTAMP()
        AND s.last_activity_at>DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? SECOND)
        AND u.active=1 AND u.status='ACTIVE' AND (u.locked_until IS NULL OR u.locked_until<=UTC_TIMESTAMP())`,
      [digest(token), setting('SESSION_IDLE_TIMEOUT', 1800)]
    );
    if (!rows.length) {
      clearSessionCookie(res);
      return authError(res, 401, 'SESSION_EXPIRED', 'เซสชันสิ้นสุด กรุณาเข้าสู่ระบบอีกครั้ง หากอยู่ระหว่างภารกิจให้ติดต่อศูนย์สั่งการ');
    }
    const { session_id, ...user } = rows[0];

    // Password Age calculation & 90-Day (3 months) Expiration Policy
    const now = Date.now();
    const changedTime = user.password_changed_at ? new Date(user.password_changed_at).getTime() : 0;
    const passwordAgeDays = changedTime ? Math.floor((now - changedTime) / (1000 * 60 * 60 * 24)) : 999;
    const isPasswordExpired = !changedTime || passwordAgeDays >= 90;
    const effectiveMustChange = Boolean(user.must_change_password || isPasswordExpired);

    user.must_change_password = effectiveMustChange;
    user.password_expired = isPasswordExpired;
    user.password_age_days = passwordAgeDays;
    user.password_days_remaining = Math.max(0, 90 - passwordAgeDays);

    req.user = user;
    req.sessionId = session_id;

    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.headers['x-pdh-request'] !== '1')
      return authError(res, 403, 'CSRF_REJECTED', 'คำขอไม่ถูกต้อง');

    const allowedWhenMustChange = [
      '/api/auth/me',
      '/api/auth/change-password',
      '/api/auth/verify-first-login',
      '/api/auth/logout',
      '/api/auth/logout-all',
    ];
    const path = req.originalUrl.split('?')[0];

    if (effectiveMustChange && !allowedWhenMustChange.includes(path))
      return authError(res, 403, 'PASSWORD_CHANGE_REQUIRED', 'กรุณาเปลี่ยนรหัสผ่านก่อนใช้งาน (หรือรหัสผ่านหมดอายุ 90 วัน)');

    await pool.query('UPDATE sessions SET last_activity_at=UTC_TIMESTAMP() WHERE session_id=? AND revoked_at IS NULL', [session_id]);
    next();
  } catch {
    return authError(res, 503, 'AUTH_UNAVAILABLE', 'ระบบยืนยันตัวตนไม่พร้อม กรุณาลองอีกครั้งหรือติดต่อศูนย์สั่งการ');
  }
}

export function authorizeRoles(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return authError(res, 401, 'UNAUTHENTICATED', 'กรุณาเข้าสู่ระบบ');
    if (req.user.role === 'SUPER_ADMIN' || allowedRoles.includes(req.user.role)) return next();
    return authError(res, 403, 'FORBIDDEN', 'คุณไม่มีสิทธิ์ดำเนินการ');
  };
}
