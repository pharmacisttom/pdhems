import React, { useState } from 'react';
import { Layers, Check, Car, Building2, MapPin, Radio, Eye, EyeOff } from 'lucide-react';
import { MapLayersState } from '../../types/ems';

interface MapLayerControlProps {
  layers: MapLayersState;
  onChangeLayer: (key: keyof MapLayersState) => void;
  vehicleCount: number;
  facilityCount: number;
  baseCount: number;
}

export const MapLayerControl: React.FC<MapLayerControlProps> = ({
  layers,
  onChangeLayer,
  vehicleCount,
  facilityCount,
  baseCount,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="absolute top-4 right-4 z-[1000]">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700/80 rounded-xl shadow-xl backdrop-blur text-xs font-semibold transition-all hover:scale-105"
        title="จัดการชั้นข้อมูลแผนที่ (Map Layers)"
      >
        <Layers className="w-4 h-4 text-sky-400" />
        <span className="hidden sm:inline">ชั้นข้อมูล (Layers)</span>
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div className="mt-2 w-64 p-3 bg-slate-900/95 border border-slate-700/80 rounded-xl shadow-2xl backdrop-blur text-xs space-y-2.5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-sky-400" /> ควบคุม Layer แผนที่
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white text-sm"
            >
              ✕
            </button>
          </div>

          <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-800/80 cursor-pointer">
            <span className="flex items-center gap-2 text-slate-300">
              <span className="text-sm">🚑</span> รถกู้ชีพ/รีเฟอร์ ({vehicleCount})
            </span>
            <input
              type="checkbox"
              checked={layers.vehicles}
              onChange={() => onChangeLayer('vehicles')}
              className="rounded bg-slate-700 border-slate-600 text-sky-500 focus:ring-sky-500 w-4 h-4"
            />
          </label>

          <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-800/80 cursor-pointer">
            <span className="flex items-center gap-2 text-slate-300">
              <span className="text-sm">🏥</span> โรงพยาบาล/ปลายทาง ({facilityCount})
            </span>
            <input
              type="checkbox"
              checked={layers.facilities}
              onChange={() => onChangeLayer('facilities')}
              className="rounded bg-slate-700 border-slate-600 text-sky-500 focus:ring-sky-500 w-4 h-4"
            />
          </label>

          <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-800/80 cursor-pointer">
            <span className="flex items-center gap-2 text-slate-300">
              <span className="text-sm">📍</span> ฐานกู้ชีพ EMS Base ({baseCount})
            </span>
            <input
              type="checkbox"
              checked={layers.bases}
              onChange={() => onChangeLayer('bases')}
              className="rounded bg-slate-700 border-slate-600 text-sky-500 focus:ring-sky-500 w-4 h-4"
            />
          </label>

          <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-800/80 cursor-pointer">
            <span className="flex items-center gap-2 text-slate-300">
              <span className="text-sm">⭕</span> รัศมี Geofence (เขตรอบ)
            </span>
            <input
              type="checkbox"
              checked={layers.geofences}
              onChange={() => onChangeLayer('geofences')}
              className="rounded bg-slate-700 border-slate-600 text-sky-500 focus:ring-sky-500 w-4 h-4"
            />
          </label>

          <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-800/80 cursor-pointer">
            <span className="flex items-center gap-2 text-slate-300">
              <span className="text-sm">🚨</span> จุดเกิดเหตุฉุกเฉิน
            </span>
            <input
              type="checkbox"
              checked={layers.activeEmergencyScenes}
              onChange={() => onChangeLayer('activeEmergencyScenes')}
              className="rounded bg-slate-700 border-slate-600 text-sky-500 focus:ring-sky-500 w-4 h-4"
            />
          </label>

          <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-800/80 cursor-pointer">
            <span className="flex items-center gap-2 text-slate-300">
              <span className="text-sm">เส้นทาง</span> เส้นทาง GPS เดินทางจริง (Actual)
            </span>
            <input
              type="checkbox"
              checked={layers.actualTracks}
              onChange={() => onChangeLayer('actualTracks')}
              className="rounded bg-slate-700 border-slate-600 text-cyan-400 focus:ring-cyan-500 w-4 h-4"
            />
          </label>

          <div className="pt-2 border-t border-slate-800">
            <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-800/80 cursor-pointer">
              <span className="flex items-center gap-2 text-slate-300">
                <span className="text-sm">🌙</span> แผนที่โหมดกลางคืน (Dark)
              </span>
              <input
                type="checkbox"
                checked={layers.trafficOrDark}
                onChange={() => onChangeLayer('trafficOrDark')}
                className="rounded bg-slate-700 border-slate-600 text-sky-500 focus:ring-sky-500 w-4 h-4"
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
};
