import React from 'react';
import { VehicleMarkerData } from '../../types/ems';
import { Route, Navigation, Shield, Phone, Clock, Gauge, X, ExternalLink } from 'lucide-react';

interface MobileVehicleBottomSheetProps {
  vehicle: VehicleMarkerData | null;
  onClose: () => void;
  onShowTrack: (missionIdOrNo: string | number) => void;
  onSelectMission?: (missionNo: string) => void;
}

export const MobileVehicleBottomSheet: React.FC<MobileVehicleBottomSheetProps> = ({
  vehicle,
  onClose,
  onShowTrack,
  onSelectMission,
}) => {
  if (!vehicle) return null;

  const isAvailable = vehicle.status === 'AVAILABLE';
  const hasActiveMission = Boolean(vehicle.active_mission);

  return (
    <div className="fixed inset-x-0 bottom-0 z-[1500] sm:hidden animate-in slide-in-from-bottom duration-300">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm -z-10" onClick={onClose} />

      {/* Sheet Content */}
      <div className="bg-slate-900 border-t border-slate-700/80 rounded-t-3xl shadow-2xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] text-slate-100 max-h-[80vh] overflow-y-auto">
        {/* Drag Handle */}
        <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-4" />

        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-sky-600/20 border border-sky-500/40 flex items-center justify-center text-2xl shadow-inner">
              🚑
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-tight">{vehicle.vehicle_code}</h3>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                  {vehicle.registration_no}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{vehicle.vehicle_type}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/80 border border-slate-700 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Telemetry Stats Grid */}
        <div className="grid grid-cols-3 gap-2.5 mb-4">
          <div className="bg-slate-950/70 border border-slate-800 p-2.5 rounded-xl text-center">
            <span className="text-[10px] text-slate-400 block mb-0.5">สถานะรถ</span>
            <span className={`text-xs font-bold ${isAvailable ? 'text-emerald-400' : 'text-amber-400'}`}>
              {vehicle.status}
            </span>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 p-2.5 rounded-xl text-center">
            <span className="text-[10px] text-slate-400 block mb-0.5">ความเร็ว</span>
            <span className="text-xs font-extrabold text-white flex items-center justify-center gap-1">
              <Gauge className="w-3 h-3 text-sky-400" />
              {vehicle.current_speed} <span className="text-[10px] text-slate-400 font-normal">กม./ชม.</span>
            </span>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 p-2.5 rounded-xl text-center">
            <span className="text-[10px] text-slate-400 block mb-0.5">สัญญาณ GPS</span>
            <span
              className={`text-xs font-bold ${
                vehicle.tracking_health === 'TRACKING'
                  ? 'text-emerald-400'
                  : vehicle.tracking_health === 'TRACKING_DELAYED'
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              {vehicle.gps_quality}
            </span>
          </div>
        </div>

        {/* Driver Details */}
        {vehicle.driver && (
          <div className="bg-slate-800/60 border border-slate-700/60 p-3 rounded-xl mb-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 block">พนักงานขับรถ</span>
              <span className="text-xs font-semibold text-white">👤 {vehicle.driver.display_name}</span>
            </div>
            {vehicle.driver.phone && (
              <a
                href={`tel:${vehicle.driver.phone}`}
                className="px-3 py-1.5 bg-emerald-600/90 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-transform"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>โทรออก</span>
              </a>
            )}
          </div>
        )}

        {/* Active Mission Card */}
        {hasActiveMission && vehicle.active_mission && (
          <div className="bg-sky-950/40 border border-sky-800/60 p-3 rounded-xl mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-sky-300">
                ภารกิจ {vehicle.active_mission.mission_no}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">
                {vehicle.active_mission.mission_type}
              </span>
            </div>
            <p className="text-xs text-slate-300 line-clamp-1 mb-1">
              ปลายทาง: {vehicle.active_mission.destination_name || vehicle.active_mission.scene_description || 'ไม่ระบุ'}
            </p>
            <div className="text-[10px] text-slate-400">
              สถานะ: <span className="text-amber-400 font-semibold">{vehicle.active_mission.status}</span>
            </div>
          </div>
        )}

        {/* Action Buttons (Touch Target 44px+) */}
        <div className="flex gap-2">
          {hasActiveMission && vehicle.active_mission && (
            <button
              onClick={() => {
                onShowTrack(vehicle.active_mission!.mission_no);
                onClose();
              }}
              className="flex-1 py-3 px-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-cyan-600/30 flex items-center justify-center gap-2 min-h-[44px] transition-all"
            >
              <Route className="w-4 h-4" />
              <span>ดูเส้นทาง GPS</span>
            </button>
          )}

          {hasActiveMission && vehicle.active_mission && onSelectMission && (
            <button
              onClick={() => {
                onSelectMission(vehicle.active_mission!.mission_no);
                onClose();
              }}
              className="flex-1 py-3 px-4 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-sky-600/30 flex items-center justify-center gap-2 min-h-[44px] transition-all"
            >
              <ExternalLink className="w-4 h-4" />
              <span>ดูรายละเอียดภารกิจ</span>
            </button>
          )}

          {(!hasActiveMission || !vehicle.active_mission) && (
            <button
              onClick={onClose}
              className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl min-h-[44px] transition-all"
            >
              ปิดหน้าต่าง
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
