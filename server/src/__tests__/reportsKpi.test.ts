import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../index';

describe('Phase 9 & MAP-7: Reports, EMS KPIs and Spatial Analytics Tests', () => {
  let authToken: string;

  beforeAll(async () => {
    const res = await request(app).post('/api/auth/login').send({
      username: 'admin',
      password: 'admin1234',
    });
    expect(res.status).toBe(200);
    authToken = res.body.token;
  });

  it('1. Calculates all 8 EMS KPIs with benchmarks and compliance rates (Section 40)', async () => {
    const res = await request(app)
      .get('/api/reports/kpis?timeframe=all')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.summary).toBeDefined();
    expect(res.body.summary.completedCount).toBeGreaterThan(0);

    const { kpis } = res.body;
    expect(kpis.t1_call_to_dispatch).toBeDefined();
    expect(kpis.t2_turnout_time).toBeDefined();
    expect(kpis.t3_response_time).toBeDefined();
    expect(kpis.t4_onscene_time).toBeDefined();
    expect(kpis.t5_transport_time).toBeDefined();
    expect(kpis.t6_handover_time).toBeDefined();
    expect(kpis.t7_return_time).toBeDefined();
    expect(kpis.t8_total_cycle_time).toBeDefined();

    // Verify benchmarks
    expect(kpis.t2_turnout_time.benchmarkMinutes).toBe(2.0);
    expect(kpis.t3_response_time.benchmarkMinutes).toBe(8.0);
    expect(kpis.t4_onscene_time.benchmarkMinutes).toBe(15.0);
    expect(kpis.t6_handover_time.benchmarkMinutes).toBe(15.0);

    // Turnout compliance rate should be a valid percentage
    expect(kpis.t2_turnout_time.complianceRatePercent).toBeGreaterThanOrEqual(0);
    expect(kpis.t2_turnout_time.complianceRatePercent).toBeLessThanOrEqual(100);
  });

  it('2. Supports timeframe and missionType filtering for KPIs', async () => {
    const res = await request(app)
      .get('/api/reports/kpis?timeframe=30days&missionType=EMERGENCY')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.timeframe).toBe('30days');
    expect(res.body.missionType).toBe('EMERGENCY');
  });

  it('3. Generates Trip Summary Report with telematics stats & privacy compliance (Section 39)', async () => {
    const res = await request(app)
      .get('/api/reports/trip-summary?limit=10')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.trips)).toBe(true);
    expect(res.body.trips.length).toBeGreaterThan(0);

    const trip = res.body.trips[0];
    expect(trip.missionNo).toBeDefined();
    expect(trip.vehicleCode).toBeDefined();
    expect(trip.driverName).toBeDefined();
    expect(trip.origin).toBeDefined();
    expect(trip.destination).toBeDefined();
    expect(typeof trip.durationMinutes).toBe('number');
    expect(typeof trip.distanceKm).toBe('number');
    expect(typeof trip.speedWarningsCount).toBe('number');
    expect(typeof trip.speedCriticalsCount).toBe('number');
    expect(typeof trip.offlineSyncCount).toBe('number');

    // Strict healthcare privacy test: No HN, CID or patient medical diagnosis in telematics report
    const jsonStr = JSON.stringify(trip);
    expect(jsonStr).not.toContain('hn');
    expect(jsonStr).not.toContain('cid');
    expect(jsonStr).not.toContain('citizen_id');
    expect(jsonStr).not.toContain('diagnosis');
  });

  it('4. Aggregates Spatial Analytics, accident hotspots & frequent refer corridors (Section 23 MAP-7)', async () => {
    const res = await request(app)
      .get('/api/reports/spatial-density?timeframe=all')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.hotspots)).toBe(true);
    expect(res.body.hotspots.length).toBeGreaterThan(0);

    const hotspot = res.body.hotspots[0];
    expect(typeof hotspot.latitude).toBe('number');
    expect(typeof hotspot.longitude).toBe('number');
    expect(hotspot.count).toBeGreaterThan(0);
    expect(hotspot.intensity).toBeGreaterThanOrEqual(0);
    expect(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).toContain(hotspot.riskLevel);
    expect(hotspot.avgResponseMinutes).toBeGreaterThan(0);

    // Corridors check
    expect(Array.isArray(res.body.referCorridors)).toBe(true);
    expect(res.body.referCorridors.length).toBeGreaterThan(0);
    const corridor = res.body.referCorridors[0];
    expect(corridor.originName).toBeDefined();
    expect(corridor.destinationName).toBeDefined();
    expect(corridor.transferCount).toBeGreaterThan(0);
  });
});
