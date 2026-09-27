import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  fetchVehicles,
  fetchActiveMissions,
  departMission,
  markMissionArrived,
  confirmMissionHandover,
  startMissionReturn,
  completeMission,
} from '../services/api';
import { gpsTrackingEngine, TelemetryPoint } from '../services/gpsTrackingEngine';
import { audioAlertService } from '../services/audioAlertService';
import { wakeLockService } from '../services/wakeLockService';
import alertService from '../services/alertService';
import {
  Truck,
  MapPin,
  Volume2,
  VolumeX,
  Sun,
  ShieldAlert,
  Play,
  CheckCircle,
  RotateCcw,
  AlertTriangle,
  Radio,
  Wifi,
  WifiOff,
  Navigation,
  Compass,
  Flag,
  LocateFixed,
  Maximize2,
  Clock,
  Route,
  FastForward,
  Rewind,
  Layers,
} from 'lucide-react';

// Haversine distance in kilometers
function calculateHaversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Thailand Eastern Seaboard Road Circuity Factor (1.30x for Rayong/Pluak Daeng highways & curvature)
const ROAD_CIRCUITY = 1.30;

// Compass bearing calculation (degrees 0-360)
function calculateBearing(startLat: number, startLng: number, destLat: number, destLng: number): number {
  const startLatRad = (startLat * Math.PI) / 180;
  const startLngRad = (startLng * Math.PI) / 180;
  const destLatRad = (destLat * Math.PI) / 180;
  const destLngRad = (destLng * Math.PI) / 180;

  const y = Math.sin(destLngRad - startLngRad) * Math.cos(destLatRad);
  const x =
    Math.cos(startLatRad) * Math.sin(destLatRad) -
    Math.sin(startLatRad) * Math.cos(destLatRad) * Math.cos(destLngRad - startLngRad);
  let brng = (Math.atan2(y, x) * 180) / Math.PI;
  return Math.round((brng + 360) % 360);
}

// Camera tracking controller for Leaflet
const MapViewController: React.FC<{
  center: [number, number];
  autoFollow: boolean;
  bounds: L.LatLngBoundsExpression | null;
}> = ({ center, autoFollow, bounds }) => {
  const map = useMap();

  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [45, 45], maxZoom: 15 });
    } else if (autoFollow && center) {
      map.panTo(center, { animate: true, duration: 0.6 });
    }
  }, [center, autoFollow, bounds, map]);

  return null;
};

