import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchEmsKpis, fetchTripSummary, fetchSpatialDensity } from '../services/api';

describe('Phase 9 & MAP-7: Client Reports, KPIs and Spatial Density Services', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    globalThis.localStorage = {
      getItem: vi.fn().mockReturnValue('mock-token'),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn(),
    };
  });

  it('1. fetchEmsKpis successfully parses the 8 standard EMS metrics', async () => {
    const mockKpiResponse = {
      success: true,
      timeframe: 'all',
      missionType: 'ALL',
      summary: { totalMissions: 10, completedCount: 8, activeCount: 2, emergencyCount: 5, referCount: 5 },
      kpis: {
        t1_call_to_dispatch: { name: 'เวลารับแจ้งถึงสั่งการ', code: 'T1', avgMinutes: 1.1, benchmarkMinutes: 1.5, unit: 'นาที', samples: 8 },
        t2_turnout_time: { name: 'เวลาเตรียมพร้อมออก', code: 'T2', avgMinutes: 1.7, benchmarkMinutes: 2.0, complianceRatePercent: 87.5, unit: 'นาที', samples: 8 },
        t3_response_time: { name: 'เวลาตอบสนองถึงที่เกิดเหตุ', code: 'T3', avgMinutes: 6.8, benchmarkMinutes: 8.0, complianceRatePercent: 80.0, unit: 'นาที', samples: 5 },
        t4_onscene_time: { name: 'เวลาปฏิบัติการ ณ จุดเกิดเหตุ', code: 'T4', avgMinutes: 12.3, benchmarkMinutes: 15.0, complianceRatePercent: 100.0, unit: 'นาที', samples: 5 },
        t5_transport_time: { name: 'เวลาเดินทางส่งต่อ', code: 'T5', avgMinutes: 14.5, unit: 'นาที', samples: 8 },
        t6_handover_time: { name: 'เวลาส่งมอบปลายทาง', code: 'T6', avgMinutes: 8.5, benchmarkMinutes: 15.0, complianceRatePercent: 100.0, unit: 'นาที', samples: 8 },
        t7_return_time: { name: 'เวลาเดินทางกลับฐาน', code: 'T7', avgMinutes: 16.0, unit: 'นาที', samples: 8 },
        t8_total_cycle_time: { name: 'ระยะเวลาภารกิจรวมทั้งสิ้น', code: 'T8', avgMinutes: 60.9, unit: 'นาที', samples: 8 },
      },
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockKpiResponse,
    });

    const result = await fetchEmsKpis('all', 'ALL');
    expect(result.success).toBe(true);
    expect(result.kpis.t2_turnout_time.complianceRatePercent).toBe(87.5);
    expect(result.kpis.t3_response_time.avgMinutes).toBe(6.8);
    expect(result.kpis.t3_response_time.benchmarkMinutes).toBe(8.0);
  });

  it('2. fetchTripSummary retrieves trips with distance, duration and speed violations', async () => {
    const mockTripResponse = {
      success: true,
      total: 1,
      trips: [
        {
          id: 1,
          missionNo: 'EMS-2026-000001',
          missionType: 'EMERGENCY',
          status: 'COMPLETED',
          vehicleCode: 'EMS-01',
          registrationNo: 'นข-1101',
          driverName: 'สมชาย ใจดี',
          origin: 'รพ.โพธาราม',
          destination: 'สี่แยกบ้านเลือก',
          durationMinutes: 45,
          distanceKm: 12.5,
          maxSpeedKmh: 94.5,
          speedWarningsCount: 2,
          speedCriticalsCount: 0,
          offlineSyncCount: 1,
          pretripPassed: true,
        },
      ],
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockTripResponse,
    });

    const result = await fetchTripSummary({ limit: 10 });
    expect(result.success).toBe(true);
    expect(result.trips.length).toBe(1);
    expect(result.trips[0].speedWarningsCount).toBe(2);
    expect(result.trips[0].distanceKm).toBe(12.5);
  });

  it('3. fetchSpatialDensity retrieves clusters and refer corridors', async () => {
    const mockSpatial = {
      success: true,
      totalIncidents: 4,
      hotspots: [
        {
          latitude: 13.7124,
          longitude: 99.8451,
          count: 3,
          intensity: 1.0,
          riskLevel: 'CRITICAL',
          avgResponseMinutes: 6.5,
          label: 'แยกบ้านเลือก',
        },
      ],
      referCorridors: [
        {
          originName: 'รพ.โพธาราม',
          destinationName: 'รพ.ศูนย์ราชบุรี',
          transferCount: 5,
          avgTransportMinutes: 26.5,
        },
      ],
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockSpatial,
    });

    const result = await fetchSpatialDensity('all');
    expect(result.success).toBe(true);
    expect(result.hotspots[0].riskLevel).toBe('CRITICAL');
    expect(result.referCorridors[0].transferCount).toBe(5);
  });
});
