import React from 'react';
import { Polyline, CircleMarker, Popup, Marker } from 'react-leaflet';
import L from 'leaflet';
import { GpsTrackPoint, MissionTrackResponse } from '../../types/ems';

interface ActualTrackPolylineLayerProps {
  trackData: MissionTrackResponse | null;
  visible: boolean;
}

const startPinIcon = L.divIcon({
  html: `
    <div style="background: #10b981; color: white; padding: 2px 6px; border-radius: 9999px; font-weight: 700; font-size: 10px; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.5); white-space: nowrap;">
      🟢 จุดเริ่มต้น
    </div>
  `,
  className: 'custom-track-start-pin',
  iconSize: [60, 24],
  iconAnchor: [30, 24],
});

export const ActualTrackPolylineLayer: React.FC<ActualTrackPolylineLayerProps> = ({
  trackData,
  visible,
}) => {
  if (!visible || !trackData || trackData.track_points.length === 0) {
    return null;
  }

  const positions: [number, number][] = trackData.track_points.map((pt) => [
    Number(pt.latitude),
    Number(pt.longitude),
  ]);

  const firstPoint = trackData.track_points[0];
  const lastPoint = trackData.track_points[trackData.track_points.length - 1];

  return (
    <>
      {/* Background Outer Glow Polyline */}
      <Polyline
        positions={positions}
        pathOptions={{
          color: '#06b6d4',
          weight: 7,
          opacity: 0.35,
          lineCap: 'round',
          lineJoin: 'round',
        }}
      />

      {/* Main Sharp Core Polyline */}
      <Polyline
        positions={positions}
        pathOptions={{
          color: '#22d3ee',
          weight: 3.5,
          opacity: 0.95,
          lineCap: 'round',
          lineJoin: 'round',
          dashArray: '1, 6', // Distinguishes from solid highway maps
        }}
      >
        <Popup minWidth={240}>
          <div className="p-2 text-xs space-y-1.5 text-slate-100">
            <div className="font-bold text-cyan-400 flex items-center gap-1.5 border-b border-slate-700 pb-1">
              <span>📍</span>
              <span>Actual GPS Track (เส้นทางเดินทางจริง)</span>
            </div>
            <div className="text-[11px] text-slate-300">
              ภารกิจ: <strong className="text-white">{trackData.mission_no}</strong>
            </div>
            <div className="text-[11px] text-slate-300">
              รถ: <strong className="text-white">{trackData.vehicle_code}</strong>
            </div>
            <div className="flex justify-between text-[11px] pt-1">
              <span className="text-slate-400">ระยะทางตรวจสอบแล้ว:</span>
              <span className="font-bold text-emerald-400">{trackData.validated_distance_km} กม.</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">จำนวนจุดพิกัด:</span>
              <span className="text-slate-200">{trackData.points_count} จุด</span>
            </div>
            <p className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-800">
              * ข้อมูลจาก GPS อุปกรณ์ ไม่ใช่เส้นทางแนะนำจำลอง
            </p>
          </div>
        </Popup>
      </Polyline>

      {/* Origin/Start Marker */}
      {firstPoint && (
        <Marker
          position={[Number(firstPoint.latitude), Number(firstPoint.longitude)]}
          icon={startPinIcon}
        />
      )}

      {/* Point dots with speed info on hover/click */}
      {trackData.track_points.map((pt, index) => (
        <CircleMarker
          key={`track-pt-${index}`}
          center={[Number(pt.latitude), Number(pt.longitude)]}
          radius={index === trackData.track_points.length - 1 ? 5 : 3.5}
          pathOptions={{
            color: '#ffffff',
            fillColor: pt.speed > 80 ? '#f59e0b' : '#06b6d4',
            fillOpacity: 0.9,
            weight: 1.5,
          }}
        >
          <Popup minWidth={180}>
            <div className="p-1.5 text-xs text-slate-200 space-y-1">
              <div className="font-bold text-sky-400 text-[11px]">
                จุดที่ #{index + 1} ({new Date(pt.recorded_at).toLocaleTimeString('th-TH')})
              </div>
              <div className="flex justify-between text-[11px]">
                <span>ความเร็ว:</span>
                <span className="font-bold text-white">{Math.round(pt.speed)} km/h</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span>ทิศทาง:</span>
                <span>{pt.heading != null ? `${Math.round(pt.heading)}°` : '—'}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span>คุณภาพ GPS:</span>
                <span className={pt.gps_quality === 'GOOD' ? 'text-emerald-400' : 'text-amber-400'}>
                  {pt.gps_quality}
                </span>
              </div>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </>
  );
};
