import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../index';
import { pool } from '../db/connection';

describe('PDH Smart EMS API & Geospatial Intelligence Tests', () => {
  const agent = request.agent(app);
  beforeAll(async () => {
    const res = await agent.post('/api/auth/login').set('X-PDH-Request','1').send({username:'admin',password:'admin1234'});
    expect(res.status).toBe(200);
  });
  afterAll(async () => {
    await pool.end();
  });

  it('GET /api/health returns status UP with database connected', async () => {
    const res = await agent.get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('UP');
    expect(res.body.database).toBe('CONNECTED');
  });

  it('GET /api/map/vehicles returns vehicle markers with freshness calculation and stopped detection', async () => {
    const res = await agent.get('/api/map/vehicles');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);

    const firstVehicle = res.body.data[0];
    expect(firstVehicle).toHaveProperty('vehicle_code');
    expect(firstVehicle).toHaveProperty('status');
    expect(firstVehicle).toHaveProperty('current_speed');
    expect(firstVehicle).toHaveProperty('tracking_health');
    expect(firstVehicle).toHaveProperty('is_stopped');
    expect(firstVehicle).toHaveProperty('seconds_since_last_gps');
  });

  it('GET /api/map/facilities returns hospital master map entries with numerical coordinates', async () => {
    const res = await agent.get('/api/map/facilities');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);

    const pdh = res.body.data.find((f: any) => f.facility_code === 'PDH');
    expect(pdh).toBeDefined();
    expect(typeof pdh.latitude).toBe('number');
    expect(pdh.latitude).toBeCloseTo(13.693822, 4);
    expect(pdh.longitude).toBeCloseTo(99.851921, 4);
  });

  it('GET /api/map/bases returns EMS bases with numerical coordinates', async () => {
    const res = await agent.get('/api/map/bases');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(typeof res.body.data[0].latitude).toBe('number');
    expect(res.body.data[0]).toHaveProperty('geofence_radius');
  });

  it('POST /api/auth/login validates credentials correctly', async () => {
    // Valid login
    const validRes = await request(app)
      .post('/api/auth/login').set('X-PDH-Request', '1')
      .send({ username: 'admin', password: 'admin1234' });
    expect(validRes.status).toBe(200);
    expect(validRes.body.success).toBe(true);
    expect(validRes.body).not.toHaveProperty('token');
    expect(validRes.headers['set-cookie'][0]).toContain('HttpOnly');
    expect(validRes.body.user.role).toBe('SUPER_ADMIN');

    // Invalid login
    const invalidRes = await request(app)
      .post('/api/auth/login').set('X-PDH-Request', '1')
      .send({ username: 'admin', password: 'wrongpassword' });
    expect(invalidRes.status).toBe(401);
    expect(invalidRes.body.success).toBe(false);
  });

  // Phase MAP-2 Tests:
  it('GET /api/map/mission/1/track returns recorded GPS track with distance validation (Phase MAP-2)', async () => {
    const res = await agent.get('/api/map/mission/1/track');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.mission_no).toBe('REF-2026-000124');
    expect(res.body.points_count).toBeGreaterThan(0);
    expect(res.body).toHaveProperty('raw_distance_km');
    expect(res.body).toHaveProperty('validated_distance_km');
    expect(res.body.validated_distance_km).toBeGreaterThan(0);
    expect(Array.isArray(res.body.track_points)).toBe(true);

    const firstPt = res.body.track_points[0];
    expect(typeof firstPt.latitude).toBe('number');
    expect(typeof firstPt.longitude).toBe('number');
    expect(firstPt).toHaveProperty('speed');
    expect(firstPt).toHaveProperty('recorded_at');
  });

  it('GET /api/map/tracking-health returns fleet health breakdown (Phase MAP-2)', async () => {
    const res = await agent.get('/api/map/tracking-health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('total_vehicles');
    expect(res.body.data).toHaveProperty('online_moving');
    expect(res.body.data).toHaveProperty('online_stopped');
    expect(res.body.data).toHaveProperty('tracking_delayed');
    expect(res.body.data).toHaveProperty('tracking_lost');
  });

  it('POST /api/map/gps/batch accepts batch telematics sync (Phase MAP-2)', async () => {
    const testBatch = {
      vehicle_id: 1,
      mission_id: null,
      points: [
        {
          latitude: 13.694000,
          longitude: 99.852000,
          speed: 15.0,
          heading: 90.0,
          accuracy: 5.0,
          gps_quality: 'GOOD',
          recorded_at: new Date().toISOString(),
        },
      ],
    };

    const res = await agent.post('/api/map/gps/batch').set('X-PDH-Request','1').send(testBatch);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.inserted).toBeGreaterThanOrEqual(1);
  });
});
