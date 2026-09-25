import React, { useState } from 'react';
import { FacilityData } from '../../types/ems';
import { createReferMission } from '../../services/api';
import { X, Send, AlertCircle, Building2 } from 'lucide-react';

interface CreateReferModalProps {
  isOpen: boolean;
  onClose: () => void;
  facilities: FacilityData[];
  onCreated: () => void;
}

export const CreateReferModal: React.FC<CreateReferModalProps> = ({
  isOpen,
  onClose,
  facilities,
  onCreated,
}) => {
  const [originId, setOriginId] = useState<number>(facilities[0]?.id || 1);
  const [destId, setDestId] = useState<number>(facilities[1]?.id || 2);
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (originId === destId) {
      setError('โรงพยาบาลต้นทางและปลายทางต้องไม่เป็นแห่งเดียวกัน');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await createReferMission({
        originFacilityId: originId,
        destinationFacilityId: destId,
        notes,
      });

      if (res.success) {
        onCreated();
        onClose();
      } else {
        setError(res.message || 'ไม่สามารถสร้างภารกิจได้');
      }
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-100 p-2 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-600/30">
            <span className="text-xl">🚑</span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">สร้างภารกิจส่งต่อผู้ป่วย (Refer Mission)</h3>
            <p className="text-xs text-slate-400">ระบบบริหารจัดการและติดตามรถส่งต่อ รพ.โพธาราม</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-sky-400" />
              โรงพยาบาลต้นทาง (Origin Facility)
            </label>
            <select
              value={originId}
              onChange={(e) => setOriginId(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              {facilities.map((fac) => (
                <option key={fac.id} value={fac.id}>
                  {fac.name} ({fac.facility_code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-emerald-400" />
              โรงพยาบาลปลายทาง (Destination Facility)
            </label>
            <select
              value={destId}
              onChange={(e) => setDestId(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {facilities.map((fac) => (
                <option key={fac.id} value={fac.id}>
                  {fac.name} ({fac.facility_code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              บันทึกรายละเอียดภารกิจ / สาเหตุการส่งต่อ (Notes)
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="เช่น ผู้ป่วย STEMI ส่งต่อทำ PCI ด่วน หรือผู้ป่วย Trauma ส่งต่อ CT Scan"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-sm font-semibold bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white rounded-xl shadow-lg shadow-sky-600/30 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{loading ? 'กำลังบันทึก...' : 'สร้างภารกิจส่งต่อ'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
