import React from 'react';
import { Search, Filter, AlertTriangle, ShieldCheck, Ambulance, Clock } from 'lucide-react';
import { MapFilterType, VehicleMarkerData } from '../../types/ems';

interface MapFilterBarProps {
  currentFilter: MapFilterType;
  onFilterChange: (filter: MapFilterType) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  vehicles: VehicleMarkerData[];
}

export const MapFilterBar: React.FC<MapFilterBarProps> = ({
  currentFilter,
  onFilterChange,
  searchQuery,
  onSearchChange,
  vehicles,
}) => {
  // Compute counts
  const availableCount = vehicles.filter((v) => v.status === 'AVAILABLE').length;
  const referCount = vehicles.filter(
    (v) => v.active_mission?.mission_type === 'REFER' && v.status !== 'AVAILABLE'
  ).length;
  const emergencyCount = vehicles.filter(
    (v) => v.active_mission?.mission_type === 'EMERGENCY' && v.status !== 'AVAILABLE'
  ).length;
  const trackingAlertCount = vehicles.filter(
    (v) => v.tracking_health === 'TRACKING_DELAYED' || v.tracking_health === 'TRACKING_LOST'
  ).length;

  const filters: { id: MapFilterType; label: string; count?: number; color?: string }[] = [
    { id: 'ALL', label: 'ทั้งหมด', count: vehicles.length },
    { id: 'AVAILABLE', label: 'พร้อมใช้งาน', count: availableCount, color: 'text-emerald-400' },
    { id: 'REFER', label: 'กำลัง Refer', count: referCount, color: 'text-indigo-400' },
    { id: 'EMERGENCY', label: 'ออกเหตุฉุกเฉิน', count: emergencyCount, color: 'text-rose-400' },
    { id: 'EN_ROUTE', label: 'กำลังเดินทาง' },
    { id: 'AT_SCENE', label: 'ถึงจุดเกิดเหตุ' },
    { id: 'RETURNING', label: 'กำลังกลับฐาน' },
    { id: 'TRACKING_ALERT', label: 'Tracking Alert', count: trackingAlertCount, color: 'text-amber-400' },
  ];

  return (
    <div className="bg-slate-900/95 border-b border-slate-800 p-3 sm:p-4 backdrop-blur shadow-sm">
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search input (Vehicle, Mission, Driver) */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหา รถ (EMS-01), เลขภารกิจ, หรือชื่อคนขับ..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-800/90 border border-slate-700/80 rounded-lg text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-2.5 text-xs text-slate-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Badges / Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-thin">
          {filters.map((f) => {
            const isActive = currentFilter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => onFilterChange(f.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-sky-600 text-white font-semibold shadow-sm shadow-sky-600/30'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/80 hover:text-white border border-slate-700/50'
                }`}
              >
                <span>{f.label}</span>
                {f.count !== undefined && (
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-white/20 text-white' : f.color || 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {f.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
