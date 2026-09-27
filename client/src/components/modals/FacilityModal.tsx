import React, { useState } from 'react';
import { FacilityData, FacilityType } from '../../types/ems';
import { MapLocationPicker } from '../map/MapLocationPicker';
import { Building2, MapPin, X, Check } from 'lucide-react';
import { showWarning, showError, showToast } from '../../services/alertService';

interface FacilityModalProps {
  isOpen: boolean;
  facility?: Partial<FacilityData> | null;
  onClose: () => void;
  onSave: (data: Partial<FacilityData>) => Promise<void>;
}

export const FacilityModal: React.FC<FacilityModalProps> = ({
  isOpen,
  facility,
  onClose,
  onSave,
}) => {
  if (!isOpen) return null;

  const [facilityCode, setFacilityCode] = useState(facility?.facility_code || '');
  const [name, setName] = useState(facility?.name || '');
  const [facilityType, setFacilityType] = useState<FacilityType>(
    facility?.facility_type || 'HOSPITAL'
  );
  const [latitude, setLatitude] = useState(facility?.latitude || 12.975600);
  const [longitude, setLongitude] = useState(facility?.longitude || 101.215500);
  const [geofenceRadius, setGeofenceRadius] = useState(facility?.geofence_radius || 200);
  const [phone, setPhone] = useState(facility?.phone_optional || '');
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facilityCode || !name) {
      await showWarning('กรุณากรอกข้อมูลให้ครบ', 'กรุณาระบุรหัสและชื่อสถานพยาบาล');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        id: facility?.id,
        facility_code: facilityCode,
        name,
        facility_type: facilityType,
        latitude,
        longitude,
        geofence_radius: geofenceRadius,
        phone_optional: phone || null,
        active: true,
      });
      showToast('บันทึกข้อมูลเรียบร้อยแล้ว', 'success');
      onClose();
    } catch (err: any) {
      await showError('บันทึกไม่สำเร็จ', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-ems-canvas/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-ems-surface border border-ems-border rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="p-4 bg-ems-inset/90 border-b border-ems-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-sky-700" />
            <h3 className="font-bold text-ems-ink text-base">
              {facility?.id ? 'แก้ไขข้อมูลโรงพยาบาล/ปลายทาง' : 'เพิ่มโรงพยาบาล/ปลายทางใหม่'}
            </h3>
          </div>
          <button onClick={onClose} className="text-ems-muted hover:text-ems-ink p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Location Picker Overlay if active */}
        {showPicker ? (
          <div className="p-4">
            <MapLocationPicker
              initialLatitude={latitude}
              initialLongitude={longitude}
              initialRadius={geofenceRadius}
              title={`ปักหมุดตำแหน่ง: ${name || 'โรงพยาบาล'}`}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-ems-muted mb-1">
                  รหัสสถานพยาบาล *
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น PDH, RB-CENTRAL"
                  value={facilityCode}
                  onChange={(e) => setFacilityCode(e.target.value)}
                  className="w-full px-3 py-2 bg-ems-inset border border-ems-border rounded-lg text-sm text-ems-ink focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ems-muted mb-1">
                  ประเภทสถานพยาบาล
                </label>
                <select
                  value={facilityType}
                  onChange={(e) => setFacilityType(e.target.value as FacilityType)}
                  className="w-full px-3 py-2 bg-ems-inset border border-ems-border rounded-lg text-sm text-ems-ink focus:ring-2 focus:ring-sky-500"
                >
                  <option value="HOSPITAL">HOSPITAL (โรงพยาบาลทั่วไป/แม่ข่าย)</option>
                  <option value="REGIONAL_HOSPITAL">REGIONAL_HOSPITAL (โรงพยาบาลศูนย์)</option>
                  <option value="GENERAL_HOSPITAL">GENERAL_HOSPITAL (โรงพยาบาลทั่วไป)</option>
                  <option value="COMMUNITY_HOSPITAL">COMMUNITY_HOSPITAL (โรงพยาบาลชุมชน)</option>
                  <option value="EMS_BASE">EMS_BASE (ฐานกู้ชีพ/จุดจอดรถ)</option>
                  <option value="OTHER">OTHER (อื่นๆ)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ems-muted mb-1">
                ชื่อสถานพยาบาล *
              </label>
              <input
                type="text"
                required
                placeholder="เช่น โรงพยาบาลกรุงเทพปลวกแดง หรือ โรงพยาบาลระยอง"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-ems-inset border border-ems-border rounded-lg text-sm text-ems-ink focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-ems-muted mb-1">
                  เบอร์โทรศัพท์ติดต่อ
                </label>
                <input
                  type="text"
                  placeholder="เช่น 032-123456"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-ems-inset border border-ems-border rounded-lg text-sm text-ems-ink focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ems-muted mb-1">
                  รัศมี Geofence (เมตร)
                </label>
                <input
                  type="number"
                  min="50"
                  max="2000"
                  value={geofenceRadius}
                  onChange={(e) => setGeofenceRadius(parseInt(e.target.value, 10) || 200)}
                  className="w-full px-3 py-2 bg-ems-inset border border-ems-border rounded-lg text-sm text-ems-ink focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            {/* Coordinates & Picker Button */}
            <div className="p-4 bg-ems-inset/60 border border-ems-border/80 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-ems-muted flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-rose-700" /> พิกัดภูมิศาสตร์ (GPS Coordinates)
                </span>
                <button
                  type="button"
                  onClick={() => setShowPicker(true)}
                  className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 shadow-sm shadow-sky-600/30"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>เปิดแผนที่ปักหมุด</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="bg-ems-surface p-2 rounded border border-ems-border">
                  <span className="text-ems-muted text-[10px] block font-sans">Latitude</span>
                  <span className="text-ems-ink">{latitude.toFixed(6)}</span>
                </div>
                <div className="bg-ems-surface p-2 rounded border border-ems-border">
                  <span className="text-ems-muted text-[10px] block font-sans">Longitude</span>
                  <span className="text-ems-ink">{longitude.toFixed(6)}</span>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-ems-border">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-ems-inset hover:bg-slate-200 text-ems-muted rounded-lg text-sm font-medium transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-sky-600/30 transition-all hover:scale-105"
              >
                <Check className="w-4 h-4" />
                <span>{saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
