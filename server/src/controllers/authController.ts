import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { pool } from '../db/connection';
import { authError, clearSessionCookie, digest, randomToken, sessionToken, setSessionCookie, setting, navigation } from '../utils/session';

const LoginSchema = z.object({ username: z.string().trim().min(1).max(50), password: z.string().min(1).max(72), remember: z.boolean().optional() });
const dummyHash = bcrypt.hashSync('constant-work-for-unknown-account', 12);
async function audit(conn: any, req: Request, action: string, user?: any) {
  await conn.query(`INSERT INTO audit_logs (user_id,user_name,action,entity,entity_id,details,ip_address,user_agent) VALUES (?,?,?,'users',?,NULL,?,?)`,
    [user?.id ?? null, user?.username ?? 'UNKNOWN', action, user?.id ? String(user.id) : null, req.ip ?? '', (req.get('user-agent') ?? '').slice(0,255)]);
}
export class AuthController {
  static async login(req: Request, res: Response): Promise<void> {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success || Buffer.byteLength(parsed.data.password, 'utf8') > 72) { authError(res,400,'INVALID_INPUT','กรุณากรอกรหัสผู้ใช้งานและรหัสผ่าน'); return; }
    let conn: any;
    try {
      conn = await pool.getConnection(); await conn.beginTransaction();
      const bucket = digest(req.ip ?? 'unknown');
      await conn.query(`INSERT INTO auth_rate_limits (bucket,attempts,window_started) VALUES (?,1,UTC_TIMESTAMP()) ON DUPLICATE KEY UPDATE
        attempts=IF(window_started<DATE_SUB(UTC_TIMESTAMP(),INTERVAL ? SECOND),1,attempts+1),
        window_started=IF(window_started<DATE_SUB(UTC_TIMESTAMP(),INTERVAL ? SECOND),UTC_TIMESTAMP(),window_started)`,
        [bucket,setting('LOGIN_RATE_WINDOW',900),setting('LOGIN_RATE_WINDOW',900)]);
      const [rate]: any = await conn.query('SELECT attempts FROM auth_rate_limits WHERE bucket=?', [bucket]);
      if (rate[0].attempts > setting('LOGIN_RATE_LIMIT',30)) {
        await audit(conn,req,'RATE_LIMIT_TRIGGERED'); await conn.commit();
        res.setHeader('Retry-After',String(setting('LOGIN_RATE_WINDOW',900)));
        authError(res,429,'RATE_LIMITED','มีคำขอมากเกินไป กรุณารอสักครู่'); return;
      }
      const [rows]: any = await conn.query(`SELECT u.*,r.name AS role FROM users u JOIN roles r ON r.id=u.role_id
        WHERE u.username=? OR u.employee_code=? FOR UPDATE`, [parsed.data.username,parsed.data.username]);
      // Ambiguous cross-namespace identifiers fail closed.
      const user = rows.length === 1 ? rows[0] : undefined;
      const valid = await bcrypt.compare(parsed.data.password,user?.password_hash ?? dummyHash);
      const locked = user?.locked_until && new Date(user.locked_until).getTime()>Date.now();
      if (!user || !valid || !user.active || user.status!=='ACTIVE' || locked) {
        if (user && !locked && user.active && user.status==='ACTIVE') {
          const failures = (user.locked_until ? 0 : user.failed_login_attempts) + 1;
          await conn.query('UPDATE users SET failed_login_attempts=?,locked_until=IF(? >= ?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL ? SECOND),NULL) WHERE id=?',
            [failures,failures,setting('MAX_FAILED_LOGIN',5),setting('LOCK_DURATION',900),user.id]);
        }
        await audit(conn,req,'LOGIN_FAILED',user); await conn.commit();
        authError(res,401,'INVALID_CREDENTIALS','ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง หรือบัญชีไม่พร้อมใช้งาน'); return;
      }
      const old = sessionToken(req);
      if (old) await conn.query("UPDATE sessions SET revoked_at=UTC_TIMESTAMP(),revocation_reason='RELOGIN' WHERE token_hash=? AND revoked_at IS NULL",[digest(old)]);
      const token=randomToken(), sid=randomToken();
      await conn.query(`INSERT INTO sessions (user_id,session_id,token_hash,ip_address,user_agent,created_at,last_activity_at,expires_at)
        VALUES (?,?,?,?,?,UTC_TIMESTAMP(),UTC_TIMESTAMP(),DATE_ADD(UTC_TIMESTAMP(),INTERVAL ? SECOND))`,
        [user.id,sid,digest(token),req.ip ?? '',(req.get('user-agent') ?? '').slice(0,255),setting('SESSION_MAX_LIFETIME',43200)]);
      await conn.query('UPDATE users SET failed_login_attempts=0,locked_until=NULL,last_login_at=UTC_TIMESTAMP(),last_login_ip=? WHERE id=?',[req.ip ?? '',user.id]);
      await audit(conn,req,'LOGIN_SUCCESS',user); await conn.commit();
      setSessionCookie(res,token,parsed.data.remember);
      res.json({success:true,user:{id:user.id,username:user.username,full_name:user.full_name,role:user.role,navigation:navigation(user.role),employee_code:user.employee_code,status:user.status,must_change_password:!!user.must_change_password}});
    } catch { if(conn) await conn.rollback(); authError(res,503,'AUTH_UNAVAILABLE','ระบบยืนยันตัวตนไม่พร้อม กรุณาลองอีกครั้ง'); }
    finally { conn?.release(); }
  }
  static async getProfile(req: Request,res: Response) { res.json({success:true,user:{...req.user,navigation:navigation(req.user!.role)}}); }
  static async logout(req: Request,res: Response) { await AuthController.revoke(req,res,false); }
  static async logoutAll(req: Request,res: Response) { await AuthController.revoke(req,res,true); }
  private static async revoke(req: Request,res: Response,all: boolean) {
    let conn: any;
    try {
      conn=await pool.getConnection(); await conn.beginTransaction();
      await conn.query(`UPDATE sessions SET revoked_at=UTC_TIMESTAMP(),revocation_reason='LOGOUT' WHERE ${all?'user_id':'session_id'}=? AND revoked_at IS NULL`,[all?req.user!.id:req.sessionId]);
      await audit(conn,req,all?'LOGOUT_ALL':'LOGOUT',req.user); await conn.commit();
      clearSessionCookie(res); res.json({success:true});
    } catch { if(conn) await conn.rollback(); authError(res,503,'LOGOUT_FAILED','ยังออกจากระบบไม่สำเร็จ กรุณาลองอีกครั้ง'); }
    finally { conn?.release(); }
  }
  static async changePassword(req: Request,res: Response) {
    const { currentPassword, newPassword }=req.body;
    if(typeof currentPassword!=='string' || typeof newPassword!=='string' || newPassword.length<setting('PASSWORD_MIN_LENGTH',12) || Buffer.byteLength(newPassword)>72 || Buffer.byteLength(currentPassword)>72 || currentPassword===newPassword) {
      authError(res,400,'INVALID_PASSWORD','รหัสผ่านใหม่ไม่ผ่านนโยบายความยาว หรือตรงกับรหัสเดิม'); return;
    }
    let conn:any;
    try {
      const bucket=digest(`password-change:${req.user!.id}`);
      await pool.query(`INSERT INTO auth_rate_limits (bucket,attempts,window_started) VALUES (?,1,UTC_TIMESTAMP()) ON DUPLICATE KEY UPDATE
        attempts=IF(window_started<DATE_SUB(UTC_TIMESTAMP(),INTERVAL ? SECOND),1,attempts+1),
        window_started=IF(window_started<DATE_SUB(UTC_TIMESTAMP(),INTERVAL ? SECOND),UTC_TIMESTAMP(),window_started)`,
        [bucket,setting('LOGIN_RATE_WINDOW',900),setting('LOGIN_RATE_WINDOW',900)]);
      const [rate]:any=await pool.query('SELECT attempts FROM auth_rate_limits WHERE bucket=?',[bucket]);
      if(rate[0].attempts>setting('MAX_FAILED_LOGIN',5)) { authError(res,429,'RATE_LIMITED','กรุณารอสักครู่ก่อนลองอีกครั้ง'); return; }
      conn=await pool.getConnection(); await conn.beginTransaction();
      const [rows]:any=await conn.query('SELECT password_hash FROM users WHERE id=? FOR UPDATE',[req.user!.id]);
      if(!await bcrypt.compare(currentPassword,rows[0].password_hash)) { await conn.rollback(); authError(res,400,'INVALID_PASSWORD','รหัสผ่านปัจจุบันไม่ถูกต้อง'); return; }
      await conn.query('UPDATE users SET password_hash=?,must_change_password=0,password_changed_at=UTC_TIMESTAMP() WHERE id=?',[await bcrypt.hash(newPassword,12),req.user!.id]);
      await conn.query("UPDATE sessions SET revoked_at=UTC_TIMESTAMP(),revocation_reason='PASSWORD_CHANGED' WHERE user_id=? AND revoked_at IS NULL",[req.user!.id]);
      await audit(conn,req,'PASSWORD_CHANGED',req.user); await conn.commit(); clearSessionCookie(res); res.json({success:true});
    } catch { if(conn) await conn.rollback(); authError(res,503,'AUTH_UNAVAILABLE','ไม่สามารถเปลี่ยนรหัสผ่านได้'); }
    finally { conn?.release(); }
  }
}
