import React from 'react';
import { Activity, ShieldCheck, AlertTriangle, Radio, PauseCircle, WifiOff } from 'lucide-react';
import { TrackingHealthSummary } from '../../types/ems';

interface TrackingHealthWidgetProps {
  summary: TrackingHealthSummary | null;
  onFilterAlerts?: () => void;
}

export const TrackingHealthWidget: React.FC<TrackingHealthWidgetProps> = ({
  summary,
  onFilterAlerts,
}) => {
  if (!summary) return null;

  return (
    <div className="bg-ems-surface/90 border border-ems-border rounded-xl p-3 text-xs space-y-2.5">
      <div className="flex items-center justify-between border-b border-ems-border pb-2">
        <span className="font-bold text-ems-ink flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-sky-700" />
          <span>สุขภาพสัญญาณ GPS (Telematics Health)</span>
        </span>
        <span className="px-2 py-0.5 rounded-full bg-ems-inset text-[10px] font-mono text-ems-muted">
          ทั้งหมด {summary.total_vehicles} คัน
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {/* Online Moving */}
        <div className="p-2 rounded-lg bg-emerald-50/40 border border-emerald-500/30 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-[11px] text-emerald-700">กำลังเคลื่อนที่</span>
          </div>
          <span className="font-bold text-emerald-700 text-sm">{summary.online_moving}</span>
        </div>

        {/* Online Stopped (Crucial Distinction Section 33) */}
        <div className="p-2 rounded-lg bg-sky-50/40 border border-sky-500/30 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <PauseCircle className="w-3.5 h-3.5 text-sky-700" />
            <span className="text-[11px] text-sky-700">จอดนิ่ง (GPS ปกติ)</span>
          </div>
          <span className="font-bold text-sky-700 text-sm">{summary.online_stopped}</span>
        </div>

        {/* Tracking Delayed */}
        <div
          onClick={onFilterAlerts}
          className="p-2 rounded-lg bg-amber-50/40 border border-amber-500/30 flex items-center justify-between cursor-pointer hover:bg-amber-50/30 transition-colors"
          title="คลิกเพื่อกรองเฉพาะรถที่มีปัญหา"
        >
          <div className="flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-amber-700" />
            <span className="text-[11px] text-amber-700">สัญญาณล่าช้า</span>
          </div>
          <span className="font-bold text-amber-700 text-sm">{summary.tracking_delayed}</span>
        </div>

        {/* Tracking Lost */}
        <div
          onClick={onFilterAlerts}
          className="p-2 rounded-lg bg-rose-50/40 border border-rose-500/30 flex items-center justify-between cursor-pointer hover:bg-rose-50/30 transition-colors"
          title="คลิกเพื่อกรองเฉพาะรถที่ขาดการเชื่อมต่อ"
        >
          <div className="flex items-center gap-1.5">
            <WifiOff className="w-3.5 h-3.5 text-rose-700" />
            <span className="text-[11px] text-rose-700">ขาดการเชื่อมต่อ</span>
          </div>
          <span className="font-bold text-rose-700 text-sm">{summary.tracking_lost}</span>
        </div>
      </div>

      <p className="text-[10px] text-ems-muted italic">
        * แยกแยะ "รถจอดดับเครื่อง" ออกจาก "สัญญาณ GPS ขาดหาย" อย่างชัดเจน
      </p>
    </div>
  );
};
