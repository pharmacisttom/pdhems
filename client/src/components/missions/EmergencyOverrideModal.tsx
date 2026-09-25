import React, { useState } from 'react';
import { departMission } from '../../services/api';
import { X, AlertOctagon, Send, ShieldAlert } from 'lucide-react';

interface EmergencyOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  missionId: number;
  missionNo: string;
  missingRequirements: string[];
  onDeparted: () => void;
}

export const EmergencyOverrideModal: React.FC<EmergencyOverrideModalProps> = ({
  isOpen,
  onClose,
  missionId,
  missionNo,
  missingRequirements,
  onDeparted,
}) => {
  const [reason, setReason] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason || reason.trim().length < 5) {
      setError('กรุณาระบุเหตุผลความจำเป็นเร่งด่วนทางคลินิกอย่างน้อย 5 ตัวอักษร');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await departMission(missionId, {
        isEmergencyOverride: true,
        overrideReason: reason.trim(),
      });

      if (res.success) {
        onDeparted();
        onClose();
      } else {
        setError(res.message || 'ไม่สามารถออกรถแบบฉุกเฉินได้');
      }
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-rose-500/40 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-100 p-2 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-600 flex items-center justify-center shadow-lg shadow-rose-600/30">
            <AlertOctagon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">คำสั่งออกรถฉุกเฉินเร่งด่วน (Emergency Override)</h3>
            <p className="text-xs text-rose-400 font-mono">ภารกิจ: {missionNo}</p>
          </div>
        </div>

        <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs space-y-1 text-slate-300">
          <p className="font-semibold text-rose-400 flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            การออกรถปกติถูกระงับเนื่องจากข้อมูลความปลอดภัยยังไม่ครบถ้วน:
          </p>
          <ul className="list-disc list-inside text-rose-200/80 text-[11px] pl-2 space-y-0.5">
            {missingRequirements.map((req, idx) => (
              <li key={idx}>{req}</li>
            ))}
          </ul>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/20 border border-rose-500/50 rounded-xl text-rose-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5">
              ระบุเหตุผลความจำเป็นในการ Override ออกรถทันที (Mandatory Reason)
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="เช่น ผู้ป่วยภาวะวิกฤต Cardiac Arrest ต้องรีบนำส่งด่วนที่สุด โดยได้ประสานตรวจเช็คระบบพยาบาลทางวิทยุแล้ว"
              className="w-full bg-slate-800 border border-rose-500/30 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              * ข้อมูลนี้จะถูกบันทึกลงใน Audit Log พร้อมชื่อผู้สั่งการ วันและเวลาอย่างเป็นทางการ
            </span>
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
              className="px-5 py-2 text-sm font-semibold bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white rounded-xl shadow-lg shadow-rose-600/30 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{loading ? 'กำลังออกคำสั่ง...' : 'ยืนยัน Emergency Override'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
