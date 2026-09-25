import React, { useState } from 'react';
import { EmsBaseData } from '../../types/ems';
import { MapLocationPicker } from '../map/MapLocationPicker';
import { MapPin, X, Check } from 'lucide-react';

interface BaseModalProps {
  isOpen: boolean;
  base?: Partial<EmsBaseData> | null;
  onClose: () => void;
  onSave: (data: Partial<EmsBaseData>) => Promise<void>;
}

export const BaseModal: React.FC<BaseModalProps> = ({
  isOpen,
  base,
  onClose,
  onSave,
}) => {
  if (!isOpen) return null;

  const [name, setName] = useState(base?.name || '');
  const [latitude, setLatitude] = useState(base?.latitude || 13.693822);
  const [longitude, setLongitude] = useState(base?.longitude || 99.851921);
  const [geofenceRadius, setGeofenceRadius] = useState(base?.geofence_radius || 150);
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      alert('กรุณากรอกชื่อฐานกู้ชีพ');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        id: base?.id,
        name,
        latitude,
        longitude,
        geofence_radius: geofenceRadius,
        active: true,
      });
      onClose();
    } catch (err: any) {
      alert('บันทึกไม่สำเร็จ: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-8">
        <div className="p-4 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-teal-400" />
            <h3 className="font-bold text-slate-100 text-base">
              {base?.id ? 'แก้ไขฐานกู้ชีพ EMS Base' : 'เพิ่มฐานกู้ชีพ EMS Base ใหม่'}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {showPicker ? (
          <div className="p-4">
            <MapLocationPicker
              initialLatitude={latitude}
              initialLongitude={longitude}
              initialRadius={geofenceRadius}
              title={`ปักหมุดตำแหน่งฐาน: ${name || 'EMS Base'}`}
              onConfirm={(loc) => {
                setLatitude(loc.latitude);
                setLongitude(loc.longitude);
                setGeofenceRadius(loc.radius);
                setShowPicker(false);
              }}
              onCancel={() => setShowPicker(false)}
            />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                ชื่อฐานกู้ชีพ / จุดจอดรถ EMS *
              </label>
              <input
                type="text"
                required
                placeholder="เช่น ศูนย์กู้ชีพและส่งต่อ รพ.โพธาราม (Main Station)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100 focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                รัศมี Geofence ตรวจจับการเข้า-ออกฐาน (เมตร)
              </label>
              <input
                type="number"
                min="50"
                max="1000"
                value={geofenceRadius}
                onChange={(e) => setGeofenceRadius(parseInt(e.target.value, 10) || 150)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100 focus:ring-2 focus:ring-teal-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                เมื่อรถพยาบาลเคลื่อนเข้าหรือออกจากรัศมีนี้ ระบบจะตรวจจับ Geofence Enter/Exit อัตโนมัติ
              </p>
            </div>

            <div className="p-4 bg-slate-800/60 border border-slate-700/80 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-teal-400" /> พิกัดที่ตั้งฐาน (GPS Coordinates)
                </span>
                <button
                  type="button"
                  onClick={() => setShowPicker(true)}
                  className="px-3 py-1 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 shadow-sm shadow-teal-600/30"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>เปิดแผนที่ปักหมุด</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="bg-slate-900 p-2 rounded border border-slate-700">
                  <span className="text-slate-400 text-[10px] block font-sans">Latitude</span>
                  <span className="text-slate-200">{latitude.toFixed(6)}</span>
                </div>
                <div className="bg-slate-900 p-2 rounded border border-slate-700">
                  <span className="text-slate-400 text-[10px] block font-sans">Longitude</span>
                  <span className="text-slate-200">{longitude.toFixed(6)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-teal-600/30 transition-all hover:scale-105"
              >
                <Check className="w-4 h-4" />
                <span>{saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูลฐาน'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
