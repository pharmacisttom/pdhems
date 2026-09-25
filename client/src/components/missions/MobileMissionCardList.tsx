import React from 'react';
import { ActiveMissionData } from '../../types/ems';
import { ArrowRight, MapPin, Shield, Clock, User, CheckCircle2, ChevronRight, AlertTriangle } from 'lucide-react';

interface MobileMissionCardListProps {
  missions: ActiveMissionData[];
  onOpenDetail: (id: number) => void;
  onOpenAssign: (m: ActiveMissionData) => void;
  onOpenPretrip: (m: ActiveMissionData) => void;
  onDepart: (m: ActiveMissionData) => void;
  onMarkArrived: (id: number) => void;
  onOpenHandover: (m: ActiveMissionData) => void;
  onStartReturn: (id: number) => void;
  onComplete: (id: number) => void;
}

export const MobileMissionCardList: React.FC<MobileMissionCardListProps> = ({
  missions,
  onOpenDetail,
  onOpenAssign,
  onOpenPretrip,
  onDepart,
  onMarkArrived,
  onOpenHandover,
  onStartReturn,
  onComplete,
}) => {
  if (missions.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center my-4">
        <div className="text-3xl mb-2">📋</div>
        <h3 className="text-base font-bold text-white mb-1">ยังไม่มีรายการภารกิจ</h3>
        <p className="text-xs text-slate-400">เมื่อมีการรับแจ้งเหตุหรือสร้างใบนำส่ง ข้อมูลจะปรากฏที่นี่</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:hidden pb-6">
      {missions.map((m) => {
        const isEmergency = m.mission_type === 'EMERGENCY';
        const isAssigned = m.status === 'ASSIGNED';
        const isReady = m.status === 'READY' || m.status === 'CREW_CONFIRMED';
        const isEnRoute = m.status === 'EN_ROUTE' || m.status === 'DEPARTED' || m.status === 'LEAVING_SCENE' || m.status === 'EN_ROUTE_TO_HOSPITAL';
        const isArrived = m.status === 'ARRIVED_SCENE' || m.status === 'ARRIVED';
        const isHandover = m.status === 'HANDOVER_COMPLETED';
        const isReturning = m.status === 'RETURNING';
        const isCompleted = m.status === 'COMPLETED';

        return (
          <div
            key={m.id}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg hover:border-slate-700 transition-all active:scale-[0.99]"
          >
            {/* Top Bar: Code & Type & Status */}
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-white text-sm">{m.mission_no}</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    isEmergency
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                  }`}
                >
                  {isEmergency ? '🚨 ฉุกเฉิน' : '🏥 ส่งต่อ'}
                </span>
              </div>

              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                  isCompleted
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : isEnRoute || isArrived
                    ? 'bg-sky-500/20 text-sky-400 border-sky-500/30'
                    : isReady
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/30 animate-pulse'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                {m.status}
              </span>
            </div>

            {/* Route Flow Card */}
            <div
              onClick={() => onOpenDetail(m.id)}
              className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 mb-3 cursor-pointer"
            >
              <div className="flex items-center justify-between text-xs text-slate-300">
                <div className="truncate max-w-[42%]">
                  <span className="text-[10px] text-slate-500 block">ต้นทาง</span>
                  <span className="font-semibold text-slate-200 truncate block">
                    {m.origin_name || 'รพ.โพธาราม'}
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 shrink-0 mx-1" />
                <div className="truncate max-w-[42%] text-right">
                  <span className="text-[10px] text-slate-500 block">ปลายทาง</span>
                  <span className="font-bold text-sky-300 truncate block">
                    {m.destination_name || (m.scene_description ? `จุดเกิดเหตุ` : 'ไม่ระบุ')}
                  </span>
                </div>
              </div>

              {m.scene_description && (
                <div className="mt-2 pt-2 border-t border-slate-800/80 text-[11px] text-amber-400/90 truncate flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                  <span className="truncate">{m.scene_description}</span>
                </div>
              )}
            </div>

            {/* Vehicle & Driver Footer */}
            <div className="flex items-center justify-between text-xs text-slate-400 mb-3 px-1">
              <div className="flex items-center gap-1.5">
                <span>🚑</span>
                <span className="text-white font-medium">
                  {m.vehicle_code ? m.vehicle_code : 'ยังไม่ได้มอบหมายรถ'}
                </span>
              </div>

              {m.driver_name && (
                <div className="flex items-center gap-1 text-[11px]">
                  <span>👤</span>
                  <span>{m.driver_name}</span>
                </div>
              )}
            </div>

            {/* Full-width Touch Action Button (min 44px height) */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenDetail(m.id)}
                className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl border border-slate-700 transition-colors flex items-center justify-center min-h-[44px]"
                aria-label="ดูรายละเอียด"
              >
                <span>รายละเอียด</span>
                <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </button>

              {m.status === 'CREATED' && (
                <button
                  onClick={() => onOpenAssign(m)}
                  className="flex-1 py-2.5 px-4 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-sky-600/30 flex items-center justify-center gap-1.5 min-h-[44px] transition-all"
                >
                  <User className="w-4 h-4" />
                  <span>มอบหมายทีม & รถ</span>
                </button>
              )}

              {isAssigned && (
                <button
                  onClick={() => onOpenPretrip(m)}
                  className="flex-1 py-2.5 px-4 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-amber-600/30 flex items-center justify-center gap-1.5 min-h-[44px] transition-all"
                >
                  <Shield className="w-4 h-4" />
                  <span>ตรวจเช็ครถ (Pre-trip)</span>
                </button>
              )}

              {isReady && (
                <button
                  onClick={() => onDepart(m)}
                  className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-1.5 min-h-[44px] animate-pulse transition-all"
                >
                  <span>🚀</span>
                  <span>ยืนยันออกเดินทาง</span>
                </button>
              )}

              {isEnRoute && (
                <button
                  onClick={() => onMarkArrived(m.id)}
                  className="flex-1 py-2.5 px-4 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-sky-600/30 flex items-center justify-center gap-1.5 min-h-[44px] transition-all"
                >
                  <MapPin className="w-4 h-4" />
                  <span>ถึงปลายทางแล้ว</span>
                </button>
              )}

              {isArrived && (
                <button
                  onClick={() => onOpenHandover(m)}
                  className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-1.5 min-h-[44px] transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>ส่งมอบภารกิจ (Handover)</span>
                </button>
              )}

              {isHandover && (
                <button
                  onClick={() => onStartReturn(m.id)}
                  className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-1.5 min-h-[44px] transition-all"
                >
                  <span>🔄</span>
                  <span>เดินทางกลับฐาน</span>
                </button>
              )}

              {isReturning && (
                <button
                  onClick={() => onComplete(m.id)}
                  className="flex-1 py-2.5 px-4 bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 min-h-[44px] transition-all"
                >
                  <span>✓</span>
                  <span>ปิดภารกิจ</span>
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