export const DriverCabPage: React.FC = () => {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [missions, setMissions] = useState<any[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number>(1);
  const [currentMission, setCurrentMission] = useState<any | null>(null);

  // Telemetry state
  const [currentPoint, setCurrentPoint] = useState<TelemetryPoint | null>(null);
  const [queueCount, setQueueCount] = useState<number>(0);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isWakeLocked, setIsWakeLocked] = useState<boolean>(false);
  const [sosActive, setSosActive] = useState<boolean>(false);

  // Manual speed simulator for driver/bench testing
  const [simSpeed, setSimSpeed] = useState<number>(0);
  // Simulated progress along journey (0.0 to 1.0)
  const [simProgress, setSimProgress] = useState<number>(0.35);

  // Map state
  const [autoFollow, setAutoFollow] = useState<boolean>(true);
  const [fitBoundsTrigger, setFitBoundsTrigger] = useState<L.LatLngBoundsExpression | null>(null);
  const [activeViewMode, setActiveViewMode] = useState<'split' | 'meter' | 'map'>('split');

  useEffect(() => {
    loadAssets();
    wakeLockService.requestLock().then((locked) => setIsWakeLocked(locked));

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOffline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Subscribe to telematics engine
    const unsubscribe = gpsTrackingEngine.subscribe((point, qLen) => {
      setCurrentPoint(point);
      setQueueCount(qLen);
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
      gpsTrackingEngine.stopTracking();
      wakeLockService.releaseLock();
    };
  }, []);

  const setIsOffline = (offline: boolean) => {
    setIsOnline(!offline);
  };

  useEffect(() => {
    if (selectedVehicleId && missions.length > 0) {
      const active = missions.find(
        (m) =>
          m.vehicle_id === selectedVehicleId &&
          !['COMPLETED', 'CANCELLED'].includes(m.status)
      );
      setCurrentMission(active || null);
      if (active) {
        gpsTrackingEngine.startTracking(active.id, selectedVehicleId);
        // Default initial progress based on status
        if (active.status === 'ARRIVED' || active.status === 'HANDOVER_COMPLETED') {
          setSimProgress(1.0);
        } else if (active.status === 'CREATED' || active.status === 'ASSIGNED') {
          setSimProgress(0.0);
        }
      } else {
        gpsTrackingEngine.setMissionContext(null, selectedVehicleId);
      }
    }
  }, [selectedVehicleId, missions]);

  const loadAssets = async () => {
    const [vehs, ms] = await Promise.all([fetchVehicles(), fetchActiveMissions()]);
    setVehicles(vehs);
    setMissions(ms);
  };

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    audioAlertService.setMuted(next);
  };

  const toggleWakeLock = async () => {
    if (isWakeLocked) {
      await wakeLockService.releaseLock();
      setIsWakeLocked(false);
    } else {
      const locked = await wakeLockService.requestLock();
      setIsWakeLocked(locked);
    }
  };

  // Coordinated Coordinates & Mission Waypoints
  const origLat = Number(currentMission?.origin_lat) || 12.9756;
  const origLng = Number(currentMission?.origin_lng) || 101.2155;
  const origName = currentMission?.origin_name || 'ศูนย์แม่ข่าย รพ.ปลวกแดง';

  const isEmergency = currentMission?.mission_type === 'EMERGENCY';
  const destLat = isEmergency
    ? Number(currentMission?.scene_latitude) || Number(currentMission?.destination_lat) || 12.9640
    : Number(currentMission?.destination_lat) || 12.6841;
  const destLng = isEmergency
    ? Number(currentMission?.scene_longitude) || Number(currentMission?.destination_lng) || 101.1520
    : Number(currentMission?.destination_lng) || 101.2818;
  const destName = isEmergency
    ? currentMission?.scene_description || currentMission?.destination_name || 'จุดเกิดเหตุฉุกเฉิน'
    : currentMission?.destination_name || 'โรงพยาบาลระยอง (ศูนย์ตติยภูมิ)';

  const isReturning = currentMission?.status === 'RETURNING';
  const startLat = isReturning ? destLat : origLat;
  const startLng = isReturning ? destLng : origLng;
  const startName = isReturning ? destName : origName;

  const targetLat = isReturning ? origLat : destLat;
  const targetLng = isReturning ? origLng : destLng;
  const targetName = isReturning ? origName : destName;

  // Vehicle Coordinates: Interpolate along start->target based on simProgress, or use GPS if hardware stream
  const vehLat = Number((startLat + (targetLat - startLat) * simProgress).toFixed(6));
  const vehLng = Number((startLng + (targetLng - startLng) * simProgress).toFixed(6));
  const defaultHeading = calculateBearing(startLat, startLng, targetLat, targetLng);

  // Speed injection for demonstration and testing
  const handleSpeedSlider = (speed: number) => {
    setSimSpeed(speed);
    audioAlertService.initAudio();
    gpsTrackingEngine.injectManualPosition(vehLat, vehLng, speed, defaultHeading);
  };

  // Step simulation forward/backward
  const stepSimulation = (delta: number) => {
    const nextProg = Math.max(0, Math.min(1, Number((simProgress + delta).toFixed(2))));
    setSimProgress(nextProg);
    const nextLat = Number((startLat + (targetLat - startLat) * nextProg).toFixed(6));
    const nextLng = Number((startLng + (targetLng - startLng) * nextProg).toFixed(6));
    gpsTrackingEngine.injectManualPosition(nextLat, nextLng, displaySpeed, defaultHeading);
    setAutoFollow(true);
  };

  // 1-Tap Quick Status Transitions
  const handleQuickDepart = async () => {
    if (!currentMission) return;
    const v = vehicles.find((x) => x.id === selectedVehicleId);

    if (displaySpeed === 0) {
      const confirmed = await alertService.confirmDeparture({
        vehicleCode: v?.vehicle_code || 'EMS',
        driverName: currentMission.driver_name || 'พนักงานขับรถประจำการ',
        crewCount: 3,
        destination: currentMission.destination_name || 'รพ.ปลายทาง',
      });
      if (!confirmed) return;
    }

    audioAlertService.initAudio();
    await departMission(currentMission.id, {
      isEmergencyOverride: true,
      overrideReason: 'Driver In-Cab Departure',
    });
    audioAlertService.playSuccessChime();
    alertService.showToast('🚀 ล้อหมุนออกเดินทางแล้ว', 'success');
    setSimProgress(0.1);
    await loadAssets();
  };

  const handleQuickArrived = async () => {
    if (!currentMission) return;
    audioAlertService.initAudio();
    await markMissionArrived(currentMission.id);
    audioAlertService.playSuccessChime();
    alertService.showToast('📍 ถึงที่หมายเรียบร้อยแล้ว', 'success');
    setSimProgress(1.0);
    await loadAssets();
  };

  const handleQuickHandover = async () => {
    if (!currentMission) return;

    const result = await alertService.confirmHandoverPrompt({
      missionNo: currentMission.mission_no,
      destination: currentMission.destination_name || 'รพ.ปลายทาง',
    });
    if (!result.confirmed) return;

    audioAlertService.initAudio();
    await confirmMissionHandover(currentMission.id, {
      receiverName: result.receiverName || 'พยาบาลวิชาชีพเวรส่งต่อ รพ.ปลายทาง',
      notes: result.notes || 'ส่งมอบตัวผู้ป่วยเรียบร้อย',
    });
    audioAlertService.playSuccessChime();
    alertService.showToast('✓ บันทึกการส่งมอบสำเร็จ', 'success');
    await loadAssets();
  };

  const handleQuickReturn = async () => {
    if (!currentMission) return;
    const confirmed = await alertService.confirmAction({
      title: 'เริ่มเดินทางกลับฐาน?',
      text: 'ยืนยันรถพยาบาลพร้อมออกเดินทางกลับฐานปฏิบัติการ',
      confirmButtonText: '🔄 เริ่มเดินทางกลับ',
    });
    if (!confirmed) return;

    audioAlertService.initAudio();
    await startMissionReturn(currentMission.id);
    audioAlertService.playSuccessChime();
    alertService.showToast('🔄 เริ่มเดินทางกลับฐานแล้ว', 'success');
    setSimProgress(0.1);
    await loadAssets();
  };

  const handleQuickComplete = async () => {
    if (!currentMission) return;

    const confirmed = await alertService.confirmAction({
      title: 'ยืนยันปิดภารกิจ?',
      text: 'ข้อมูลการเดินทางจะถูกสรุปเป็น Trip Report บันทึกเข้าสู่ฐานข้อมูล',
      confirmButtonText: '✓ ปิดภารกิจ',
      cancelButtonText: 'กลับ',
    });
    if (!confirmed) return;

    audioAlertService.initAudio();
    await completeMission(currentMission.id);
    audioAlertService.playSuccessChime();
    alertService.showToast('✓ ปิดภารกิจสำเร็จ', 'success');
    await loadAssets();
  };

  const handleToggleSOS = () => {
    audioAlertService.initAudio();
    if (!sosActive) {
      setSosActive(true);
      audioAlertService.startCriticalAlarm();
    } else {
      setSosActive(false);
      audioAlertService.stopCriticalAlarm();
    }
  };

  // Distance & Metrics Calculations
  const remainingKm = Math.max(
    0,
    Number((calculateHaversineKm(vehLat, vehLng, targetLat, targetLng) * ROAD_CIRCUITY).toFixed(1))
  );
  const traveledKm = Math.max(
    0,
    Number((calculateHaversineKm(startLat, startLng, vehLat, vehLng) * ROAD_CIRCUITY).toFixed(1))
  );
  const totalEstKm = Math.max(
    traveledKm + remainingKm,
    Number((calculateHaversineKm(startLat, startLng, targetLat, targetLng) * ROAD_CIRCUITY).toFixed(1))
  );
  const progressPercent = totalEstKm > 0 ? Math.min(100, Math.max(0, Math.round((traveledKm / totalEstKm) * 100))) : 0;

  const displaySpeed = currentPoint ? Math.round(currentPoint.speed) : simSpeed;
  const isSpeedCritical = displaySpeed >= 110;
  const isSpeedWarning = displaySpeed >= 90 && displaySpeed < 110;

  // ETA Calculation (minutes)
  const effectiveSpeed = displaySpeed > 15 ? displaySpeed : 50; // fallback average speed
  const etaMinutes = remainingKm <= 0.1 ? 0 : Math.max(1, Math.ceil((remainingKm / effectiveSpeed) * 60));

  const selectedVehicle = vehicles.find((x) => x.id === selectedVehicleId);

  // Map Overview Bounds
  const handleFitRoute = () => {
    const b: L.LatLngBoundsExpression = [
      [startLat, startLng],
      [targetLat, targetLng],
      [vehLat, vehLng],
    ];
    setFitBoundsTrigger(b);
    setAutoFollow(false);
    setTimeout(() => setFitBoundsTrigger(null), 1000);
  };

  // Custom Markers
  const vehMarkerIcon = useMemo(() => {
    const headingDeg = currentPoint?.heading ?? defaultHeading;
    const code = selectedVehicle?.vehicle_code || 'EMS';
    return L.divIcon({
      className: 'cab-vehicle-marker',
      html: `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer;">
          <!-- Pulsing Radar Glow -->
          <div style="position: absolute; width: 44px; height: 44px; border-radius: 9999px; background: rgba(14, 165, 233, 0.4); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          
          <!-- Directional Arrow Badge -->
          <div style="
            width: 38px;
            height: 38px;
            border-radius: 9999px;
            background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
            border: 3px solid #ffffff;
            box-shadow: 0 4px 14px rgba(2, 132, 199, 0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            transform: rotate(${headingDeg}deg);
            transition: transform 0.3s ease;
          ">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
            </svg>
          </div>

          <!-- Vehicle Code & Speed Tag -->
          <div style="
            margin-top: 4px;
            background: rgba(15, 23, 42, 0.95);
            backdrop-filter: blur(4px);
            color: #ffffff;
            border: 1px solid rgba(56, 189, 248, 0.8);
            padding: 2px 7px;
            border-radius: 6px;
            font-weight: 800;
            font-size: 10px;
            white-space: nowrap;
            box-shadow: 0 2px 8px rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            gap: 4px;
          ">
            <span style="color: #38bdf8;">${code}</span>
            <span style="color: #facc15;">${displaySpeed} km/h</span>
          </div>
        </div>
      `,
      iconSize: [60, 60],
      iconAnchor: [30, 24],
      popupAnchor: [0, -24],
    });
  }, [currentPoint?.heading, defaultHeading, selectedVehicle?.vehicle_code, displaySpeed]);

  const destMarkerIcon = useMemo(() => {
    return L.divIcon({
      className: 'cab-dest-marker',
      html: `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
          <div style="position: absolute; width: 38px; height: 38px; border-radius: 9999px; background: ${
            isEmergency ? 'rgba(239, 68, 68, 0.4)' : 'rgba(124, 58, 237, 0.4)'
          }; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="
            width: 34px;
            height: 34px;
            border-radius: 9999px;
            background: ${isEmergency ? '#dc2626' : '#7c3aed'};
            border: 3px solid #ffffff;
            box-shadow: 0 4px 14px rgba(0,0,0,0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 15px;
          ">
            ${isEmergency ? '🚨' : '🏥'}
          </div>
          <div style="
            margin-top: 3px;
            background: rgba(15, 23, 42, 0.95);
            color: #ffffff;
            border: 1px solid ${isEmergency ? '#f87171' : '#c084fc'};
            padding: 2px 7px;
            border-radius: 6px;
            font-weight: 700;
            font-size: 10px;
            white-space: nowrap;
            box-shadow: 0 2px 8px rgba(0,0,0,0.5);
            max-width: 150px;
            overflow: hidden;
            text-overflow: ellipsis;
          ">
            🏁 ${targetName}
          </div>
        </div>
      `,
      iconSize: [150, 56],
      iconAnchor: [75, 22],
      popupAnchor: [0, -22],
    });
  }, [isEmergency, targetName]);

  const origMarkerIcon = useMemo(() => {
    return L.divIcon({
      className: 'cab-orig-marker',
      html: `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
          <div style="
            width: 28px;
            height: 28px;
            border-radius: 9999px;
            background: #059669;
            border: 2px solid #ffffff;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 13px;
          ">
            🏢
          </div>
          <div style="
            margin-top: 2px;
            background: rgba(15, 23, 42, 0.9);
            color: #a7f3d0;
            border: 1px solid #34d399;
            padding: 1px 6px;
            border-radius: 6px;
            font-weight: 700;
            font-size: 9px;
            white-space: nowrap;
            max-width: 130px;
            overflow: hidden;
            text-overflow: ellipsis;
          ">
            ${startName}
          </div>
        </div>
      `,
      iconSize: [130, 46],
      iconAnchor: [65, 18],
    });
  }, [startName]);

  return (
    <div
      className={`flex-1 flex flex-col p-3 md:p-5 transition-colors duration-300 font-sans select-none overflow-y-auto ${
        isSpeedCritical
          ? 'bg-rose-50/90 dark:bg-rose-950/20'
          : isSpeedWarning
          ? 'bg-amber-50/70 dark:bg-amber-950/20'
          : 'bg-ems-canvas'
      }`}
    >
      {/* Top Header Bar: Vehicle Selector, Connection Badge, View Toggles, Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-ems-surface/90 backdrop-blur-md p-3 md:p-3.5 rounded-2xl border border-ems-border shadow-lg mb-3">
        <div className="flex items-center gap-2">
          <Truck className="w-5 h-5 text-sky-600" />
          <select
            value={selectedVehicleId}
            onChange={(e) => setSelectedVehicleId(Number(e.target.value))}
            className="bg-ems-inset text-ems-ink font-bold text-sm px-3 py-1.5 rounded-xl border border-ems-border focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.vehicle_code} ({v.registration_no})
              </option>
            ))}
          </select>
        </div>

        {/* View Switcher for smaller screens */}
        <div className="flex items-center gap-1 bg-ems-inset p-1 rounded-xl border border-ems-border text-xs font-semibold">
          <button
            onClick={() => setActiveViewMode('split')}
            className={`px-2.5 py-1 rounded-lg transition-colors ${
              activeViewMode === 'split' ? 'bg-sky-600 text-white shadow' : 'text-ems-muted hover:text-ems-ink'
            }`}
          >
            🧭 จอคู่ (Dual)
          </button>
          <button
            onClick={() => setActiveViewMode('meter')}
            className={`px-2.5 py-1 rounded-lg transition-colors ${
              activeViewMode === 'meter' ? 'bg-sky-600 text-white shadow' : 'text-ems-muted hover:text-ems-ink'
            }`}
          >
            🏎️ มาตรวัด
          </button>
          <button
            onClick={() => setActiveViewMode('map')}
            className={`px-2.5 py-1 rounded-lg transition-colors ${
              activeViewMode === 'map' ? 'bg-sky-600 text-white shadow' : 'text-ems-muted hover:text-ems-ink'
            }`}
          >
            🗺️ แผนที่นำทาง
          </button>
        </div>

        {/* Telematics / Offline Queue indicator & toggles */}
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
              isOnline
                ? queueCount === 0
                  ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30'
                  : 'bg-sky-500/10 text-sky-700 border-sky-500/30'
                : 'bg-amber-500/10 text-amber-700 border-amber-500/30'
            }`}
          >
            {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            <span>
              {isOnline
                ? queueCount === 0
                  ? 'ONLINE • SYNCED'
                  : `SYNCING (${queueCount})`
                : `OFFLINE QUEUE (${queueCount})`}
            </span>
          </div>

          {/* WakeLock button */}
          <button
            onClick={toggleWakeLock}
            className={`p-2 rounded-xl text-xs flex items-center gap-1 border transition-colors ${
              isWakeLocked
                ? 'bg-amber-500/20 text-amber-700 border-amber-500/40'
                : 'bg-ems-inset text-ems-muted border-ems-border'
            }`}
            title="ป้องกันหน้าจอดับ (Screen WakeLock)"
          >
            <Sun className="w-4 h-4" />
          </button>

          {/* Sound alert mute toggle */}
          <button
            onClick={toggleMute}
            className={`p-2 rounded-xl text-xs flex items-center gap-1 border transition-colors ${
              isMuted
                ? 'bg-rose-500/20 text-rose-700 border-rose-500/40'
                : 'bg-ems-inset text-ems-muted border-ems-border hover:text-ems-ink'
            }`}
            title="เปิด/ปิดเสียงเตือนความเร็ว"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Content Area: Left = Speedometer & 1-Tap Actions, Right = Live Map & Distance HUD */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 items-stretch min-h-0">
        {/* Left Column: Speedometer HUD & Big Action Buttons (Columns 1-5 on Large Screens) */}
        <div
          className={`flex flex-col justify-between space-y-4 bg-ems-surface/70 border border-ems-border p-4 rounded-3xl shadow-xl ${
            activeViewMode === 'map' ? 'hidden lg:flex lg:col-span-5' : activeViewMode === 'meter' ? 'col-span-12' : 'lg:col-span-5'
          }`}
        >
          {/* Mission Info Card */}
          {currentMission ? (
            <div className="bg-ems-inset/80 border border-ems-border p-3.5 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-black text-sky-600">
                    {currentMission.mission_no}
                  </span>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-extrabold rounded border ${
                      isEmergency
                        ? 'bg-rose-500/20 text-rose-600 border-rose-500/30'
                        : 'bg-sky-500/20 text-sky-600 border-sky-500/30'
                    }`}
                  >
                    {currentMission.mission_type}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-ems-muted block">สถานะ</span>
                  <span className="font-extrabold text-xs text-amber-600">
                    {currentMission.status}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-ems-muted truncate">
                <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-bold text-ems-ink text-sm truncate">
                  {targetName}
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-ems-inset/60 border border-ems-border p-3 rounded-2xl text-center text-xs text-ems-muted">
              รถพยาบาลคันนี้อยู่ในสถานะว่าง (ไม่มีภารกิจวิ่งในขณะนี้)
            </div>
          )}

          {/* Massive Speed Display */}
          <div className="flex flex-col items-center justify-center my-auto py-2">
            <div
              className={`flex flex-col items-center justify-center w-56 h-56 md:w-64 md:h-64 rounded-full border-8 transition-all duration-300 shadow-2xl relative ${
                isSpeedCritical
                  ? 'border-rose-500 bg-rose-50/80 animate-pulse shadow-rose-500/50'
                  : isSpeedWarning
                  ? 'border-amber-500 bg-amber-50/80 shadow-amber-500/30'
                  : 'border-sky-500/40 bg-ems-surface/90 shadow-sky-500/20'
              }`}
            >
              <span className="text-[11px] uppercase font-black tracking-widest text-ems-muted">
                CURRENT SPEED
              </span>
              <span
                className={`font-black tracking-tighter text-7xl md:text-8xl my-[-6px] ${
                  isSpeedCritical
                    ? 'text-rose-600'
                    : isSpeedWarning
                    ? 'text-amber-600'
                    : 'text-ems-ink'
                }`}
              >
                {displaySpeed}
              </span>
              <span className="text-xs font-bold text-ems-muted tracking-wider">KM / H</span>

              {/* Heading compass indicator */}
              <div className="absolute bottom-3.5 flex items-center gap-1 text-[11px] text-ems-muted bg-ems-inset/90 px-3 py-0.5 rounded-full border border-ems-border">
                <Compass className="w-3 h-3 text-sky-600" />
                <span>{currentPoint?.heading ?? defaultHeading}° นำทาง</span>
              </div>
            </div>

            {/* Speed warning alert */}
            {isSpeedCritical ? (
              <div className="mt-3 px-4 py-1.5 bg-rose-600 text-white font-bold text-xs rounded-full animate-bounce flex items-center gap-2 shadow-lg">
                <AlertTriangle className="w-4 h-4" />
                <span>⚠️ ความเร็วเกินขีดจำกัดวิกฤต (เกิน 110 กม./ชม.)</span>
              </div>
            ) : isSpeedWarning ? (
              <div className="mt-3 px-4 py-1.5 bg-amber-500 text-slate-950 font-bold text-xs rounded-full flex items-center gap-2 shadow-lg">
                <AlertTriangle className="w-4 h-4" />
                <span>เตือน: ความเร็วเกิน 90 กม./ชม.</span>
              </div>
            ) : null}

            {/* Test Speed Slider */}
            <div className="w-full max-w-xs flex items-center gap-3 bg-ems-inset px-3 py-1.5 rounded-xl border border-ems-border mt-3">
              <span className="text-[10px] text-ems-muted shrink-0 font-medium">จำลองความเร็ว:</span>
              <input
                type="range"
                min="0"
                max="130"
                value={simSpeed}
                onChange={(e) => handleSpeedSlider(Number(e.target.value))}
                className="w-full accent-sky-500 cursor-pointer"
              />
              <span className="font-mono text-xs text-sky-600 w-8 text-right font-black">
                {simSpeed}
              </span>
            </div>
          </div>

          {/* Action Buttons: 1-Tap Mission Progression & SOS */}
          <div className="space-y-2.5">
            {currentMission ? (
              <div className="grid grid-cols-1 gap-2">
                {['CREATED', 'ASSIGNED', 'READY'].includes(currentMission.status) && (
                  <button
                    onClick={handleQuickDepart}
                    className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-base rounded-2xl shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2.5 transition-transform active:scale-95"
                  >
                    <Play className="w-5 h-5 fill-white" />
                    <span>[ ออกเดินทาง DEPART ]</span>
                  </button>
                )}

                {['EN_ROUTE', 'DEPARTED'].includes(currentMission.status) && (
                  <button
                    onClick={handleQuickArrived}
                    className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-base rounded-2xl shadow-xl shadow-purple-600/30 flex items-center justify-center gap-2.5 transition-transform active:scale-95"
                  >
                    <MapPin className="w-5 h-5" />
                    <span>[ ถึงปลายทาง ARRIVED ]</span>
                  </button>
                )}

                {currentMission.status === 'ARRIVED' && (
                  <button
                    onClick={handleQuickHandover}
                    className="w-full py-3.5 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white font-black text-base rounded-2xl shadow-xl shadow-teal-600/30 flex items-center justify-center gap-2.5 transition-transform active:scale-95"
                  >
                    <CheckCircle className="w-5 h-5" />
                    <span>[ ส่งมอบตัวผู้ป่วย HANDOVER ]</span>
                  </button>
                )}

                {currentMission.status === 'HANDOVER_COMPLETED' && (
                  <button
                    onClick={handleQuickReturn}
                    className="w-full py-3.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-black text-base rounded-2xl shadow-xl shadow-amber-600/30 flex items-center justify-center gap-2.5 transition-transform active:scale-95"
                  >
                    <RotateCcw className="w-5 h-5" />
                    <span>[ เริ่มเดินทางกลับฐาน RETURNING ]</span>
                  </button>
                )}

                {currentMission.status === 'RETURNING' && (
                  <button
                    onClick={handleQuickComplete}
                    className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-base rounded-2xl shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2.5 transition-transform active:scale-95"
                  >
                    <CheckCircle className="w-5 h-5" />
                    <span>[ ถึงฐาน / ปิดภารกิจ COMPLETE ]</span>
                  </button>
                )}
              </div>
            ) : null}

            {/* SOS Emergency Button */}
            <button
              onClick={handleToggleSOS}
              className={`w-full py-3 rounded-2xl font-black text-sm tracking-wide flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 ${
                sosActive
                  ? 'bg-rose-600 text-white animate-pulse shadow-rose-600/50'
                  : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 dark:bg-rose-950/40 dark:border-rose-800'
              }`}
            >
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              <span>{sosActive ? '🚨 SOS ACTIVE — กดเพื่อหยุด' : '🚨 สัญญาณฉุกเฉิน SOS'}</span>
            </button>
          </div>
        </div>

        {/* Right Column: Live In-Cab Travel Map & Distance/ETA HUD Metrics (Columns 6-12) */}
        <div
          className={`flex flex-col space-y-3 ${
            activeViewMode === 'meter' ? 'hidden lg:flex lg:col-span-7' : activeViewMode === 'map' ? 'col-span-12' : 'lg:col-span-7'
          }`}
        >
          {/* Section: Live Travel Distance HUD Cards */}
          <div className="bg-ems-surface/90 border border-ems-border p-4 rounded-3xl shadow-xl">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Navigation className="w-5 h-5 text-sky-600" />
                <span className="font-black text-sm md:text-base text-ems-ink">
                  แผนที่นำทางและการเดินทาง (Live Travel Navigation)
                </span>
              </div>
              <span className="text-[11px] font-bold text-ems-muted bg-ems-inset px-2.5 py-1 rounded-full border border-ems-border">
                {selectedVehicle?.registration_no || 'ระยอง'}
              </span>
            </div>

            {/* 4 Metric Badges: Remaining km, Traveled km, ETA, Total km */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              {/* 1. Remaining Distance until Destination (The Primary Request) */}
              <div className="bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-transparent border-2 border-emerald-500/40 p-3 rounded-2xl relative overflow-hidden shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                    เหลืออีกจนถึงปลายทาง
                  </span>
                  <Flag className="w-4 h-4 text-emerald-600 animate-pulse" />
                </div>
                <div className="flex items-baseline gap-1 my-1">
                  <span className="text-3xl md:text-4xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                    {remainingKm}
                  </span>
                  <span className="text-xs font-black text-emerald-700 dark:text-emerald-400">กม.</span>
                </div>
                <div className="text-[10px] text-emerald-800/80 dark:text-emerald-300 font-semibold truncate">
                  🏁 ถึง {targetName}
                </div>
              </div>

              {/* 2. Traveled Distance */}
              <div className="bg-ems-inset/80 border border-ems-border p-3 rounded-2xl">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-sky-700 dark:text-sky-400">
                    ระยะทางวิ่งมาแล้ว
                  </span>
                  <Route className="w-4 h-4 text-sky-600" />
                </div>
                <div className="flex items-baseline gap-1 my-1">
                  <span className="text-3xl md:text-4xl font-black text-ems-ink tracking-tight">
                    {traveledKm}
                  </span>
                  <span className="text-xs font-bold text-ems-muted">กม.</span>
                </div>
                <div className="text-[10px] text-ems-muted font-medium truncate">
                  📍 ออกจาก {startName}
                </div>
              </div>

              {/* 3. Estimated Arrival Time (ETA) */}
              <div className="bg-ems-inset/80 border border-ems-border p-3 rounded-2xl">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400">
                    เวลาคาดการณ์ (ETA)
                  </span>
                  <Clock className="w-4 h-4 text-amber-600" />
                </div>
                <div className="flex items-baseline gap-1 my-1">
                  <span className="text-3xl md:text-4xl font-black text-amber-600 tracking-tight">
                    ~{etaMinutes}
                  </span>
                  <span className="text-xs font-bold text-ems-muted">นาที</span>
                </div>
                <div className="text-[10px] text-ems-muted font-medium">
                  {displaySpeed > 0 ? `ตามความเร็ว ${displaySpeed} กม./ชม.` : 'คำนวณตามมาตรฐานฉุกเฉิน'}
                </div>
              </div>

              {/* 4. Total Route Distance */}
              <div className="bg-ems-inset/80 border border-ems-border p-3 rounded-2xl">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-ems-muted">
                    ระยะทางรวมโดยประมาณ
                  </span>
                  <Layers className="w-4 h-4 text-ems-muted" />
                </div>
                <div className="flex items-baseline gap-1 my-1">
                  <span className="text-3xl md:text-4xl font-black text-ems-ink tracking-tight">
                    {totalEstKm}
                  </span>
                  <span className="text-xs font-bold text-ems-muted">กม.</span>
                </div>
                <div className="text-[10px] text-ems-muted font-medium">
                  ความคืบหน้า {progressPercent}%
                </div>
              </div>
            </div>

            {/* Trip Visual Progress Bar */}
            <div className="mt-3.5 pt-3 border-t border-ems-border/70">
              <div className="flex items-center justify-between text-[11px] font-bold text-ems-muted mb-1.5">
                <span className="flex items-center gap-1 text-sky-700 dark:text-sky-400">
                  🏢 {startName}
                </span>
                <span className="text-xs font-extrabold text-emerald-600">
                  {progressPercent}% เดินทางแล้ว
                </span>
                <span className="flex items-center gap-1 text-purple-700 dark:text-purple-400">
                  🏁 {targetName}
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700/80 h-3 rounded-full overflow-hidden p-0.5 border border-ems-border">
                <div
                  className="bg-gradient-to-r from-sky-500 via-teal-500 to-emerald-500 h-full rounded-full transition-all duration-500 shadow-sm"
                  style={{ width: `${Math.max(4, progressPercent)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Interactive Leaflet Map Container */}
          <div className="flex-1 min-h-[380px] md:min-h-[460px] rounded-3xl overflow-hidden border border-ems-border shadow-2xl relative bg-slate-100 dark:bg-slate-900">
            {/* Floating Map Controls overlay */}
            <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2">
              <button
                onClick={() => setAutoFollow(!autoFollow)}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 border shadow-lg backdrop-blur-md transition-all ${
                  autoFollow
                    ? 'bg-sky-600 text-white border-sky-400 shadow-sky-600/30'
                    : 'bg-ems-surface/90 text-ems-ink border-ems-border hover:bg-ems-surface'
                }`}
                title="เลื่อนแผนที่ติดตามตำแหน่งรถพยาบาลอัตโนมัติ"
              >
                <LocateFixed className="w-4 h-4" />
                <span>{autoFollow ? 'กำลังติดตามรถ' : 'ล็อกตำแหน่งรถ'}</span>
              </button>

              <button
                onClick={handleFitRoute}
                className="px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 border border-ems-border bg-ems-surface/90 text-ems-ink shadow-lg backdrop-blur-md hover:bg-ems-surface transition-all"
                title="ดูภาพรวมเส้นทางทั้งหมด (ต้นทาง -> ตำแหน่งรถ -> ปลายทาง)"
              >
                <Maximize2 className="w-4 h-4 text-sky-600" />
                <span>ดูเส้นทางทั้งหมด</span>
              </button>
            </div>

            {/* Bench Testing Simulation Stepper Overlay (Bottom left of Map) */}
            <div className="absolute bottom-3 left-3 z-[1000] bg-ems-surface/90 backdrop-blur-md border border-ems-border p-2 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold">
              <span className="text-ems-muted text-[10px] pl-1 font-semibold">ทดสอบจำลองรถ:</span>
              <button
                onClick={() => stepSimulation(-0.15)}
                disabled={simProgress <= 0}
                className="px-2 py-1 bg-ems-inset hover:bg-ems-surface border border-ems-border rounded-lg disabled:opacity-40 transition-colors"
                title="ถอยกลับ 15%"
              >
                <Rewind className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => stepSimulation(0.15)}
                disabled={simProgress >= 1}
                className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-lg disabled:opacity-40 flex items-center gap-1 transition-colors shadow-sm"
                title="เดินหน้า 15%"
              >
                <FastForward className="w-3.5 h-3.5" />
                <span>+15% เดินหน้า</span>
              </button>
              <button
                onClick={() => {
                  setSimProgress(0);
                  handleSpeedSlider(0);
                }}
                className="px-2 py-1 text-[10px] text-ems-muted hover:text-ems-ink bg-ems-inset rounded-lg border border-ems-border"
              >
                รีเซ็ต
              </button>
            </div>

            {/* Leaflet Map Canvas */}
            <MapContainer
              center={[vehLat, vehLng]}
              zoom={13}
              scrollWheelZoom={true}
              className="w-full h-full min-h-[380px] md:min-h-[460px]"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                maxZoom={19}
              />

              {/* Map Camera Controller */}
              <MapViewController
                center={[vehLat, vehLng]}
                autoFollow={autoFollow}
                bounds={fitBoundsTrigger}
              />

              {/* Traveled Polyline (Start to Ambulance) */}
              <Polyline
                positions={[
                  [startLat, startLng],
                  [vehLat, vehLng],
                ]}
                pathOptions={{
                  color: '#0284c7',
                  weight: 5,
                  opacity: 0.85,
                  dashArray: '6, 8',
                }}
              />

              {/* Remaining Polyline (Ambulance to Destination) */}
              <Polyline
                positions={[
                  [vehLat, vehLng],
                  [targetLat, targetLng],
                ]}
                pathOptions={{
                  color: '#10b981',
                  weight: 6,
                  opacity: 0.95,
                }}
              />

              {/* Destination Geofence Circle (250m) */}
              <Circle
                center={[targetLat, targetLng]}
                radius={250}
                pathOptions={{
                  color: isEmergency ? '#ef4444' : '#8b5cf6',
                  fillColor: isEmergency ? '#f87171' : '#a78bfa',
                  fillOpacity: 0.2,
                  weight: 2,
                  dashArray: '4, 4',
                }}
              />

              {/* Origin Marker */}
              <Marker position={[startLat, startLng]} icon={origMarkerIcon}>
                <Popup>
                  <div className="p-2 text-xs">
                    <div className="font-bold text-sky-800">จุดเริ่มต้น (Origin)</div>
                    <div className="text-slate-700 font-semibold">{startName}</div>
                  </div>
                </Popup>
              </Marker>

              {/* Destination Marker */}
              <Marker position={[targetLat, targetLng]} icon={destMarkerIcon}>
                <Popup>
                  <div className="p-2 text-xs">
                    <div className="font-bold text-purple-800">จุดหมายปลายทาง (Destination)</div>
                    <div className="text-slate-700 font-semibold">{targetName}</div>
                    <div className="mt-1 text-emerald-700 font-extrabold">
                      ระยะทางคงเหลือ: {remainingKm} กม.
                    </div>
                  </div>
                </Popup>
              </Marker>

              {/* Vehicle Ambulance Marker */}
              <Marker position={[vehLat, vehLng]} icon={vehMarkerIcon}>
                <Popup>
                  <div className="p-2 text-xs space-y-1">
                    <div className="font-black text-sky-700">
                      🚑 {selectedVehicle?.vehicle_code} ({selectedVehicle?.registration_no})
                    </div>
                    <div className="text-slate-600">
                      ความเร็ว: <b className="text-amber-600">{displaySpeed} กม./ชม.</b>
                    </div>
                    <div className="text-slate-600">
                      วิ่งมาแล้ว: <b>{traveledKm} กม.</b>
                    </div>
                    <div className="text-emerald-700 font-bold">
                      เหลืออีก: <b>{remainingKm} กม.</b>
                    </div>
                    <div className="text-purple-700 font-bold">
                      เวลาคาดการณ์ (ETA): <b>~{etaMinutes} นาที</b>
                    </div>
                  </div>
                </Popup>
              </Marker>
            </MapContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
