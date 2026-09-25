import { beforeAll, beforeEach, afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../index';
import { pool } from '../db/connection';
import { digest } from '../utils/session';

const login = (username='admin',password='admin1234') => request(app).post('/api/auth/login').set('X-PDH-Request','1').send({username,password});
const cookie = (res: any) => res.headers['set-cookie'][0].split(';')[0];
const me = (value:string) => request(app).get('/api/auth/me').set('Cookie',value);
const post = (path:string,value:string) => request(app).post(path).set('Cookie',value).set('X-PDH-Request','1');
describe('AUTH-1 real database security and lifecycle',()=>{
  beforeAll(()=>{ if(!process.env.DB_NAME?.startsWith('pdh_auth1_test_')) throw new Error('Dedicated test database required'); });
  beforeEach(async()=>{
    await pool.query('DELETE FROM auth_rate_limits');
    await pool.query("UPDATE users SET active=1,status='ACTIVE',locked_until=NULL,failed_login_attempts=0,must_change_password=0 WHERE username IN ('admin','driver1')");
    process.env.MAX_FAILED_LOGIN='5'; process.env.LOGIN_RATE_LIMIT='30';
  });
  afterAll(async()=>{await pool.end();});
  it('issues HttpOnly SameSite cookie, stores only digest, excludes secrets and rotates sessions',async()=>{
    const first=await login(); expect(first.status).toBe(200);
    expect(first.body.token).toBeUndefined(); expect(first.body.user.password_hash).toBeUndefined();
    expect(first.headers['set-cookie'][0]).toContain('HttpOnly'); expect(first.headers['set-cookie'][0]).toContain('SameSite=Strict');
    expect(first.headers['cache-control']).toBe('no-store');
    const raw=cookie(first).split('=')[1];
    const [rows]:any=await pool.query('SELECT token_hash FROM sessions WHERE token_hash=?',[digest(raw)]); expect(rows).toHaveLength(1); expect(rows[0].token_hash).not.toBe(raw);
    const second=await request(app).post('/api/auth/login').set('X-PDH-Request','1').set('Cookie',cookie(first)).send({username:'admin',password:'admin1234'});
    expect(second.status).toBe(200); expect(cookie(second)).not.toBe(cookie(first)); expect((await me(cookie(first))).status).toBe(401);
  });
  it('employee code login and uniform unknown/wrong/inactive/locked/suspended failure',async()=>{
    await pool.query("UPDATE users SET employee_code='TEST-DRIVER' WHERE username='driver1'");
    expect((await login('TEST-DRIVER','ems1234')).body.user.username).toBe('driver1');
    const wrong=await login('admin','incorrect'); const unknown=await login('missing','incorrect'); expect(wrong.body).toEqual(unknown.body);
    for(const status of ['INACTIVE','LOCKED','SUSPENDED']) {await pool.query('UPDATE users SET status=? WHERE username=?',[status,'admin']); const res=await login(); expect(res.status).toBe(401); expect(res.body).toEqual(wrong.body);}
  });
  it('locks repeated failures and enforces persistent IP limit',async()=>{
    process.env.MAX_FAILED_LOGIN='2'; await login('admin','bad'); await login('admin','bad'); expect((await login()).status).toBe(401);
    await pool.query("UPDATE users SET locked_until=DATE_SUB(UTC_TIMESTAMP(),INTERVAL 1 SECOND) WHERE username='admin'");
    expect((await login()).status).toBe(200);
    process.env.LOGIN_RATE_LIMIT='4'; expect((await login('missing','bad')).status).toBe(429);
  });
  it('logout revokes stored session; switching admin to driver cannot reuse admin identity',async()=>{
    const a=cookie(await login()); expect((await me(a)).body.user.role).toBe('SUPER_ADMIN');
    const out=await post('/api/auth/logout',a); expect(out.status).toBe(200); expect(out.headers['set-cookie'][0]).toContain('Expires=Thu, 01 Jan 1970');
    expect((await me(a)).status).toBe(401);
    const d=cookie(await login('driver1','ems1234')); expect((await me(d)).body.user.role).toBe('DRIVER');
    expect((await post('/api/facilities',d).send({})).status).toBe(403);
    expect((await request(app).get('/api/map/vehicles')).status).toBe(401);
  });
  it('idle and absolute expiration, account disable, live role updates',async()=>{
    let c=cookie(await login());
    await pool.query('UPDATE sessions SET last_activity_at=DATE_SUB(UTC_TIMESTAMP(),INTERVAL 2 DAY) WHERE token_hash=?',[digest(c.split('=')[1])]); expect((await me(c)).status).toBe(401);
    c=cookie(await login()); await pool.query('UPDATE sessions SET expires_at=DATE_SUB(UTC_TIMESTAMP(),INTERVAL 1 SECOND) WHERE token_hash=?',[digest(c.split('=')[1])]); expect((await me(c)).status).toBe(401);
    c=cookie(await login()); await pool.query("UPDATE users SET active=0 WHERE username='admin'"); expect((await me(c)).status).toBe(401);
    const d=cookie(await login('driver1','ems1234'));
    await pool.query("UPDATE users SET role_id=(SELECT id FROM roles WHERE name='VIEWER') WHERE username='driver1'");
    try {expect((await me(d)).body.user.role).toBe('VIEWER');} finally {await pool.query("UPDATE users SET role_id=(SELECT id FROM roles WHERE name='DRIVER') WHERE username='driver1'");}
  });
  it('rejects CSRF, foreign origins, malformed cookies and old bearer tokens',async()=>{
    expect((await login("' OR 1=1 --",'bad')).status).toBe(401);
    expect((await request(app).post('/api/auth/login').send({username:'admin',password:'admin1234'})).status).toBe(403);
    expect((await request(app).post('/api/auth/login').set('X-PDH-Request','1').set('Origin','https://evil.example').send({username:'admin',password:'admin1234'})).status).toBe(403);
    expect((await me('pdh_session=%invalid')).status).toBe(401);
    expect((await request(app).get('/api/auth/me').set('Authorization','Bearer old-jwt')).status).toBe(401);
    const c=cookie(await login()); expect((await request(app).post('/api/auth/logout').set('Cookie',c)).status).toBe(403); expect((await me(c)).status).toBe(200);
  });
  it('persistent production cookie is Secure and password changes are rate limited',async()=>{
    const previous=process.env.NODE_ENV;
    process.env.NODE_ENV='production';
    try {
      const res=await request(app).post('/api/auth/login').set('X-PDH-Request','1').send({username:'admin',password:'admin1234',remember:true});
      expect(res.status).toBe(200); expect(res.headers['set-cookie'][0]).toContain('Secure'); expect(res.headers['set-cookie'][0]).toContain('Max-Age=');
    } finally {process.env.NODE_ENV=previous;}
    const c=cookie(await login()); process.env.MAX_FAILED_LOGIN='1';
    expect((await post('/api/auth/change-password',c).send({currentPassword:'incorrect',newPassword:'new-test-password-2026'})).status).toBe(400);
    expect((await post('/api/auth/change-password',c).send({currentPassword:'incorrect',newPassword:'new-test-password-2026'})).status).toBe(429);
  });
  it('logout all revokes both devices and records audit without credentials',async()=>{
    const a=cookie(await login()), b=cookie(await login()); expect((await post('/api/auth/logout-all',a)).status).toBe(200);
    expect((await me(a)).status).toBe(401); expect((await me(b)).status).toBe(401);
    const [rows]:any=await pool.query("SELECT action,details FROM audit_logs WHERE action IN ('LOGIN_SUCCESS','LOGIN_FAILED','LOGOUT','LOGOUT_ALL')");
    expect(rows.length).toBeGreaterThan(0); expect(JSON.stringify(rows)).not.toMatch(/admin1234|ems1234|password_hash|pdh_session/);
  });
  it('enforces must-change and password change revokes every existing device',async()=>{
    const a=cookie(await login()), b=cookie(await login());
    const [rows]:any=await pool.query("SELECT password_hash FROM users WHERE username='admin'");
    await pool.query("UPDATE users SET must_change_password=1 WHERE username='admin'");
    expect((await request(app).get('/api/map/vehicles').set('Cookie',a)).status).toBe(403);
    expect((await me(a)).status).toBe(200);
    try {
      const res=await post('/api/auth/change-password',a).send({currentPassword:'admin1234',newPassword:'a-new-test-password-2026'}); expect(res.status).toBe(200);
      expect((await me(a)).status).toBe(401); expect((await me(b)).status).toBe(401);
      expect((await login('admin','a-new-test-password-2026')).status).toBe(200);
    } finally {await pool.query("UPDATE users SET password_hash=?,must_change_password=0 WHERE username='admin'",[rows[0].password_hash]);}
  });
});
