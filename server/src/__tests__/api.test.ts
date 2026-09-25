import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../index';
import { pool } from '../db/connection';

describe('PDH Smart EMS API & Geospatial Intelligence Tests', () => {
  afterAll(async () => {
    await pool.end();
  });

  it('GET /api/health returns status UP with database connected', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('UP');
    expect(res.body.database).toBe('CONNECTED');
  });

  it('GET /api/map/vehicles returns vehicle markers with freshness calculation', async () => {
    const res = await request(app).get('/api/map/vehicles');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);

    const firstVehicle = res.body.data[0];
    expect(firstVehicle).toHaveProperty('vehicle_code');
    expect(firstVehicle).toHaveProperty('status');
    expect(firstVehicle).toHaveProperty('current_speed');
    expect(firstVehicle).toHaveProperty('tracking_health');
    expect(firstVehicle).toHaveProperty('seconds_since_last_gps');
  });

  it('GET /api/map/facilities returns hospital master map entries', async () => {
    const res = await request(app).get('/api/map/facilities');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);

    const pdh = res.body.data.find((f: any) => f.facility_code === 'PDH');
    expect(pdh).toBeDefined();
    expect(pdh.latitude).toBeCloseTo(13.693822, 4);
    expect(pdh.longitude).toBeCloseTo(99.851921, 4);
  });

  it('GET /api/map/bases returns EMS bases', async () => {
    const res = await request(app).get('/api/map/bases');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0]).toHaveProperty('geofence_radius');
  });

  it('POST /api/auth/login validates credentials correctly', async () => {
    // Valid login
    const validRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin1234' });
    expect(validRes.status).toBe(200);
    expect(validRes.body.success).toBe(true);
    expect(validRes.body).toHaveProperty('token');
    expect(validRes.body.user.role).toBe('SUPER_ADMIN');

    // Invalid login
    const invalidRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'wrongpassword' });
    expect(invalidRes.status).toBe(401);
    expect(invalidRes.body.success).toBe(false);
  });
});
