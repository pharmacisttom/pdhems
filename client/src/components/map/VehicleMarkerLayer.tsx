import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { VehicleMarkerData } from '../../types/ems';
import { AlertTriangle, Clock, Radio, User, Compass, Gauge, ShieldAlert, Route } from 'lucide-react';
import { showInfo, showToast } from '../../services/alertService';

interface VehicleMarkerLayerProps {
  vehicles: VehicleMarkerData[];
  onSelectMission?: (missionNo: string) => void;
  onShowTrack?: (missionIdOrNo: string | number) => void;
}

// Convert heading degrees (0-360) to directional arrow symbol (Section 4)
function getHeadingArrow(heading: number | null): string {
  if (heading === null || heading === undefined) return '';
  const val = Math.floor((heading / 45) + 0.5) % 8;
  const arrows = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'];
  return arrows[val] || '';
}

// Color schemes per status
function getStatusStyles(status: string, health: string) {
  if (health === 'TRACKING_LOST' || status === 'TRACKING_LOST') {
    return {
      bg: '#475569',
      border: '#94a3b8',
      text: '#f1f5f9',
      label: 'TRACKING_LOST',
      labelTh: 'ขาดการเชื่อมต่อ (Lost)',
    };
  }
  if (health === 'TRACKING_DELAYED') {
    return {
      bg: '#d97706',
      border: '#fbbf24',
      text: '#ffffff',
      label: 'TRACKING_DELAYED',
      labelTh: 'สัญญาณล่าช้า (Delayed)',
    };
  }

  switch (status) {
    case 'AVAILABLE':
      return { bg: '#059669', border: '#34d399', text: '#ffffff', label: 'AVAILABLE', labelTh: 'พร้อมใช้งาน' };
    case 'EN_ROUTE':
      return { bg: '#0284c7', border: '#38bdf8', text: '#ffffff', label: 'EN_ROUTE', labelTh: 'กำลังเดินทาง' };
    case 'AT_SCENE':
      return { bg: '#dc2626', border: '#f87171', text: '#ffffff', label: 'AT_SCENE', labelTh: 'ถึงจุดเกิดเหตุ' };
    case 'AT_DESTINATION':
      return { bg: '#7c3aed', border: '#a78bfa', text: '#ffffff', label: 'AT_DESTINATION', labelTh: 'ถึงปลายทาง' };
    case 'RETURNING':
      return { bg: '#d97706', border: '#fbbf24', text: '#ffffff', label: 'RETURNING', labelTh: 'กำลังกลับฐาน' };
    case 'MAINTENANCE':
    case 'OUT_OF_SERVICE':
      return { bg: '#475569', border: '#64748b', text: '#cbd5e1', label: 'MAINTENANCE', labelTh: 'ซ่อมบำรุง' };
    default:
      return { bg: '#2563eb', border: '#60a5fa', text: '#ffffff', label: status, labelTh: status };
  }
}

