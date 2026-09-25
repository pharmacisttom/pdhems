import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';

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

  useEffect(() => {
    loadAssets();
    wakeLockService.requestLock().then((locked) => setIsWakeLocked(locked));

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
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

  // Speed injection for demonstration and testing
  const handleSpeedSlider = (speed: number) => {
    setSimSpeed(speed);
    audioAlertService.initAudio();
    gpsTrackingEngine.injectManualPosition(13.693822, 99.851921, speed, 90);
  };

  // 1-Tap Quick Status Transitions
  const handleQuickDepart = async () => {
    if (!currentMission) return;
    const v = vehicles.find((x) => x.id === selectedVehicleId);
    
    // Section 22: Departure confirmation when stationary
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
    await loadAssets();
  };

  const handleQuickArrived = async () => {
    if (!currentMission) return;
    audioAlertService.initAudio();
    await markMissionArrived(currentMission.id);
    audioAlertService.playSuccessChime();
    alertService.showToast('📍 ถึงที่หมายเรียบร้อยแล้ว', 'success');
    await loadAssets();
  };

  const handleQuickHandover = async () => {
    if (!currentMission) return;
    
    // Section 23: Handover confirmation prompt
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
    await loadAssets();
  };

  const handleQuickComplete = async () => {
    if (!currentMission) return;
    
    // Section 24: Complete mission confirmation
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

  const displaySpeed = currentPoint ? Math.round(currentPoint.speed) : simSpeed;
  const isSpeedCritical = displaySpeed >= 110;
  const isSpeedWarning = displaySpeed >= 90 && displaySpeed < 110;

  return (
    <div
      className={`flex-1 flex flex-col justify-between p-4 md:p-6 transition-colors duration-300 font-sans select-none ${
        isSpeedCritical
          ? 'bg-rose-950/90'
          : isSpeedWarning
          ? 'bg-amber-950/70'
          : 'bg-slate-950'
      }`}
    >
      {/* Top Bar: Vehicle Selector, Status Pill, Mute, WakeLock */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 backdrop-blur-md p-3.5 rounded-2xl border border-slate-800 shadow-xl">
        <div className="flex items-center gap-2">
          <Truck className="w-5 h-5 text-sky-400" />
          <select
            value={selectedVehicleId}
            onChange={(e) => setSelectedVehicleId(Number(e.target.value))}
            className="bg-slate-800 text-white font-bold text-sm px-3 py-1.5 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.vehicle_code} ({v.registration_no})
              </option>
            ))}
          </select>
        </div>

        {/* Telematics / Offline Queue indicator */}
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
              isOnline
                ? queueCount === 0
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
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
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700'
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
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
            }`}
            title="เปิด/ปิดเสียงเตือนความเร็ว"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main HUD: Massive Speedometer & Mission Status */}
      <div className="flex-1 flex flex-col items-center justify-center my-4 space-y-4">
        {/* Mission Banner */}
        {currentMission ? (
          <div className="w-full max-w-xl bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-xl flex items-center justify-between text-left">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-sm font-bold text-sky-400">
                  {currentMission.mission_no}
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  {currentMission.mission_type}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-300">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-semibold text-white text-sm">
                  {currentMission.destination_name || 'รพ.ศูนย์ราชบุรี'}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block">สถานะปัจจุบัน</span>
              <span className="font-bold text-xs text-amber-400">
                {currentMission.status}
              </span>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-xl bg-slate-900/60 border border-slate-800/80 p-3 rounded-2xl text-center text-xs text-slate-400">
            รถพยาบาลคันนี้อยู่ในสถานะว่าง (ไม่มีภารกิจวิ่งในขณะนี้)
          </div>
        )}

        {/* Massive Speed Display (Section 10: Driving Mode) */}
        <div
          className={`flex flex-col items-center justify-center w-64 h-64 md:w-80 md:h-80 rounded-full border-8 transition-all duration-300 shadow-2xl relative ${
            isSpeedCritical
              ? 'border-rose-500 bg-rose-950/80 animate-pulse shadow-rose-500/50'
              : isSpeedWarning
              ? 'border-amber-500 bg-amber-950/80 shadow-amber-500/30'
              : 'border-sky-500/40 bg-slate-900/90 shadow-sky-500/20'
          }`}
        >
          <span className="text-[12px] uppercase font-bold tracking-widest text-slate-400">
            CURRENT SPEED
          </span>
          <span
            className={`font-black tracking-tighter text-7xl md:text-9xl my-[-5px] ${
              isSpeedCritical
                ? 'text-rose-400'
                : isSpeedWarning
                ? 'text-amber-400'
                : 'text-white'
            }`}
          >
            {displaySpeed}
          </span>
          <span className="text-sm font-bold text-slate-400 tracking-wider">KM / H</span>

          {/* Heading compass indicator */}
          <div className="absolute bottom-4 flex items-center gap-1 text-[11px] text-slate-400 bg-slate-800/80 px-2.5 py-0.5 rounded-full border border-slate-700">
            <Compass className="w-3 h-3 text-sky-400" />
            <span>{currentPoint?.heading ?? 90}° ตะวันออก</span>
          </div>
        </div>

        {/* Speed warning banner */}
        {isSpeedCritical ? (
          <div className="px-4 py-1.5 bg-rose-600 text-white font-bold text-xs rounded-full animate-bounce flex items-center gap-2 shadow-lg">
            <AlertTriangle className="w-4 h-4" />
            <span>⚠️ ความเร็วเกินขีดจำกัดวิกฤต (เกิน 110 กม./ชม.)</span>
          </div>
        ) : isSpeedWarning ? (
          <div className="px-4 py-1.5 bg-amber-500 text-slate-950 font-bold text-xs rounded-full flex items-center gap-2 shadow-lg">
            <AlertTriangle className="w-4 h-4" />
            <span>เตือน: ความเร็วเกิน 90 กม./ชม.</span>
          </div>
        ) : null}

        {/* Test Speed Slider (for testing in browser) */}
        <div className="w-full max-w-xs flex items-center gap-3 bg-slate-900/60 px-3 py-1.5 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-400 shrink-0">จำลองความเร็ว:</span>
          <input
            type="range"
            min="0"
            max="130"
            value={simSpeed}
            onChange={(e) => handleSpeedSlider(Number(e.target.value))}
            className="w-full accent-sky-500 cursor-pointer"
          />
          <span className="font-mono text-xs text-sky-400 w-8 text-right font-bold">
            {simSpeed}
          </span>
        </div>
      </div>

      {/* Bottom Bar: 1-Tap Big Buttons (Zero Distraction / Section 10) */}
      <div className="space-y-3">
        {/* Dynamic Action Button according to mission status */}
        {currentMission ? (
          <div className="grid grid-cols-1 gap-2 max-w-xl mx-auto">
            {['CREATED', 'ASSIGNED', 'READY'].includes(currentMission.status) && (
              <button
                onClick={handleQuickDepart}
                className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-lg rounded-2xl shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-3 transition-transform active:scale-95"
              >
                <Play className="w-6 h-6 fill-white" />
                <span>[ ออกเดินทาง DEPART ]</span>
              </button>
            )}

            {['EN_ROUTE', 'DEPARTED'].includes(currentMission.status) && (
              <button
                onClick={handleQuickArrived}
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-lg rounded-2xl shadow-xl shadow-purple-600/30 flex items-center justify-center gap-3 transition-transform active:scale-95"
              >
                <MapPin className="w-6 h-6" />
                <span>[ ถึงปลายทาง ARRIVED ]</span>
              </button>
            )}

            {currentMission.status === 'ARRIVED' && (
              <button
                onClick={handleQuickHandover}
                className="w-full py-4 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white font-extrabold text-lg rounded-2xl shadow-xl shadow-teal-600/30 flex items-center justify-center gap-3 transition-transform active:scale-95"
              >
                <CheckCircle className="w-6 h-6" />
                <span>[ ส่งมอบตัวผู้ป่วย HANDOVER ]</span>
              </button>
            )}

            {currentMission.status === 'HANDOVER_COMPLETED' && (
              <button
                onClick={handleQuickReturn}
                className="w-full py-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-extrabold text-lg rounded-2xl shadow-xl shadow-amber-600/30 flex items-center justify-center gap-3 transition-transform active:scale-95"
              >
                <RotateCcw className="w-6 h-6" />
                <span>[ เริ่มเดินทางกลับฐาน RETURNING ]</span>
              </button>
            )}

            {currentMission.status === 'RETURNING' && (
              <button
                onClick={handleQuickComplete}
                className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-lg rounded-2xl shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-3 transition-transform active:scale-95"
              >
                <CheckCircle className="w-6 h-6" />
                <span>[ ถึงฐาน / ปิดภารกิจ COMPLETE ]</span>
              </button>
            )}
          </div>
        ) : null}

        {/* SOS Emergency Button (Prominent Emergency Signal) */}
        <div className="max-w-xl mx-auto flex items-center gap-3">
          <button
            onClick={handleToggleSOS}
            className={`flex-1 py-3.5 rounded-2xl font-black text-sm tracking-wider flex items-center justify-center gap-2 shadow-xl transition-all active:scale-95 ${
              sosActive
                ? 'bg-rose-600 text-white animate-pulse shadow-rose-600/50'
                : 'bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/80'
            }`}
          >
            <ShieldAlert className="w-5 h-5 text-rose-400" />
            <span>{sosActive ? '🚨 SOS ACTIVE — กดเพื่อหยุด' : '🚨 สัญญาณฉุกเฉิน SOS'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
