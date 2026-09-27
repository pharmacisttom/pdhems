import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../index';
import { pool } from '../db/connection';

describe('User Management, 13-Digit Citizen ID Verification, 90-Day Password Policy & Expense Audit Logs', () => {
  const agent = request.agent(app);
  let adminTokenCookie: string;
  let createdUserId: number;
  let generatedUsername: string;
  let generatedPassword: string;
  const testCitizenId = '1219900998877';
  const testPhone = '089-999-8877';

  beforeAll(async () => {
    // Login as Admin
    const res = await agent
      .post('/api/auth/login')
      .set('X-PDH-Request', '1')
      .send({ username: 'admin', password: 'admin1234' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    adminTokenCookie = res.headers['set-cookie'][0];
  });

  afterAll(async () => {
    // Cleanup created test user and test expenses
    if (createdUserId) {
      await pool.query('DELETE FROM users WHERE id = ?', [createdUserId]);
    }
    await pool.query("DELETE FROM system_expenses WHERE expense_no LIKE 'EXP-TEST-%'");
    await pool.end();
  });

  it('1. GET /api/users/roles returns all defined EMS roles', async () => {
    const res = await agent.get('/api/users/roles').set('X-PDH-Request', '1');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    const roleNames = res.body.data.map((r: any) => r.name);
    expect(roleNames).toContain('SUPER_ADMIN');
    expect(roleNames).toContain('DRIVER');
  });

  it('2. POST /api/users creates a user with auto-generated username & password and requires 13-digit citizen ID', async () => {
    // Should fail without 13-digit citizen ID
    const failRes = await agent
      .post('/api/users')
      .set('X-PDH-Request', '1')
      .send({
        full_name: 'นายกู้ชีพ ทดสอบระบบ',
        role_id: 6, // DRIVER
        citizen_id: '12345', // Invalid length
        phone: testPhone,
      });
    expect(failRes.status).toBe(400);

    // Should succeed with valid 13-digit citizen ID
    const res = await agent
      .post('/api/users')
      .set('X-PDH-Request', '1')
      .send({
        full_name: 'นายกู้ชีพ ทดสอบระบบ',
        role_id: 6, // DRIVER
        citizen_id: testCitizenId,
        phone: testPhone,
        agency_affiliation: 'มูลนิธิกู้ภัยอำเภอปลวกแดง',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('temporary_password');
    expect(res.body.data).toHaveProperty('username');
    expect(res.body.data.must_change_password).toBe(true);

    createdUserId = res.body.data.id;
    generatedUsername = res.body.data.username;
    generatedPassword = res.body.data.temporary_password;

    expect(generatedPassword.length).toBeGreaterThanOrEqual(8);
  });

  it('3. GET /api/users lists users with masked citizen IDs and 90-day password expiration tracking', async () => {
    const res = await agent.get('/api/users').set('X-PDH-Request', '1');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const target = res.body.data.find((u: any) => u.id === createdUserId);
    expect(target).toBeDefined();
    expect(target.masked_citizen_id).toContain('XXXXX');
    expect(target.effective_must_change).toBe(true);
    expect(target).toHaveProperty('password_age_days');
    expect(target).toHaveProperty('days_until_expiration');
  });

  it('4. POST /api/auth/verify-first-login enforces citizen ID & phone verification on first login', async () => {
    // 4.1 Login as the newly created user using the generated temporary password
    const userAgent = request.agent(app);
    const loginRes = await userAgent
      .post('/api/auth/login')
      .set('X-PDH-Request', '1')
      .send({ username: generatedUsername, password: generatedPassword });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.user.must_change_password).toBe(true);

    // 4.2 Try to verify with wrong citizen ID -> must reject
    const wrongCidRes = await userAgent
      .post('/api/auth/verify-first-login')
      .set('X-PDH-Request', '1')
      .send({
        citizen_id: '9999999999999', // Mismatched
        phone: testPhone,
        currentPassword: generatedPassword,
        newPassword: 'MyNewSecurePass@2026',
      });
    expect(wrongCidRes.status).toBe(400);

    // 4.3 Verify with matching 13-digit citizen ID and phone -> must succeed
    const correctVerifyRes = await userAgent
      .post('/api/auth/verify-first-login')
      .set('X-PDH-Request', '1')
      .send({
        citizen_id: testCitizenId,
        phone: testPhone,
        currentPassword: generatedPassword,
        newPassword: 'MyNewSecurePass@2026',
      });

    expect(correctVerifyRes.status).toBe(200);
    expect(correctVerifyRes.body.success).toBe(true);

    // 4.4 Subsequent login with new password succeeds and must_change_password is now false
    const newLoginRes = await userAgent
      .post('/api/auth/login')
      .set('X-PDH-Request', '1')
      .send({ username: generatedUsername, password: 'MyNewSecurePass@2026' });

    expect(newLoginRes.status).toBe(200);
    expect(newLoginRes.body.user.must_change_password).toBe(false);
  });

  it('5. POST /api/expenses creates an expense and automatically logs it in audit_logs', async () => {
    const res = await agent
      .post('/api/expenses')
      .set('X-PDH-Request', '1')
      .send({
        category: 'FUEL',
        amount: 2500.0,
        title: 'ค่าน้ำมันดีเซล B7 ทดสอบระบบ EXP-TEST-001',
        vehicle_id: 1,
        invoice_no: 'INV-TEST-001',
        expense_date: '2026-09-26',
        notes: 'ทดสอบบันทึกค่าใช้จ่ายและ Audit Log',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.expense_no).toBeDefined();

    const createdExpenseNo = res.body.data.expense_no;

    // Check that audit_logs contains CREATE_EXPENSE for this expense
    const [auditRows]: any = await pool.query(
      "SELECT * FROM audit_logs WHERE action = 'CREATE_EXPENSE' AND details LIKE ? ORDER BY id DESC LIMIT 1",
      [`%${createdExpenseNo}%`]
    );

    expect(auditRows.length).toBe(1);
    expect(auditRows[0].user_name).toBe('admin');
  });

  it('6. GET /api/expenses and audit logs return aggregated data and filters', async () => {
    const res = await agent.get('/api/expenses?category=FUEL').set('X-PDH-Request', '1');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.summary).toBeDefined();
    expect(res.body.summary.fuel_total).toBeGreaterThan(0);

    const auditRes = await agent.get('/api/expenses/audit/logs').set('X-PDH-Request', '1');
    expect(auditRes.status).toBe(200);
    expect(auditRes.body.success).toBe(true);
    expect(auditRes.body.data.length).toBeGreaterThan(0);
  });
});
