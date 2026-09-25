import React from 'react';
import { Navigation, ClipboardList, Gauge, BarChart3, Building2, AlertTriangle } from 'lucide-react';

interface MobileBottomNavProps {
  currentTab: 'map' | 'missions' | 'driver' | 'facilities' | 'bases' | 'reports';
  onSelectTab: (tab: 'map' | 'missions' | 'driver' | 'facilities' | 'bases' | 'reports') => void;
  activeEmergencyCount: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentTab,
  onSelectTab,
  activeEmergencyCount,
}) => {
  return (
    <nav
      aria-label="Mobile Navigation"
      className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-slate-900/95 border-t border-slate-800/90 backdrop-blur-xl pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(0,0,0,0.5)]"
    >
      <div className="grid grid-cols-5 h-16 max-w-lg mx-auto px-1">
        {/* 1. Map */}
        <button
          onClick={() => onSelectTab('map')}
          className={`flex flex-col items-center justify-center gap-1 transition-all min-h-[48px] relative ${
            currentTab === 'map' ? 'text-sky-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Navigation className={`w-5 h-5 ${currentTab === 'map' ? 'scale-110' : ''}`} />
          <span className="text-[10px] leading-tight">แผนที่</span>
          {activeEmergencyCount > 0 && (
            <span className="absolute top-1.5 right-3 w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] font-black flex items-center justify-center animate-pulse">
              {activeEmergencyCount}
            </span>
          )}
        </button>

        {/* 2. Missions */}
        <button
          onClick={() => onSelectTab('missions')}
          className={`flex flex-col items-center justify-center gap-1 transition-all min-h-[48px] ${
            currentTab === 'missions' ? 'text-sky-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ClipboardList className={`w-5 h-5 ${currentTab === 'missions' ? 'scale-110' : ''}`} />
          <span className="text-[10px] leading-tight">ภารกิจ</span>
        </button>

        {/* 3. Driver Cab Mode */}
        <button
          onClick={() => onSelectTab('driver')}
          className={`flex flex-col items-center justify-center gap-1 transition-all min-h-[48px] relative ${
            currentTab === 'driver' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center -mt-3.5 shadow-lg border ${
              currentTab === 'driver'
                ? 'bg-amber-500 text-slate-950 border-white shadow-amber-500/40'
                : 'bg-slate-800 text-amber-400 border-slate-700'
            }`}
          >
            <Gauge className="w-5 h-5" />
          </div>
          <span className="text-[10px] leading-tight">พลขับ</span>
        </button>

        {/* 4. Reports & KPIs */}
        <button
          onClick={() => onSelectTab('reports')}
          className={`flex flex-col items-center justify-center gap-1 transition-all min-h-[48px] ${
            currentTab === 'reports' ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BarChart3 className={`w-5 h-5 ${currentTab === 'reports' ? 'scale-110' : ''}`} />
          <span className="text-[10px] leading-tight">รายงาน</span>
        </button>

        {/* 5. Facilities & Bases */}
        <button
          onClick={() => onSelectTab('facilities')}
          className={`flex flex-col items-center justify-center gap-1 transition-all min-h-[48px] ${
            currentTab === 'facilities' || currentTab === 'bases'
              ? 'text-sky-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Building2 className={`w-5 h-5 ${currentTab === 'facilities' || currentTab === 'bases' ? 'scale-110' : ''}`} />
          <span className="text-[10px] leading-tight">รพ./ฐาน</span>
        </button>
      </div>
    </nav>
  );
};
