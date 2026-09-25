/**
 * PDH Smart EMS - GPS Tracking & Offline Telematics Engine
 * Handles high-frequency GPS collection, offline queuing, batch synchronization,
 * and speed safety validation.
 */

import { audioAlertService } from './audioAlertService';

export interface TelemetryPoint {
  id?: string;
  recorded_at: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number | null;
  accuracy: number;
  gps_quality: 'GOOD' | 'FAIR' | 'POOR' | 'INVALID';
  sync_status: 'PENDING' | 'SYNCED' | 'FAILED';
}

class GpsTrackingEngine {
  private missionId: number | null = null;
  private vehicleId: number | null = null;
  private isTracking: boolean = false;
  private watchId: number | null = null;
  private syncTimer: any = null;
  private queueKey = 'pdh_ems_gps_queue';

  // Speed safety monitor
  private consecutiveSpeedViolations: number = 0;
  private readonly SPEED_WARNING_THRESHOLD = 90; // km/h
  private readonly SPEED_CRITICAL_THRESHOLD = 110; // km/h
  private readonly VIOLATION_SAMPLES_REQUIRED = 3; // Section 9: Multiple samples required

  // Listeners
  private listeners: Array<(point: TelemetryPoint, queueLength: number) => void> = [];

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('🌐 Network restored. Syncing offline GPS queue...');
        this.flushQueue();
      });
    }
  }

  public setMissionContext(missionId: number | null, vehicleId: number | null) {
    this.missionId = missionId;
    this.vehicleId = vehicleId;
  }

  public subscribe(listener: (point: TelemetryPoint, queueLength: number) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(point: TelemetryPoint) {
    const queue = this.getQueue();
    this.listeners.forEach((l) => l(point, queue.length));
  }

  public getQueue(): TelemetryPoint[] {
    if (typeof globalThis.localStorage === 'undefined') return [];
    try {
      const data = globalThis.localStorage.getItem(this.queueKey);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private saveQueue(queue: TelemetryPoint[]) {
    if (typeof globalThis.localStorage === 'undefined') return;
    try {
      globalThis.localStorage.setItem(this.queueKey, JSON.stringify(queue.slice(-500))); // Keep last 500
    } catch (e) {
      console.warn('Failed to save GPS queue to localStorage:', e);
    }
  }

  /**
   * Start tracking GPS
   */
  public startTracking(missionId: number, vehicleId: number) {
    this.setMissionContext(missionId, vehicleId);
    if (this.isTracking) return;
    this.isTracking = true;

    // Start sync timer (every 10 seconds batch sync)
    this.syncTimer = setInterval(() => {
      this.flushQueue();
    }, 10000);

    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      this.watchId = navigator.geolocation.watchPosition(
        (pos) => this.handlePosition(pos),
        (err) => {
          console.warn('Geolocation error:', err.message);
          this.handleSimulatedPosition();
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 3000,
        }
      );
    } else {
      this.handleSimulatedPosition();
    }
  }

  public stopTracking() {
    this.isTracking = false;
    if (this.watchId !== null && typeof navigator !== 'undefined') {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
    audioAlertService.stopCriticalAlarm();
    this.flushQueue();
  }

  /**
   * Handle incoming raw browser position
   */
  public handlePosition(pos: GeolocationPosition) {
    const coords = pos.coords;
    const speedKmh = coords.speed !== null && !isNaN(coords.speed) ? Math.max(0, coords.speed * 3.6) : 0;
    const accuracy = coords.accuracy || 10;

    let quality: 'GOOD' | 'FAIR' | 'POOR' | 'INVALID' = 'GOOD';
    if (accuracy > 100) quality = 'INVALID';
    else if (accuracy > 40) quality = 'POOR';
    else if (accuracy > 20) quality = 'FAIR';

    const point: TelemetryPoint = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      recorded_at: new Date(pos.timestamp).toISOString().slice(0, 19).replace('T', ' '),
      latitude: Number(coords.latitude.toFixed(7)),
      longitude: Number(coords.longitude.toFixed(7)),
      speed: Number(speedKmh.toFixed(1)),
      heading: coords.heading !== null && !isNaN(coords.heading) ? Number(coords.heading.toFixed(1)) : null,
      accuracy: Number(accuracy.toFixed(1)),
      gps_quality: quality,
      sync_status: 'PENDING',
    };

    this.processSpeedSafety(point.speed);
    this.enqueuePoint(point);
  }

  /**
   * Manual position injection (used for In-Cab speed simulation / test)
   */
  public injectManualPosition(latitude: number, longitude: number, speed: number, heading: number = 0) {
    const point: TelemetryPoint = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      recorded_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
      latitude: Number(latitude.toFixed(7)),
      longitude: Number(longitude.toFixed(7)),
      speed: Number(speed.toFixed(1)),
      heading: Number(heading.toFixed(1)),
      accuracy: 5.0,
      gps_quality: 'GOOD',
      sync_status: 'PENDING',
    };

    this.processSpeedSafety(point.speed);
    this.enqueuePoint(point);
  }

  private handleSimulatedPosition() {
    // Default fallback to Photharam hospital area
    this.injectManualPosition(13.693822, 99.851921, 0, 45);
  }

  /**
   * Speed safety validation (Section 9: Multiple samples required, no single-point false violation)
   */
  private processSpeedSafety(speed: number) {
    if (speed >= this.SPEED_CRITICAL_THRESHOLD) {
      this.consecutiveSpeedViolations++;
      if (this.consecutiveSpeedViolations >= this.VIOLATION_SAMPLES_REQUIRED) {
        audioAlertService.startCriticalAlarm();
      }
    } else if (speed >= this.SPEED_WARNING_THRESHOLD) {
      this.consecutiveSpeedViolations++;
      audioAlertService.stopCriticalAlarm();
      if (this.consecutiveSpeedViolations >= 2) {
        audioAlertService.playSpeedWarning();
      }
    } else {
      this.consecutiveSpeedViolations = 0;
      audioAlertService.stopCriticalAlarm();
    }
  }

  private enqueuePoint(point: TelemetryPoint) {
    const queue = this.getQueue();
    queue.push(point);
    this.saveQueue(queue);
    this.notify(point);
  }

  /**
   * Batch synchronization to backend
   */
  public async flushQueue(): Promise<boolean> {
    if (!this.vehicleId) return false;
    const queue = this.getQueue();
    if (queue.length === 0) return true;

    const token = localStorage.getItem('token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const payload = {
      missionId: this.missionId,
      vehicleId: this.vehicleId,
      points: queue.map((p) => ({
        recorded_at: p.recorded_at,
        latitude: p.latitude,
        longitude: p.longitude,
        speed: p.speed,
        heading: p.heading,
        accuracy: p.accuracy,
        gps_quality: p.gps_quality,
      })),
    };

    try {
      const res = await fetch('/api/map/gps/batch', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        // Clear synced items
        this.saveQueue([]);
        if (queue.length > 0) {
          const last = queue[queue.length - 1];
          this.notify({ ...last, sync_status: 'SYNCED' });
        }
        return true;
      } else {
        return false;
      }
    } catch (err) {
      console.warn('Batch GPS upload failed, staying in offline queue:', err);
      return false;
    }
  }
}

export const gpsTrackingEngine = new GpsTrackingEngine();
