import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../index';

describe('Phase 2 & 3: Mission Workflow & Handover Tests', () => {
  let authToken: string;
  let testMissionId: number;

  beforeAll(async () => {
    // Login to obtain test token
    const res = await request(app).post('/api/auth/login').send({
      username: 'admin',
      password: 'admin1234',
    });
    expect(res.status).toBe(200);
    authToken = res.body.token;
  });

  it('1. Fetches available resources for assignment', async () => {
    const res = await request(app)
      .get('/api/missions/resources/available')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.availableVehicles)).toBe(true);
    expect(Array.isArray(res.body.data.availableDrivers)).toBe(true);
    expect(Array.isArray(res.body.data.availableStaff)).toBe(true);
  });

  it('2. Creates a new Refer Mission', async () => {
    const res = await request(app)
      .post('/api/missions/refer')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        originFacilityId: 1, // PDH
        destinationFacilityId: 2, // Ratchaburi Hospital
        notes: 'Test urgent transfer',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('CREATED');
    expect(res.body.data.missionNo).toMatch(/^REF-\d{4}-\d{6}$/);

    testMissionId = res.body.data.id;
  });

  it('3. Assigns Vehicle, Driver, and Crew with conflict verification', async () => {
    // Conflict verification: Try to assign Staff ID 2 who is already on active mission 1
    const resStaffConflict = await request(app)
      .post(`/api/missions/${testMissionId}/assign`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        vehicleId: 1,
        driverId: 1,
        crew: [{ staffId: 2, role: 'NURSE', isTeamLeader: false }],
      });
    expect(resStaffConflict.status).toBe(409);
    expect(resStaffConflict.body.message).toContain('Conflict');

    // Valid assignment with free staff (Staff 1 - Doctor Anan)
    const res = await request(app)
      .post(`/api/missions/${testMissionId}/assign`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        vehicleId: 1,
        driverId: 1,
        crew: [{ staffId: 1, role: 'DOCTOR', isTeamLeader: true }],
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Conflict verification: Try to assign the same vehicle (vehicle 1) to another new mission
    const resCreateSecond = await request(app)
      .post('/api/missions/refer')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ originFacilityId: 1, destinationFacilityId: 3 });
    const secondMissionId = resCreateSecond.body.data.id;

    const resConflict = await request(app)
      .post(`/api/missions/${secondMissionId}/assign`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ vehicleId: 1, driverId: 4 });

    expect(resConflict.status).toBe(409);
    expect(resConflict.body.message).toContain('Conflict');
  });

  it('4. Blocks normal departure if readiness checklist is incomplete', async () => {
    const res = await request(app)
      .post(`/api/missions/${testMissionId}/depart`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ isEmergencyOverride: false });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.missingRequirements).toBeDefined();
  });

  it('5. Confirms driver and crew readiness', async () => {
    // Confirm Driver
    const resDriver = await request(app)
      .post(`/api/missions/${testMissionId}/confirm-readiness`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ confirmedBy: 'DRIVER' });
    expect(resDriver.status).toBe(200);

    // Confirm Crew
    const resCrew = await request(app)
      .post(`/api/missions/${testMissionId}/confirm-readiness`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ confirmedBy: 'CREW' });
    expect(resCrew.status).toBe(200);
    expect(resCrew.body.data.newStatus).toBe('CREW_CONFIRMED');
  });

  it('6. Submits Pre-trip Checklist and reaches READY status', async () => {
    const res = await request(app)
      .post(`/api/missions/${testMissionId}/pretrip`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        fuelLevel: 'FULL',
        oxygenLevelPsi: 2000,
        medicalEquipmentReady: true,
        lightsSirenWorking: true,
        tiresBrakesChecked: true,
        communicationDeviceReady: true,
        dashcamGpsReady: true,
        notes: 'Vehicle inspected and verified',
      });

    expect(res.status).toBe(201);
    expect(res.body.isPassed).toBe(true);

    // Check mission status is now READY
    const missionRes = await request(app)
      .get(`/api/missions/${testMissionId}`)
      .set('Authorization', `Bearer ${authToken}`);
    expect(missionRes.body.data.status).toBe('READY');
    expect(missionRes.body.data.pretrip_checklist).not.toBeNull();
  });

  it('7. Departs mission normally into EN_ROUTE', async () => {
    const res = await request(app)
      .post(`/api/missions/${testMissionId}/depart`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ isEmergencyOverride: false });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('EN_ROUTE');
  });

  it('8. Marks mission as ARRIVED at destination facility', async () => {
    const res = await request(app)
      .post(`/api/missions/${testMissionId}/arrived`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ARRIVED');
  });

  it('9. Handover requires destination receiver name (Section 12 Human Confirmation)', async () => {
    // Attempt without receiver name
    const failRes = await request(app)
      .post(`/api/missions/${testMissionId}/handover`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ receiverName: '' });

    expect(failRes.status).toBe(400);

    // Provide receiver name
    const passRes = await request(app)
      .post(`/api/missions/${testMissionId}/handover`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        receiverName: 'พว.สุดาพร พยาบาลวิชาชีพ ER รพ.ศูนย์ราชบุรี',
        notes: 'Handover vitals stable, medical summary delivered.',
      });

    expect(passRes.status).toBe(200);
    expect(passRes.body.status).toBe('HANDOVER_COMPLETED');
  });

  it('10. Starts return trip to base while tracking remains active', async () => {
    const res = await request(app)
      .post(`/api/missions/${testMissionId}/start-return`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('RETURNING');
  });

  it('11. Completes mission at base and resets asset status to AVAILABLE', async () => {
    const res = await request(app)
      .post(`/api/missions/${testMissionId}/complete`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('COMPLETED');

    // Verify vehicle is released back to AVAILABLE
    const vehRes = await request(app)
      .get('/api/ambulances/1')
      .set('Authorization', `Bearer ${authToken}`);
    expect(vehRes.body.data.status).toBe('AVAILABLE');
  });
});
