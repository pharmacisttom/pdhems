import React, { useState } from 'react';
import { Layers, Check, Car, Building2, MapPin, Radio, Eye, EyeOff, Globe } from 'lucide-react';
import { MapLayersState } from '../../types/ems';
import { GisExportModal } from './GisExportModal';

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
  const [isGisModalOpen, setIsGisModalOpen] = useState(false);

  return (
    <div className="absolute top-4 right-4 z-[1000]">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-ems-surface/90 hover:bg-ems-inset text-ems-ink border border-ems-border/80 rounded-xl shadow-xl backdrop-blur text-xs font-semibold transition-all hover:scale-105"
        title="จัดการชั้นข้อมูลแผนที่ (Map Layers)"
      >
        <Layers className="w-4 h-4 text-sky-700" />
        <span className="hidden sm:inline">ชั้นข้อมูล (Layers)</span>
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div className="mt-2 w-64 p-3 bg-ems-surface/95 border border-ems-border/80 rounded-xl shadow-2xl backdrop-blur text-xs space-y-2.5">
          <div className="flex items-center justify-between pb-2 border-b border-ems-border">
            <span className="font-bold text-ems-ink flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-sky-700" /> ควบคุม Layer แผนที่
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-ems-muted hover:text-ems-ink text-sm"
            >
              ✕
            </button>
          </div>

          <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-ems-inset/80 cursor-pointer">
            <span className="flex items-center gap-2 text-ems-muted">
              <span className="text-sm">🚑</span> รถกู้ชีพ/รีเฟอร์ ({vehicleCount})
            </span>
            <input
              type="checkbox"
              checked={layers.vehicles}
              onChange={() => onChangeLayer('vehicles')}
              className="rounded bg-slate-200 border-slate-300 text-sky-500 focus:ring-sky-500 w-4 h-4"
            />
          </label>

          <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-ems-inset/80 cursor-pointer">
            <span className="flex items-center gap-2 text-ems-muted">
              <span className="text-sm">🏥</span> โรงพยาบาล/ปลายทาง ({facilityCount})
            </span>
            <input
              type="checkbox"
              checked={layers.facilities}
              onChange={() => onChangeLayer('facilities')}
              className="rounded bg-slate-200 border-slate-300 text-sky-500 focus:ring-sky-500 w-4 h-4"
            />
          </label>

          <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-ems-inset/80 cursor-pointer">
            <span className="flex items-center gap-2 text-ems-muted">
              <span className="text-sm">📍</span> ฐานกู้ชีพ EMS Base ({baseCount})
            </span>
            <input
              type="checkbox"
              checked={layers.bases}
              onChange={() => onChangeLayer('bases')}
              className="rounded bg-slate-200 border-slate-300 text-sky-500 focus:ring-sky-500 w-4 h-4"
            />
          </label>

          <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-ems-inset/80 cursor-pointer">
            <span className="flex items-center gap-2 text-ems-muted">
              <span className="text-sm">⭕</span> รัศมี Geofence (เขตรอบ)
            </span>
            <input
              type="checkbox"
              checked={layers.geofences}
              onChange={() => onChangeLayer('geofences')}
              className="rounded bg-slate-200 border-slate-300 text-sky-500 focus:ring-sky-500 w-4 h-4"
            />
          </label>

          <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-ems-inset/80 cursor-pointer">
            <span className="flex items-center gap-2 text-ems-muted">
              <span className="text-sm">🚨</span> จุดเกิดเหตุฉุกเฉิน
            </span>
            <input
              type="checkbox"
              checked={layers.activeEmergencyScenes}
              onChange={() => onChangeLayer('activeEmergencyScenes')}
              className="rounded bg-slate-200 border-slate-300 text-sky-500 focus:ring-sky-500 w-4 h-4"
            />
          </label>

          <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-ems-inset/80 cursor-pointer">
            <span className="flex items-center gap-2 text-ems-muted">
              <span className="text-sm">เส้นทาง</span> เส้นทาง GPS เดินทางจริง (Actual)
            </span>
            <input
              type="checkbox"
              checked={layers.actualTracks}
              onChange={() => onChangeLayer('actualTracks')}
              className="rounded bg-slate-200 border-slate-300 text-cyan-700 focus:ring-cyan-500 w-4 h-4"
            />
          </label>

          <div className="pt-2 border-t border-ems-border">
            <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-ems-inset/80 cursor-pointer">
              <span className="flex items-center gap-2 text-ems-muted">
                <span className="text-sm">🌙</span> แผนที่โหมดกลางคืน (Dark)
              </span>
              <input
                type="checkbox"
                checked={layers.trafficOrDark}
                onChange={() => onChangeLayer('trafficOrDark')}
                className="rounded bg-slate-200 border-slate-300 text-sky-500 focus:ring-sky-500 w-4 h-4"
              />
            </label>
          </div>

          {/* GIS Export & Integration */}
          <div className="pt-2 border-t border-ems-border">
            <button
              onClick={() => {
                setIsOpen(false);
                setIsGisModalOpen(true);
              }}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-500 hover:to-teal-500 text-white font-medium text-xs rounded-lg shadow-md transition-all hover:scale-[1.02]"
            >
              <Globe className="w-3.5 h-3.5 text-sky-200" />
              <span>นำขึ้น GIS / Export GeoJSON</span>
            </button>
          </div>
        </div>
      )}

      {/* GIS Modal */}
      <GisExportModal
        isOpen={isGisModalOpen}
        onClose={() => setIsGisModalOpen(false)}
      />
    </div>
  );
};
