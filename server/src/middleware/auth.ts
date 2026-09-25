import { Request, Response, NextFunction } from 'express';
import { pool } from '../db/connection';
import { authError, clearSessionCookie, digest, sessionToken, setting } from '../utils/session';

export interface AuthUser { id: number; username: string; full_name: string; role: string; employee_code?: string; status?: string; must_change_password?: boolean; }
declare global { namespace Express { interface Request { user?: AuthUser; sessionId?: string; } } }

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  if (req.user) return next();
  res.setHeader('Cache-Control', 'no-store');
  const token = sessionToken(req);
  if (!token) return authError(res, 401, 'UNAUTHENTICATED', 'กรุณาเข้าสู่ระบบ');
  try {
    const [rows]: any = await pool.query(`SELECT s.session_id, u.id, u.username, u.full_name, u.employee_code,
      u.status, u.must_change_password, u.last_login_at, r.name AS role
      FROM sessions s JOIN users u ON u.id=s.user_id JOIN roles r ON r.id=u.role_id
      WHERE s.token_hash=? AND s.revoked_at IS NULL AND s.expires_at>UTC_TIMESTAMP()
      AND s.last_activity_at>DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? SECOND)
      AND u.active=1 AND u.status='ACTIVE' AND (u.locked_until IS NULL OR u.locked_until<=UTC_TIMESTAMP())`,
      [digest(token), setting('SESSION_IDLE_TIMEOUT', 1800)]);
    if (!rows.length) {
      clearSessionCookie(res);
      return authError(res, 401, 'SESSION_EXPIRED', 'เซสชันสิ้นสุด กรุณาเข้าสู่ระบบอีกครั้ง หากอยู่ระหว่างภารกิจให้ติดต่อศูนย์สั่งการ');
    }
    const { session_id, ...user } = rows[0];
    req.user = user; req.sessionId = session_id;
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.headers['x-pdh-request'] !== '1')
      return authError(res, 403, 'CSRF_REJECTED', 'คำขอไม่ถูกต้อง');
    if (user.must_change_password && !['/api/auth/me', '/api/auth/change-password', '/api/auth/logout', '/api/auth/logout-all'].includes(req.originalUrl.split('?')[0]))
      return authError(res, 403, 'PASSWORD_CHANGE_REQUIRED', 'กรุณาเปลี่ยนรหัสผ่านก่อนใช้งาน');
    await pool.query('UPDATE sessions SET last_activity_at=UTC_TIMESTAMP() WHERE session_id=? AND revoked_at IS NULL', [session_id]);
    next();
  } catch { return authError(res, 503, 'AUTH_UNAVAILABLE', 'ระบบยืนยันตัวตนไม่พร้อม กรุณาลองอีกครั้งหรือติดต่อศูนย์สั่งการ'); }
}
export function authorizeRoles(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return authError(res, 401, 'UNAUTHENTICATED', 'กรุณาเข้าสู่ระบบ');
    if (req.user.role === 'SUPER_ADMIN' || allowedRoles.includes(req.user.role)) return next();
    return authError(res, 403, 'FORBIDDEN', 'คุณไม่มีสิทธิ์ดำเนินการ');
  };
}
