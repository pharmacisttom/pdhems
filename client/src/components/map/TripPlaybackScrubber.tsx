import React, { useState, useEffect, useRef } from 'react';
import { MissionTrackResponse, GpsTrackPoint } from '../../types/ems';
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  X,
  Clock,
  Compass,
  Gauge,
  AlertTriangle,
  History,
} from 'lucide-react';

interface TripPlaybackScrubberProps {
  track: MissionTrackResponse;
  onClose: () => void;
  onPointChange: (point: GpsTrackPoint, index: number) => void;
}

export const TripPlaybackScrubber: React.FC<TripPlaybackScrubberProps> = ({
  track,
  onClose,
  onPointChange,
}) => {
  const points = track.track_points || [];
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1); // 1x, 2x, 5x, 10x
  const timerRef = useRef<any>(null);

  const currentPoint = points[currentIndex] || null;

  useEffect(() => {
    if (points.length > 0 && currentPoint) {
      onPointChange(currentPoint, currentIndex);
    }
  }, [currentIndex, points]);

  useEffect(() => {
    if (isPlaying) {
      const intervalMs = Math.max(150, Math.round(1000 / playbackSpeed));
      timerRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= points.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, intervalMs);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, playbackSpeed, points.length]);

  const handleTogglePlay = () => {
    if (currentIndex >= points.length - 1) {
      setCurrentIndex(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentIndex(0);
  };

  // Detect data gap with previous point (Section 22: forbid invented fictitious positions without notice)
  let dataGapNotice: string | null = null;
  if (currentIndex > 0 && currentPoint && points[currentIndex - 1]) {
    const prevTime = new Date(points[currentIndex - 1].recorded_at).getTime();
    const currTime = new Date(currentPoint.recorded_at).getTime();
    const diffMins = Math.round((currTime - prevTime) / 60000);
    if (diffMins > 5) {
      dataGapNotice = `⚠️ ข้อมูลพิกัดขาดช่วง (Data Gap) ${diffMins} นาที — แสดงพิกัดจริงที่บันทึก ไม่สร้างพิกัดจำลอง`;
    }
  }

  if (points.length === 0) return null;

  return (
    <div className="absolute bottom-4 left-4 right-4 md:left-6 md:right-auto md:w-[540px] z-[1000] bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl p-4 shadow-2xl text-slate-100 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-cyan-400" />
          <span className="font-bold text-xs text-white">
            เล่นเส้นทางย้อนหลัง (Trip Playback)
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">
            {track.mission_no}
          </span>
          <span className="text-[11px] text-slate-400 font-medium">
            ({track.vehicle_code})
          </span>
        </div>

        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          title="ปิดการเล่นย้อนหลัง"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Telemetry info row */}
      {currentPoint && (
        <div className="grid grid-cols-3 gap-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 text-xs">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <div>
              <span className="text-[10px] text-slate-400 block">เวลาที่บันทึก</span>
              <span className="font-mono font-semibold text-slate-200">
                {new Date(currentPoint.recorded_at).toLocaleTimeString('th-TH')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-sky-400" />
            <div>
              <span className="text-[10px] text-slate-400 block">ความเร็วขณะนั้น</span>
              <span className="font-bold text-sky-300">
                {Math.round(currentPoint.speed)} กม./ชม.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-indigo-400" />
            <div>
              <span className="text-[10px] text-slate-400 block">ทิศทาง</span>
              <span className="font-mono text-slate-200">
                {currentPoint.heading ?? '—'}°
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Data Gap Notice */}
      {dataGapNotice && (
        <div className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 text-[11px] flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>{dataGapNotice}</span>
        </div>
      )}

      {/* Scrubber Range Slider */}
      <div className="space-y-1">
        <div className="flex justify-between text-[11px] text-slate-400">
          <span>จุดเริ่มต้น</span>
          <span className="font-mono text-cyan-400 font-bold">
            จุดที่ {currentIndex + 1} / {points.length}
          </span>
          <span>จุดสิ้นสุด</span>
        </div>
        <input
          type="range"
          min={0}
          max={points.length - 1}
          value={currentIndex}
          onChange={(e) => {
            setIsPlaying(false);
            setCurrentIndex(Number(e.target.value));
          }}
          className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
        />
      </div>

      {/* Control Buttons & Multiplier */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <button
            onClick={handleTogglePlay}
            className="px-3.5 py-1.5 bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-500 hover:to-sky-500 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 transition-all"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 fill-white" /> : <Play className="w-3.5 h-3.5 fill-white" />}
            <span>{isPlaying ? 'หยุดชั่วคราว' : 'เล่น (Play)'}</span>
          </button>

          <button
            onClick={handleReset}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors"
            title="เริ่มใหม่ตั้งแต่ต้น"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Speed Multipliers */}
        <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
          <FastForward className="w-3 h-3 text-slate-500 ml-1" />
          {[1, 2, 5, 10].map((spd) => (
            <button
              key={spd}
              onClick={() => setPlaybackSpeed(spd)}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-colors ${
                playbackSpeed === spd
                  ? 'bg-cyan-500 text-slate-950'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {spd}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
