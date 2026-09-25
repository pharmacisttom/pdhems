import { authFetch as fetch } from '../../services/auth';
import React, { useState } from 'react';
import { X, Zap, Navigation, Clock, ShieldCheck, AlertCircle, Check, ArrowRight, Compass } from 'lucide-react';

interface CandidateAmbulance {
  vehicle_id: number;
  vehicle_code: string;
  registration_no: string;
  vehicle_type: string;
  current_status: string;
  straight_line_distance_km: number;
  estimated_road_distance_km: number;
  estimated_travel_minutes: number;
  gps_freshness: string;
  seconds_since_last_gps: number;
  gps_quality: string;
  suitability_score: number;
  is_eligible: boolean;
  reason: string;
}

interface SmartDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultLat?: number;
  defaultLng?: number;
  onDispatched?: () => void;
}

export const SmartDispatchModal: React.FC<SmartDispatchModalProps> = ({
  isOpen,
  onClose,
  defaultLat = 13.6938,
  defaultLng = 99.8519,
  onDispatched,
}) => {
  const [sceneLat, setSceneLat] = useState<number>(defaultLat);
  const [sceneLng, setSceneLng] = useState<number>(defaultLng);
  const [sceneDesc, setSceneDesc] = useState<string>('อุบัติเหตุฉุกเฉิน หน้าตลาดโพธาราม');
  const [urgency, setUrgency] = useState<string>('CRITICAL');

  const [candidates, setCandidates] = useState<CandidateAmbulance[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [dispatchingId, setDispatchingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleFindNearest = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/dispatch/nearest-ambulances', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',

        },
        body: JSON.stringify({
          latitude: Number(sceneLat),
          longitude: Number(sceneLng),
          urgency,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setCandidates(json.candidates || []);
        setHasSearched(true);
      } else {
        setError(json.message || 'ไม่สามารถค้นหารถที่เหมาะสมได้');
      }
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDispatch = async (candidate: CandidateAmbulance) => {
    setDispatchingId(candidate.vehicle_id);
    setError(null);
    try {
      const res = await fetch('/api/dispatch/quick-emergency', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',

        },
        body: JSON.stringify({
          sceneLatitude: Number(sceneLat),
          sceneLongitude: Number(sceneLng),
          sceneDescription: sceneDesc,
          vehicleId: candidate.vehicle_id,
          urgency,
        }),
      });

      const json = await res.json();
      if (json.success) {
        if (onDispatched) onDispatched();
        onClose();
      } else {
        setError(json.message || 'ไม่สามารถสั่งการได้');
      }
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการสั่งการ');
    } finally {
      setDispatchingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative text-slate-100 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-100 p-2 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-600 flex items-center justify-center shadow-lg shadow-rose-600/30">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Smart Dispatch — ค้นหาและสั่งการรถพยาบาลที่เหมาะสมที่สุด</h3>
            <p className="text-xs text-slate-400">
              วิเคราะห์ตามระยะทางถนนจริง (Road Factor 1.35x) ความสดใหม่ของ GPS และความพร้อมของรถ
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Scene Input Form */}
        <div className="space-y-3 bg-slate-950/50 p-4 rounded-xl border border-slate-800 mb-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                พิกัดละติจูดจุดเกิดเหตุ (Latitude)
              </label>
              <input
                type="number"
                step="0.0001"
                value={sceneLat}
                onChange={(e) => setSceneLat(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                พิกัดลองจิจูดจุดเกิดเหตุ (Longitude)
              </label>
              <input
                type="number"
                step="0.0001"
                value={sceneLng}
                onChange={(e) => setSceneLng(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              รายละเอียดเหตุฉุกเฉิน (Scene Description)
            </label>
            <input
              type="text"
              value={sceneDesc}
              onChange={(e) => setSceneDesc(e.target.value)}
              placeholder="ระบุจุดสังเกต อาการผู้บาดเจ็บ หรือจำนวนผู้ป่วย"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="flex justify-between items-center pt-1">
            <span className="text-[10px] text-slate-400">
              * ตำแหน่งเริ่มต้นอ้างอิงพื้นที่ รพ.โพธาราม (13.6938, 99.8519)
            </span>
            <button
              type="button"
              onClick={handleFindNearest}
              disabled={loading}
              className="px-4 py-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>{loading ? 'กำลังคำนวณ...' : 'ค้นหารถพยาบาลที่เหมาะสม'}</span>
            </button>
          </div>
        </div>

        {/* Candidate Recommendations List */}
        {hasSearched && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-200">
                ผลการจัดอันดับรถพยาบาล (เรียงตามคะแนนความเหมาะสม):
              </span>
              <span className="text-[10px] text-slate-400">
                พบรถทั้งหมด {candidates.length} คัน
              </span>
            </div>

            <div className="space-y-2.5">
              {candidates.map((c, idx) => (
                <div
                  key={c.vehicle_id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    idx === 0 && c.is_eligible
                      ? 'bg-emerald-500/10 border-emerald-500/40 shadow-lg shadow-emerald-500/5'
                      : c.is_eligible
                      ? 'bg-slate-800/40 border-slate-700/60'
                      : 'bg-slate-900/60 border-slate-800 opacity-60'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-sm text-white">
                          {c.vehicle_code}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          ({c.registration_no})
                        </span>
                        {idx === 0 && c.is_eligible && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            ★ รถที่แนะนำสูงสุด (Top Match)
                          </span>
                        )}
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            c.current_status === 'AVAILABLE'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-amber-500/20 text-amber-400'
                          }`}
                        >
                          {c.current_status}
                        </span>
                      </div>

                      {/* Distance & Time Breakdown */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300 mt-1">
                        <span className="flex items-center gap-1">
                          <Compass className="w-3.5 h-3.5 text-sky-400" />
                          ระยะทางถนนจริง: <strong className="text-white">{c.estimated_road_distance_km} กม.</strong>
                          <span className="text-[10px] text-slate-400">(ทางตรง {c.straight_line_distance_km} กม.)</span>
                        </span>

                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          เวลาเดินทางโดยประมาณ: <strong className="text-amber-300">~{c.estimated_travel_minutes} นาที</strong>
                        </span>

                        <span className="text-[10px] text-slate-400">
                          GPS: {c.gps_freshness} ({c.seconds_since_last_gps}s ago)
                        </span>
                      </div>

                      {!c.is_eligible && (
                        <p className="text-[11px] text-rose-400 mt-1.5">
                          ⚠️ {c.reason}
                        </p>
                      )}
                    </div>

                    {/* Dispatch Action */}
                    <div className="flex items-center gap-2">
                      <div className="text-right mr-2">
                        <span className="text-[10px] text-slate-400 block">Suitability</span>
                        <span
                          className={`font-black text-sm ${
                            c.suitability_score >= 80
                              ? 'text-emerald-400'
                              : c.suitability_score >= 50
                              ? 'text-amber-400'
                              : 'text-slate-500'
                          }`}
                        >
                          {c.suitability_score} / 100
                        </span>
                      </div>

                      {c.is_eligible && (
                        <button
                          type="button"
                          onClick={() => handleQuickDispatch(c)}
                          disabled={dispatchingId === c.vehicle_id}
                          className="px-3.5 py-2 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/30 flex items-center gap-1.5 transition-all disabled:opacity-50"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          <span>{dispatchingId === c.vehicle_id ? 'กำลังสั่งการ...' : 'สั่งการด่วน (Dispatch)'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Disclaimer per Section 21 */}
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-[11px] text-slate-400">
              ℹ️ <strong>ข้อกำหนดความปลอดภัย EMS (Section 21):</strong> ผลลัพธ์นี้เป็นเพียงข้อเสนอแนะในการจัดสรรทรัพยากร (Candidate Recommendation) ผู้สั่งการ (Dispatcher) เป็นผู้มีอำนาจตัดสินใจสั่งการขั้นสุดท้ายเสมอ
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
