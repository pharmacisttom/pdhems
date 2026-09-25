import React, { useState } from 'react';
import { confirmMissionHandover } from '../../services/api';
import { X, CheckCircle, ShieldCheck, UserCheck, FileText, AlertCircle } from 'lucide-react';

interface HandoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  missionId: number;
  missionNo: string;
  destFacilityName: string;
  onCompleted: () => void;
}

export const HandoverModal: React.FC<HandoverModalProps> = ({
  isOpen,
  onClose,
  missionId,
  missionNo,
  destFacilityName,
  onCompleted,
}) => {
  const [receiverName, setReceiverName] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiverName || receiverName.trim().length === 0) {
      setError('กรุณาระบุชื่อ-สกุล หรือตำแหน่งของเจ้าหน้าที่ผู้รับมอบตัวผู้ป่วยปลายทาง');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await confirmMissionHandover(missionId, {
        receiverName: receiverName.trim(),
        notes: notes.trim(),
      });

      if (res.success) {
        onCompleted();
        onClose();
      } else {
        setError(res.message || 'ไม่สามารถยืนยันการส่งมอบได้');
      }
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-100 p-2 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-600/30">
            <UserCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">ยืนยันการส่งมอบภารกิจ (Handover Confirmation)</h3>
            <p className="text-xs text-slate-400">
              ภารกิจ: <span className="font-mono text-purple-400">{missionNo}</span> | ปลายทาง: {destFacilityName}
            </p>
          </div>
        </div>

        <div className="mb-4 p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-xs text-purple-300 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span>
            ตามกฎความปลอดภัย EMS: ระบบจะไม่มีการ Auto-Handover จากพิกัด GPS ต้องได้รับการยืนยันจากเจ้าหน้าที่ผู้รับมอบเสมอ
          </span>
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
              <UserCheck className="w-3.5 h-3.5 text-purple-400" />
              ชื่อ-สกุล / ตำแหน่ง เจ้าหน้าที่ผู้รับส่งมอบปลายทาง (Receiving Staff)
            </label>
            <input
              type="text"
              required
              value={receiverName}
              onChange={(e) => setReceiverName(e.target.value)}
              placeholder="เช่น พว.กมลวรรณ ชัยพร (พยาบาลห้องฉุกเฉิน รพ.ศูนย์ราชบุรี)"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              บันทึกการส่งมอบ / สัญญาณชีพล่าสุด / เอกสารที่มอบ (Handover Notes)
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ส่งมอบใบ Refer เอกสารแล็บ และฟิล์ม X-ray สัญญาณชีพก่อนส่งมอบ BP 124/80, HR 82, SpO2 99%"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
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
              className="px-5 py-2 text-sm font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl shadow-lg shadow-purple-600/30 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{loading ? 'กำลังยืนยัน...' : 'ยืนยันการส่งมอบเสร็จสมบูรณ์'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