function createVehicleIcon(v: VehicleMarkerData) {
  const styles = getStatusStyles(v.status, v.tracking_health);
  const arrow = getHeadingArrow(v.current_heading);
  const isEmergency = v.active_mission?.mission_type === 'EMERGENCY';
  const isLost = v.tracking_health === 'TRACKING_LOST';
  const isDelayed = v.tracking_health === 'TRACKING_DELAYED';
  const isStopped = v.is_stopped && !isLost && !isDelayed;

  const html = `
    <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
      ${
        isEmergency
          ? '<div style="position: absolute; top: -6px; left: -6px; right: -6px; bottom: -6px; border-radius: 9999px; background: rgba(239, 68, 68, 0.4); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>'
          : ''
      }
      <div style="
        background-color: ${styles.bg};
        border: 2px ${isLost ? 'dashed #f87171' : `solid ${styles.border}`};
        color: ${styles.text};
        padding: 3px 8px;
        border-radius: 9999px;
        font-weight: 700;
        font-size: 11px;
        display: flex;
        align-items: center;
        gap: 4px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.5);
        white-space: nowrap;
        opacity: ${isLost ? '0.75' : '1'};
      ">
        <span>🚑</span>
        <span>${v.vehicle_code}</span>
        ${arrow ? `<span style="font-size: 12px; font-weight: 900;">${arrow}</span>` : ''}
      </div>
      ${
        isStopped
          ? `<div style="
              background: #1e293b; 
              color: #94a3b8; 
              font-size: 9px; 
              font-weight: 600; 
              border: 1px solid #334155; 
              border-radius: 4px; 
              padding: 1px 4px; 
              margin-top: 2px;
            ">🅿️ จอดนิ่ง</div>`
          : v.current_speed > 0 && !isLost
          ? `<div style="
              background: #0f172a; 
              color: #38bdf8; 
              font-size: 9px; 
              font-weight: 600; 
              border: 1px solid #334155; 
              border-radius: 4px; 
              padding: 1px 4px; 
              margin-top: 2px;
            ">${Math.round(v.current_speed)} km/h</div>`
          : ''
      }
      ${
        isLost
          ? `<div style="
              background: #991b1b; 
              color: #fecaca; 
              font-size: 8px; 
              font-weight: 700; 
              border-radius: 3px; 
              padding: 1px 4px; 
              margin-top: 1px;
              border: 1px solid #ef4444;
            ">LAST KNOWN</div>`
          : isDelayed
          ? `<div style="
              background: #b45309; 
              color: #fef3c7; 
              font-size: 8px; 
              font-weight: 700; 
              border-radius: 3px; 
              padding: 1px 3px; 
              margin-top: 1px;
            ">DELAYED</div>`
          : ''
      }
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-vehicle-marker',
    iconSize: [60, 40],
    iconAnchor: [30, 20],
    popupAnchor: [0, -20],
  });
}

