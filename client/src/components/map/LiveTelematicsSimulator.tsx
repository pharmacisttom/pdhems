import React, { useState, useEffect, useRef } from 'react';
import { useMap, Polyline, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import {
  Play,
  Pause,
  RotateCcw,
  Zap,
  Navigation,
  Compass,
  Gauge,
  MapPin,
  Volume2,
  VolumeX,
  Crosshair,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { VehicleMarkerData } from '../../types/ems';
import { updateAmbulanceLocation } from '../../services/api';
import { showToast, showSuccess } from '../../services/alertService';

// Waypoints for Route 1: Pluak Daeng Hospital to Saphan Si Junction (Emergency)
const ROUTE_EMERGENCY_SAPHAN_SI = [
  { lat: 12.975600, lng: 101.215500, label: 'รพ.ปลวกแดง (จุดเริ่มต้น)', speed: 0 },
  { lat: 12.974500, lng: 101.211000, label: 'ออกจาก รพ.ปลวกแดง สู่ ถ.สาย 3191', speed: 45 },
  { lat: 12.973200, lng: 101.202500, label: 'ถ.มาบยางพร-ปลวกแดง', speed: 68 },
  { lat: 12.971500, lng: 101.192000, label: 'ช่วงตรงความเร็วสูง', speed: 85 },
  { lat: 12.969800, lng: 101.182000, label: 'ผ่านหน้า รพ.สต.ปลวกแดง เขตชุมชน', speed: 72 },
  { lat: 12.968000, lng: 101.173500, label: 'มุ่งหน้าแยกสะพานสี่', speed: 80 },
  { lat: 12.966200, lng: 101.164000, label: 'ใกล้เขตอุตสาหกรรมอมตะซิตี้', speed: 65 },
  { lat: 12.965000, lng: 101.157500, label: 'ชะลอความเร็วเข้าใกล้จุดเกิดเหตุ', speed: 40 },
  { lat: 12.964000, lng: 101.152000, label: 'ถึงจุดเกิดเหตุ สี่แยกสะพานสี่ (มาบยางพร)', speed: 0 },
];

// Waypoints for Route 2: Pluak Daeng Hospital to Rayong Hospital (Refer Corridor)
const ROUTE_REFER_RAYONG = [
  { lat: 12.975600, lng: 101.215500, label: 'รพ.ปลวกแดง (ต้นทาง Refer)', speed: 0 },
  { lat: 12.958000, lng: 101.221000, label: 'ถ.สาย 3191 มุ่งหน้าทิศใต้', speed: 60 },
  { lat: 12.935000, lng: 101.231000, label: 'ผ่านแยกแม่น้ำคู้', speed: 82 },
  { lat: 12.905000, lng: 101.241000, label: 'ทล.3191 ทางหลวงสายหลัก', speed: 90 },
  { lat: 12.870000, lng: 101.250000, label: 'ผ่านเขตอำเภอนิคมพัฒนา', speed: 88 },
  { lat: 12.825000, lng: 101.260000, label: 'เข้าสู่ ทล.36 ทางเลี่ยงเมืองระยอง', speed: 85 },
  { lat: 12.775000, lng: 101.268000, label: 'ผ่านสี่แยกทับมา', speed: 70 },
  { lat: 12.725000, lng: 101.275000, label: 'ถนนสุขุมวิท เข้าตัวเมืองระยอง', speed: 50 },
  { lat: 12.684100, lng: 101.281800, label: 'ถึง รพ.ระยอง (ศูนย์ส่งต่อตติยภูมิ)', speed: 0 },
];

// Waypoints for Route 3: Pluak Daeng Hospital to Bangkok Hospital Pluak Daeng via Rescue Foundation
const ROUTE_JOINT_PLUAKDAENG_BHP = [
  { lat: 12.975600, lng: 101.215500, label: 'ศูนย์สั่งการกู้ชีพ รพ.ปลวกแดง (จุดเริ่ม)', speed: 0 },
  { lat: 12.978000, lng: 101.218500, label: 'ถ.เทศบาลพัฒนา สู่ศูนย์กู้ภัย', speed: 48 },
  { lat: 12.980500, lng: 101.221000, label: 'ผ่านศูนย์วิทยุมูลนิธิกู้ภัยอำเภอปลวกแดง (ร่วมขบวน)', speed: 55 },
  { lat: 12.980000, lng: 101.212000, label: 'ถ.สาย 3191 มุ่งหน้าเครือข่าย EMS', speed: 65 },
  { lat: 12.979000, lng: 101.203000, label: 'ชะลอความเร็วเข้าเขตสถานพยาบาล', speed: 42 },
  { lat: 12.978562, lng: 101.196742, label: 'ถึง รพ.กรุงเทพปลวกแดง (เครือข่ายส่งต่อ EMS)', speed: 0 },
];

// Calculate bearing/heading between 2 points (0-360)
function calculateBearing(startLat: number, startLng: number, destLat: number, destLng: number) {
  const startLatRad = (startLat * Math.PI) / 180;
  const startLngRad = (startLng * Math.PI) / 180;
  const destLatRad = (destLat * Math.PI) / 180;
  const destLngRad = (destLng * Math.PI) / 180;

  const y = Math.sin(destLngRad - startLngRad) * Math.cos(destLatRad);
  const x =
    Math.cos(startLatRad) * Math.sin(destLatRad) -
    Math.sin(startLatRad) * Math.cos(destLatRad) * Math.cos(destLngRad - startLngRad);
  let brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

// Haversine distance in km
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
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

// Camera pan helper inside MapContainer
const CameraTracker: React.FC<{
  position: [number, number] | null;
  follow: boolean;
}> = ({ position, follow }) => {
  const map = useMap();
  useEffect(() => {
    if (follow && position) {
      map.panTo(position, { animate: true, duration: 0.6 });
    }
  }, [position, follow, map]);
  return null;
};

interface LiveTelematicsSimulatorProps {
  vehicles: VehicleMarkerData[];
  onVehicleTelematicsUpdate: (
    vehicleId: number,
    coords: { latitude: number; longitude: number; speed: number; heading: number }
  ) => void;
}

export const LiveTelematicsSimulator: React.FC<LiveTelematicsSimulatorProps> = ({
  vehicles,
  onVehicleTelematicsUpdate,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRouteKey, setSelectedRouteKey] = useState<'SAPHAN_SI' | 'REFER_RAYONG' | 'JOINT_BHP'>('SAPHAN_SI');
  const [selectedVehicleId, setSelectedVehicleId] = useState<number>(vehicles[0]?.id || 1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [followCamera, setFollowCamera] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Simulation progress state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fraction, setFraction] = useState(0); // 0.0 to 1.0 between current and next waypoint
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [currentHeading, setCurrentHeading] = useState(0);
  const [currentPos, setCurrentPos] = useState<[number, number] | null>(null);

  const waypoints =
    selectedRouteKey === 'SAPHAN_SI'
      ? ROUTE_EMERGENCY_SAPHAN_SI
      : selectedRouteKey === 'JOINT_BHP'
      ? ROUTE_JOINT_PLUAKDAENG_BHP
      : ROUTE_REFER_RAYONG;

  // Sound chime
  const playArrivalSound = () => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.2); // A5
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch {
      // Audio context restricted
    }
  };

  // Main simulation timer
  useEffect(() => {
    if (!isPlaying) return;

    const intervalTime = 600; // ms per tick
    const timer = setInterval(() => {
      setFraction((prevFraction) => {
        const step = 0.08 * playbackSpeed;
        const nextFraction = prevFraction + step;

        if (nextFraction >= 1.0) {
          // Advance to next waypoint
          setCurrentIndex((prevIdx) => {
            const nextIdx = prevIdx + 1;
            if (nextIdx >= waypoints.length - 1) {
              // Reached final destination!
              setIsPlaying(false);
              playArrivalSound();
              showSuccess(
                'ถึงที่หมายแล้ว!',
                `รถฉุกเฉินได้เดินทางถึง ${waypoints[waypoints.length - 1].label} เรียบร้อยแล้ว`
              );
              return waypoints.length - 1;
            }
            return nextIdx;
          });
          return 0.0;
        }
        return nextFraction;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, waypoints.length]);

  // Update current position, speed, and heading
  useEffect(() => {
    if (waypoints.length < 2) return;
    const p1 = waypoints[currentIndex];
    const p2 = waypoints[Math.min(currentIndex + 1, waypoints.length - 1)];

    const lat = p1.lat + (p2.lat - p1.lat) * fraction;
    const lng = p1.lng + (p2.lng - p1.lng) * fraction;
    const spd = Math.round(p1.speed + (p2.speed - p1.speed) * fraction);
    const hdg = Math.round(calculateBearing(p1.lat, p1.lng, p2.lat, p2.lng));

    setCurrentPos([lat, lng]);
    setCurrentSpeed(spd);
    setCurrentHeading(hdg);

    // Notify parent
    if (selectedVehicleId) {
      onVehicleTelematicsUpdate(selectedVehicleId, {
        latitude: lat,
        longitude: lng,
        speed: spd,
        heading: hdg,
      });
    }
  }, [currentIndex, fraction, waypoints, selectedVehicleId]);

  // Sync to server every 4 seconds if playing
  const lastServerSyncRef = useRef<number>(0);
  useEffect(() => {
    if (!isPlaying || !currentPos || !selectedVehicleId) return;
    const now = Date.now();
    if (now - lastServerSyncRef.current > 4000) {
      lastServerSyncRef.current = now;
      updateAmbulanceLocation(selectedVehicleId, {
        latitude: currentPos[0],
        longitude: currentPos[1],
        speed: currentSpeed,
        heading: currentHeading,
      }).catch(() => {});
    }
  }, [isPlaying, currentPos, currentSpeed, currentHeading, selectedVehicleId]);

  // Reset function
  const handleReset = () => {
    setIsPlaying(false);
    setCurrentIndex(0);
    setFraction(0);
    const initialPoint = waypoints[0];
    setCurrentPos([initialPoint.lat, initialPoint.lng]);
    setCurrentSpeed(0);
    showToast('รีเซ็ตตำแหน่งการจำลองรถพยาบาลแล้ว', 'info');
  };

  // Remaining distance
  const targetPoint = waypoints[waypoints.length - 1];
  const distanceRemainingKm = currentPos
    ? calculateDistanceKm(currentPos[0], currentPos[1], targetPoint.lat, targetPoint.lng).toFixed(1)
    : '0.0';

  const routePolylineCoords: [number, number][] = waypoints.map((p) => [p.lat, p.lng]);

  return (
    <>
      {/* Visual Camera Tracker attached to Leaflet Map */}
      <CameraTracker position={currentPos} follow={followCamera && isPlaying} />

      {/* Render Active Simulation Path Polyline on Map */}
      {isOpen && (
        <Polyline
          positions={routePolylineCoords}
          pathOptions={{
            color: selectedRouteKey === 'SAPHAN_SI' ? '#ef4444' : '#0284c7',
            weight: 5,
            opacity: 0.75,
            dashArray: '8, 8',
          }}
        />
      )}

      {/* Floating Simulation Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true);
            if (!currentPos) {
              const p = waypoints[0];
              setCurrentPos([p.lat, p.lng]);
            }
          }}
          className="absolute bottom-6 left-4 z-[1000] px-4 py-2.5 bg-gradient-to-r from-sky-700 via-indigo-700 to-sky-800 hover:from-sky-600 hover:to-indigo-600 text-white font-bold text-xs rounded-2xl shadow-xl flex items-center gap-2 backdrop-blur-md active:scale-95 transition-all border border-white/20"
          title="เปิดแผงควบคุมการจำลองรถพยาบาลวิ่งสด"
        >
          <Zap className="w-4 h-4 text-amber-300 animate-pulse" />
          <span>⚡ จำลองรถวิ่งสด (Live Simulation)</span>
        </button>
      )}

      {/* Full Floating Telematics Simulator HUD */}
      {isOpen && (
        <div className="absolute bottom-4 left-4 z-[1000] w-[340px] sm:w-[380px] bg-white/95 backdrop-blur-md border border-ems-border rounded-2xl shadow-2xl p-4 text-ems-ink animate-in fade-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-ems-border/80 pb-2.5 mb-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-sky-100 text-sky-700">
                <Zap className="w-4 h-4" />
              </span>
              <div>
                <h4 className="font-extrabold text-xs text-ems-ink">
                  จำลองรถพยาบาลวิ่งสด (Live Telematics)
                </h4>
                <p className="text-[10px] text-ems-muted">อ.ปลวกแดง · พิกัดและการเคลื่อนที่ตามถนนจริง</p>
              </div>
            </div>
            <button
              onClick={() => {
                setIsPlaying(false);
                setIsOpen(false);
              }}
              className="p-1 rounded-lg hover:bg-slate-100 text-ems-muted"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {/* Route & Vehicle Selectors */}
          <div className="space-y-2 mb-3">
            <div>
              <label className="block text-[10px] font-bold text-ems-muted mb-1">เลือกเส้นทางจำลอง:</label>
              <select
                value={selectedRouteKey}
                onChange={(e) => {
                  setIsPlaying(false);
                  setSelectedRouteKey(e.target.value as any);
                  setCurrentIndex(0);
                  setFraction(0);
                }}
                className="w-full text-xs font-semibold px-2.5 py-1.5 bg-ems-inset border border-ems-border rounded-xl text-ems-ink focus:ring-2 focus:ring-sky-500"
              >
                <option value="SAPHAN_SI">🚨 ออกเหตุฉุกเฉิน: รพ.ปลวกแดง ➔ แยกสะพานสี่ (7.2 กม.)</option>
                <option value="JOINT_BHP">🤝 ปฏิบัติการร่วม: รพ.ปลวกแดง ➔ มูลนิธิกู้ภัย ➔ รพ.กรุงเทพปลวกแดง (4.8 กม.)</option>
                <option value="REFER_RAYONG">🚑 ส่งต่อ Refer: รพ.ปลวกแดง ➔ รพ.ศูนย์ระยอง (34 กม.)</option>
              </select>
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-ems-muted mb-1">รถพยาบาล:</label>
                <select
                  value={selectedVehicleId}
                  onChange={(e) => setSelectedVehicleId(Number(e.target.value))}
                  className="w-full text-xs font-semibold px-2 py-1 bg-ems-inset border border-ems-border rounded-xl text-ems-ink"
                >
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.vehicle_code} ({v.registration_no})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-ems-muted mb-1">ความเร็วจำลอง:</label>
                <div className="flex rounded-xl overflow-hidden border border-ems-border text-[11px] font-bold">
                  {[1, 2, 5].map((speed) => (
                    <button
                      key={speed}
                      onClick={() => setPlaybackSpeed(speed)}
                      className={`px-2 py-1 ${
                        playbackSpeed === speed
                          ? 'bg-sky-700 text-white'
                          : 'bg-ems-inset text-ems-muted hover:bg-slate-200'
                      }`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Real-time Telemetry Dashboard Gauges */}
          <div className="grid grid-cols-3 gap-2 bg-ems-canvas/80 border border-ems-border rounded-xl p-2.5 mb-3 text-center">
            <div>
              <div className="flex items-center justify-center gap-1 text-[10px] text-ems-muted">
                <Gauge className="w-3 h-3 text-sky-600" />
                <span>ความเร็ว</span>
              </div>
              <p className="text-base font-black text-sky-800 mt-0.5">
                {currentSpeed} <span className="text-[10px] font-normal text-ems-muted">กม./ชม.</span>
              </p>
            </div>

            <div>
              <div className="flex items-center justify-center gap-1 text-[10px] text-ems-muted">
                <Compass
                  className="w-3 h-3 text-indigo-600 transition-transform"
                  style={{ transform: `rotate(${currentHeading}deg)` }}
                />
                <span>ทิศทาง</span>
              </div>
              <p className="text-base font-black text-indigo-800 mt-0.5">
                {currentHeading}° <span className="text-[10px] font-normal text-ems-muted">Heading</span>
              </p>
            </div>

            <div>
              <div className="flex items-center justify-center gap-1 text-[10px] text-ems-muted">
                <MapPin className="w-3 h-3 text-emerald-600" />
                <span>ระยะที่เหลือ</span>
              </div>
              <p className="text-base font-black text-emerald-800 mt-0.5">
                {distanceRemainingKm} <span className="text-[10px] font-normal text-ems-muted">กม.</span>
              </p>
            </div>
          </div>

          {/* Current Waypoint Description */}
          <div className="bg-sky-50 border border-sky-100 rounded-xl px-2.5 py-1.5 text-[11px] mb-3 flex items-center justify-between text-sky-900 font-medium">
            <span className="truncate max-w-[260px]">
              📍 {waypoints[currentIndex]?.label || 'กำลังจำลองการเคลื่อนที่...'}
            </span>
            <span className="text-[10px] font-bold text-sky-700">
              {currentIndex + 1}/{waypoints.length}
            </span>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setFollowCamera(!followCamera)}
                className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1 border transition-all ${
                  followCamera
                    ? 'bg-sky-100 border-sky-300 text-sky-800'
                    : 'bg-white border-ems-border text-ems-muted'
                }`}
                title={followCamera ? 'เปิดล็อกมุมมองตามรถ' : 'ปิดล็อกมุมมองตามรถ'}
              >
                <Crosshair className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px]">ล็อกรถ</span>
              </button>

              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-2 rounded-xl text-xs border ${
                  soundEnabled
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-white border-ems-border text-ems-muted'
                }`}
                title={soundEnabled ? 'เปิดเสียงแจ้งเตือน' : 'ปิดเสียงแจ้งเตือน'}
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleReset}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
                title="รีเซ็ตตำแหน่งเริ่มต้น"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>รีเซ็ต</span>
              </button>

              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold text-white shadow-md flex items-center gap-1.5 transition-all ${
                  isPlaying
                    ? 'bg-amber-600 hover:bg-amber-500'
                    : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500'
                }`}
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-3.5 h-3.5" />
                    <span>หยุดชั่วคราว</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    <span>เริ่มวิ่งจำลอง</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
export default LiveTelematicsSimulator;
