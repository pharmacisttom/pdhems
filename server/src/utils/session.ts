import { createHash, randomBytes } from 'crypto';
import { Request, Response } from 'express';

export const cookieName = 'pdh_session';
export const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export const randomToken = () => randomBytes(32).toString('hex');
export function setting(name: string, fallback: number): number {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isSafeInteger(value) || value < 1) throw new Error(`Invalid configuration: ${name}`);
  return value;
}
export function sessionToken(req: Request): string | undefined {
  const value = req.headers.cookie?.split(';').map(v => v.trim()).find(v => v.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
  return value && /^[a-f0-9]{64}$/.test(value) ? value : undefined;
}
export function setSessionCookie(res: Response, token: string, remember = false) {
  res.cookie(cookieName, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/',
    ...(remember ? { maxAge: setting('SESSION_MAX_LIFETIME', 43200) * 1000 } : {}) });
}
export function clearSessionCookie(res: Response) {
  res.clearCookie(cookieName, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/' });
}
export function authError(res: Response, status: number, code: string, message: string) {
  return res.status(status).json({ success: false, error: { code, message }, message });
}

// Transitional navigation for the existing single-role model; not an authorization boundary.
// AUTH-2 replaces this projection with database permissions.
export function navigation(role: string): string[] {
  if (role === 'DRIVER') return ['driver'];
  if (role === 'EMS_STAFF') return ['missions'];
  if (role === 'VIEWER') return ['map'];
  if (['SUPER_ADMIN', 'EMS_ADMIN'].includes(role)) return ['map','missions','driver','facilities','bases','reports'];
  return ['map','missions','reports'];
}
