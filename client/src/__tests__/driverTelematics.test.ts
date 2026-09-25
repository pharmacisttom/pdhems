import { describe, it, expect, vi, beforeEach } from 'vitest';
import { audioAlertService } from '../services/audioAlertService';
import { gpsTrackingEngine } from '../services/gpsTrackingEngine';

describe('Driver Telematics & Safety Tests (Phase 4 & 5)', () => {
  const store: Record<string, string> = {};

  beforeEach(() => {
    (globalThis as any).localStorage = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, val: string) => {
        store[key] = val;
      },
      clear: () => {
        for (const k in store) delete store[k];
      },
    };
    (globalThis as any).localStorage.clear();
  });

  it('1. AudioAlertService mute toggle functions properly', () => {
    audioAlertService.setMuted(true);
    expect(audioAlertService.getMuted()).toBe(true);

    audioAlertService.setMuted(false);
    expect(audioAlertService.getMuted()).toBe(false);
  });

  it('2. GpsTrackingEngine enqueues manual position in offline queue', () => {
    gpsTrackingEngine.setMissionContext(1, 1);
    gpsTrackingEngine.injectManualPosition(13.693822, 99.851921, 65.5, 90);

    const queue = gpsTrackingEngine.getQueue();
    expect(queue.length).toBeGreaterThan(0);
    const last = queue[queue.length - 1];
    expect(last.speed).toBe(65.5);
    expect(last.latitude).toBe(13.693822);
    expect(last.longitude).toBe(99.851921);
    expect(last.gps_quality).toBe('GOOD');
    expect(last.sync_status).toBe('PENDING');
  });

  it('3. Speed safety validates speed thresholds and triggers alerts appropriately', () => {
    const playWarningSpy = vi.spyOn(audioAlertService, 'playSpeedWarning');
    const startAlarmSpy = vi.spyOn(audioAlertService, 'startCriticalAlarm');

    // Single sample spike should NOT trigger alarm immediately (Section 9: Multiple samples required)
    gpsTrackingEngine.injectManualPosition(13.693822, 99.851921, 115, 90);
    expect(startAlarmSpy).not.toHaveBeenCalled();

    // After consecutive samples exceeding critical threshold, alarm should trigger
    gpsTrackingEngine.injectManualPosition(13.693822, 99.851921, 115, 90);
    gpsTrackingEngine.injectManualPosition(13.693822, 99.851921, 115, 90);
    expect(startAlarmSpy).toHaveBeenCalled();

    // Speed returns to normal (< 90 km/h) -> alarm stops
    const stopAlarmSpy = vi.spyOn(audioAlertService, 'stopCriticalAlarm');
    gpsTrackingEngine.injectManualPosition(13.693822, 99.851921, 60, 90);
    expect(stopAlarmSpy).toHaveBeenCalled();
  });
});