export const VehicleMarkerLayer: React.FC<VehicleMarkerLayerProps> = ({
  vehicles,
  onSelectMission,
  onShowTrack,
}) => {
  return (
    <>
      {vehicles.map((v) => {
        if (v.current_latitude === null || v.current_longitude === null) return null;

        const styles = getStatusStyles(v.status, v.tracking_health);
        const isLost = v.tracking_health === 'TRACKING_LOST';
        const isDelayed = v.tracking_health === 'TRACKING_DELAYED';
        const arrow = getHeadingArrow(v.current_heading);

        const lastSeenText =
          v.seconds_since_last_gps !== null
            ? v.seconds_since_last_gps < 60
              ? `${v.seconds_since_last_gps} วินาทีที่แล้ว`
              : `${Math.round(v.seconds_since_last_gps / 60)} นาทีที่แล้ว`
            : 'ไม่ระบุ';

        return (
          <Marker
            key={`vehicle-${v.id}`}
            position={[Number(v.current_latitude), Number(v.current_longitude)]}
            icon={createVehicleIcon(v)}
          >
            <Popup minWidth={270} maxWidth={330}>
              <div className="p-3 text-slate-100 space-y-2.5">
                {/* Header with Vehicle Code and Registration */}
                <div className="flex items-center justify-between border-b border-slate-700/80 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🚑</span>
                    <div>
                      <h4 className="font-bold text-base text-white">{v.vehicle_code}</h4>
                      <p className="text-xs text-slate-400">{v.registration_no}</p>
                    </div>
                  </div>
                  <span
                    className="px-2 py-0.5 rounded text-[11px] font-bold border"
                    style={{
                      backgroundColor: `${styles.bg}22`,
                      borderColor: styles.border,
                      color: styles.border,
                    }}
                  >
                    {styles.labelTh}
                  </span>
                </div>

                {/* Stale / Tracking Lost Warning (Critical Rule Section 5 & 22) */}
                {(isLost || isDelayed) && (
                  <div className="p-2 rounded bg-amber-950/60 border border-amber-500/50 flex items-start gap-2 text-xs text-amber-200">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-amber-300">
                        {isLost
                          ? '⚠️ LAST KNOWN LOCATION (พิกัดล่าสุดที่บันทึกได้)'
                          : '⚠️ ตำแหน่งอาจไม่เป็นปัจจุบัน (Stale)'}
                      </p>
                      <p className="text-[11px] text-amber-200/90">
                        สัญญาณหายไปเมื่อ: {lastSeenText}
                        <br />
                        <span className="text-slate-400 text-[10px]">
                          ห้ามเคลื่อนหมุดจำลองหรือถือเป็นพิกัดปัจจุบัน
                        </span>
                      </p>
                    </div>
                  </div>
                )}

                {/* Telematics Info Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-800/80 p-2 rounded-lg border border-slate-700/50">
                  <div>
                    <span className="text-slate-400 block text-[10px]">ความเร็ว (Speed)</span>
                    <span className="font-semibold text-slate-200 text-sm">
                      {v.is_stopped && !isLost ? (
                        <span className="text-sky-300">0 km/h (จอดนิ่ง)</span>
                      ) : (
                        `${Math.round(v.current_speed)} km/h`
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">ทิศทาง (Heading)</span>
                    <span className="font-semibold text-slate-200 text-sm">
                      {v.current_heading !== null ? `${Math.round(v.current_heading)}° ${arrow}` : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">คุณภาพ GPS</span>
                    <span
                      className={`font-semibold ${
                        v.gps_quality === 'GOOD' ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {v.gps_quality}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">อัปเดตล่าสุด</span>
                    <span className="font-semibold text-slate-200">{lastSeenText}</span>
                  </div>
                </div>

                {/* Mission & Crew Information */}
                {v.active_mission ? (
                  <div className="space-y-1 text-xs border-t border-slate-700/60 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">ภารกิจ:</span>
                      <span className="font-bold text-sky-400">{v.active_mission.mission_no}</span>
                    </div>
                    {v.active_mission.destination_name && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">ปลายทาง:</span>
                        <span className="font-semibold text-slate-200 text-right truncate max-w-[150px]">
                          {v.active_mission.destination_name}
                        </span>
                      </div>
                    )}
                    {v.driver && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">พนักงานขับรถ:</span>
                        <span className="text-slate-200">{v.driver.display_name}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">ลูกเรือ EMS:</span>
                      <span className="text-slate-200">{v.crew_count || 0} คน</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 italic text-center py-1">
                    ไม่มีภารกิจผูกติดในขณะนี้ (รถพร้อมสั่งการ)
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-1.5 pt-2 border-t border-slate-700/60">
                  <button
                    onClick={() =>
                      onSelectMission &&
                      v.active_mission &&
                      onSelectMission(v.active_mission.mission_no)
                    }
                    className="flex-1 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-semibold text-center transition-colors"
                  >
                    ดูภารกิจ
                  </button>
                  <button
                    onClick={() => {
                      if (v.active_mission && onShowTrack) {
                        onShowTrack(v.active_mission.mission_no);
                      } else {
                        showInfo('เส้นทางภารกิจ', `รถ ${v.vehicle_code} ยังไม่มีบันทึกเส้นทางภารกิจปัจจุบัน`);
                      }
                    }}
                    className="flex-1 py-1.5 bg-cyan-700 hover:bg-cyan-600 text-white rounded text-xs font-semibold text-center transition-colors flex items-center justify-center gap-1"
                  >
                    <Route className="w-3.5 h-3.5" />
                    <span>ดูเส้นทาง</span>
                  </button>
                  <button
                    onClick={() => {
                      if (v.active_mission && onShowTrack) {
                        onShowTrack(v.active_mission.mission_no);
                      } else {
                        showToast(`รถ ${v.vehicle_code} สแตนด์บายพร้อมปฏิบัติการ`, 'info');
                      }
                    }}
                    className="flex-1 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-xs font-medium text-center transition-colors"
                  >
                    Timeline
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
};
