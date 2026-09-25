import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../index';

describe('Phase MAP-4 & MAP-5: Smart Dispatch & Nearest Ambulance Tests', () => {
  let authToken: string;

  beforeAll(async () => {
    const res = await request(app).post('/api/auth/login').send({
      username: 'admin',
      password: 'admin1234',
    });
    expect(res.status).toBe(200);
    authToken = res.body.token;
  });

  it('1. Recommends nearest ambulances based on road distance (1.35x) and GPS freshness', async () => {
    // Target scene near Photharam Hospital (13.7000, 99.8500)
    const res = await request(app)
      .post('/api/dispatch/nearest-ambulances')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        latitude: 13.7000,
        longitude: 99.8500,
        urgency: 'CRITICAL',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.candidates)).toBe(true);
    expect(res.body.candidates.length).toBeGreaterThan(0);

    const first = res.body.candidates[0];
    // Road distance must be greater than or equal to straight-line distance
    expect(first.estimated_road_distance_km).toBeGreaterThanOrEqual(first.straight_line_distance_km);
    expect(first.estimated_travel_minutes).toBeGreaterThan(0);
    expect(first.suitability_score).toBeDefined();

    // Check disclaimer for Dispatcher authority (Section 21)
    expect(res.body.disclaimer).toContain('Dispatcher');
  });

  it('2. Disqualifies or penalizes vehicles with lost GPS or busy status', async () => {
    const res = await request(app)
      .post('/api/dispatch/nearest-ambulances')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        latitude: 13.7000,
        longitude: 99.8500,
      });

    const candidates = res.body.candidates;
    // Find EMS-05 (which has TRACKING_LOST in seed)
    const lostVeh = candidates.find((c: any) => c.vehicle_code === 'EMS-05');
    if (lostVeh) {
      expect(lostVeh.is_eligible).toBe(false);
      expect(lostVeh.reason).toBeDefined();
    }
  });

  it('3. Performs 1-Click Quick Emergency Dispatch (Section 14)', async () => {
    const res = await request(app)
      .post('/api/dispatch/quick-emergency')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        sceneLatitude: 13.7050,
        sceneLongitude: 99.8420,
        sceneDescription: 'อุบัติเหตุรถยนต์ชนเสาไฟ ทางแยกคลองตาคต',
        vehicleId: 1,
        driverId: 1,
        urgency: 'CRITICAL',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.missionNo).toMatch(/^EMS-\d{4}-\d{6}$/);
    expect(res.body.data.status).toBe('EN_ROUTE');

    // Clean up: complete the emergency mission to reset vehicle 1 to AVAILABLE
    await request(app)
      .post(`/api/missions/${res.body.data.missionId}/complete`)
      .set('Authorization', `Bearer ${authToken}`);
  });
});
