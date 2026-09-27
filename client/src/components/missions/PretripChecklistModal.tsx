import React, { useState } from 'react';
import { submitPretripChecklist } from '../../services/api';
import { X, CheckCircle2, AlertTriangle, ShieldCheck, Fuel, Gauge, Radio, Video, Stethoscope, Lightbulb } from 'lucide-react';

interface PretripChecklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  missionId: number;
  missionNo: string;
  vehicleCode: string;
  onCompleted: () => void;
}

export const PretripChecklistModal: React.FC<PretripChecklistModalProps> = ({
  isOpen,
  onClose,
  missionId,
  missionNo,
  vehicleCode,
  onCompleted,
}) => {
  const [fuelLevel, setFuelLevel] = useState<string>('FULL');
  const [oxygenPsi, setOxygenPsi] = useState<number>(2000);
  const [medicalEquipment, setMedicalEquipment] = useState<boolean>(true);
  const [lightsSiren, setLightsSiren] = useState<boolean>(true);
  const [tiresBrakes, setTiresBrakes] = useState<boolean>(true);
  const [communication, setCommunication] = useState<boolean>(true);
  const [dashcamGps, setDashcamGps] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await submitPretripChecklist(missionId, {
        fuelLevel,
        oxygenLevelPsi: Number(oxygenPsi),
        medicalEquipmentReady: medicalEquipment,
        lightsSirenWorking: lightsSiren,
        tiresBrakesChecked: tiresBrakes,
        communicationDeviceReady: communication,
        dashcamGpsReady: dashcamGps,
        notes,
      });

      if (res.success) {
        onCompleted();
        onClose();
      } else {
        setError(res.message || 'ไม่สามารถบันทึกรายการตรวจสอบได้');
      }
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-ems-canvas/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-ems-surface border border-ems-border rounded-2xl max-w-lg w-full p-6 shadow-2xl relative text-ems-ink max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-ems-muted hover:text-ems-ink p-2 rounded-lg hover:bg-ems-inset transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-600/30">
            <ShieldCheck className="w-5 h-5 text-ems-ink" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-ems-ink">ตรวจสอบความพร้อมรถพยาบาล (Pre-trip Checklist)</h3>
            <p className="text-xs text-ems-muted">
              รถคัน: <span className="text-emerald-700 font-bold">{vehicleCode}</span> | ภารกิจ: <span className="font-mono text-ems-muted">{missionNo}</span>
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Fuel & Oxygen */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-ems-canvas/50 p-3.5 rounded-xl border border-ems-border">
            <div>
              <label className="block text-xs font-semibold text-ems-muted mb-1.5 flex items-center gap-1.5">
                <Fuel className="w-3.5 h-3.5 text-amber-700" />
                ระดับน้ำมันเชื้อเพลิง (Fuel Level)
              </label>
              <select
                value={fuelLevel}
                onChange={(e) => setFuelLevel(e.target.value)}
                className="w-full bg-ems-inset border border-ems-border rounded-lg px-2.5 py-1.5 text-xs text-ems-ink focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="FULL">เต็มถัง (100% Full)</option>
                <option value="THREE_QUARTERS">3/4 ถัง (75%)</option>
                <option value="HALF">1/2 ถัง (50%)</option>
                <option value="ONE_QUARTER">1/4 ถัง (25% - เตือน)</option>
                <option value="LOW">ระดับต่ำ (Low - ไม่แนะนำให้ออกรถ)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ems-muted mb-1.5 flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-sky-700" />
                แรงดันท่อออกซิเจน (Oxygen PSI)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="3000"
                  step="50"
                  value={oxygenPsi}
                  onChange={(e) => setOxygenPsi(Number(e.target.value))}
                  className="w-full bg-ems-inset border border-ems-border rounded-lg px-2.5 py-1.5 text-xs text-ems-ink focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <span className="absolute right-2.5 top-1.5 text-[10px] text-ems-muted">PSI</span>
              </div>
              {oxygenPsi < 500 && (
                <span className="text-[10px] text-rose-700 mt-1 block">⚠️ ต่ำกว่าเกณฑ์มาตรฐาน (500 PSI)</span>
              )}
            </div>
          </div>

          {/* Checklist items */}
          <div className="space-y-2 border border-ems-border rounded-xl p-3 bg-ems-canvas/40">
            <label className="text-xs font-semibold text-ems-muted block mb-1">
              รายการตรวจสอบความปลอดภัยก่อนออกรถ (Mandatory Checks)
            </label>

            <label className="flex items-center gap-2 p-2 rounded-lg bg-ems-inset/40 hover:bg-ems-inset cursor-pointer text-xs transition-colors">
              <input
                type="checkbox"
                checked={medicalEquipment}
                onChange={(e) => setMedicalEquipment(e.target.checked)}
                className="w-4 h-4 rounded text-sky-600 bg-slate-200 border-slate-300 focus:ring-sky-500"
              />
              <Stethoscope className="w-4 h-4 text-sky-700" />
              <span>อุปกรณ์การแพทย์ประจำรถ (Defibrillator, Suction, Bag-Valve-Mask) พร้อมใช้งาน</span>
            </label>

            <label className="flex items-center gap-2 p-2 rounded-lg bg-ems-inset/40 hover:bg-ems-inset cursor-pointer text-xs transition-colors">
              <input
                type="checkbox"
                checked={lightsSiren}
                onChange={(e) => setLightsSiren(e.target.checked)}
                className="w-4 h-4 rounded text-sky-600 bg-slate-200 border-slate-300 focus:ring-sky-500"
              />
              <Lightbulb className="w-4 h-4 text-amber-700" />
              <span>สัญญาณไฟฉุกเฉินและไซเรน (Lights & Siren) ทำงานปกติทั้งภายนอกและภายใน</span>
            </label>

            <label className="flex items-center gap-2 p-2 rounded-lg bg-ems-inset/40 hover:bg-ems-inset cursor-pointer text-xs transition-colors">
              <input
                type="checkbox"
                checked={tiresBrakes}
                onChange={(e) => setTiresBrakes(e.target.checked)}
                className="w-4 h-4 rounded text-sky-600 bg-slate-200 border-slate-300 focus:ring-sky-500"
              />
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>ลมยาง เบรก และสภาพภายนอกตัวรถ ผ่านการตรวจสอบรอบคัน</span>
            </label>

            <label className="flex items-center gap-2 p-2 rounded-lg bg-ems-inset/40 hover:bg-ems-inset cursor-pointer text-xs transition-colors">
              <input
                type="checkbox"
                checked={communication}
                onChange={(e) => setCommunication(e.target.checked)}
                className="w-4 h-4 rounded text-sky-600 bg-slate-200 border-slate-300 focus:ring-sky-500"
              />
              <Radio className="w-4 h-4 text-indigo-700" />
              <span>วิทยุสื่อสารและโทรศัพท์ประจำรถ เปิดใช้งานและทดสอบสัญญาณกับศูนย์สั่งการแล้ว</span>
            </label>

            <label className="flex items-center gap-2 p-2 rounded-lg bg-ems-inset/40 hover:bg-ems-inset cursor-pointer text-xs transition-colors">
              <input
                type="checkbox"
                checked={dashcamGps}
                onChange={(e) => setDashcamGps(e.target.checked)}
                className="w-4 h-4 rounded text-sky-600 bg-slate-200 border-slate-300 focus:ring-sky-500"
              />
              <Video className="w-4 h-4 text-rose-700" />
              <span>กล้องหน้ารถ (Dashcam) และระบบ GPS Telematics ออนไลน์พร้อมระบุตำแหน่ง</span>
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ems-muted mb-1">
              หมายเหตุสภาพรถเพิ่มเติม (ถ้ามี)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="เช่น มีรอยขีดข่วนกันชนหน้าซ้ายเดิม หรือเติมลมยางเรียบร้อย"
              className="w-full bg-ems-inset border border-ems-border rounded-lg px-3 py-1.5 text-xs text-ems-ink placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-ems-muted hover:text-ems-ink hover:bg-ems-inset rounded-xl transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-sm font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? 'กำลังบันทึก...' : 'บันทึกผลการตรวจสภาพรถ'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
