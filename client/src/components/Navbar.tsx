import React from 'react';
import { Shield, MapPin, Building2, Navigation, AlertTriangle } from 'lucide-react';

interface NavbarProps {
  currentTab: 'map' | 'missions' | 'driver' | 'facilities' | 'bases';
  onSelectTab: (tab: 'map' | 'missions' | 'driver' | 'facilities' | 'bases') => void;
  activeEmergencyCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onSelectTab, activeEmergencyCount }) => {
  return (
    <header className="bg-slate-900/90 border-b border-slate-800 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & App Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-600/30">
              <span className="text-xl font-black text-white">🚑</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-white">PDH SMART EMS</span>
                <span className="px-2 py-0.5 text-xs font-semibold rounded bg-sky-500/20 text-sky-400 border border-sky-500/30">
                  GEOSPATIAL INTELLIGENCE
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                ศูนย์รับแจ้งเหตุ สั่งการ และระบบติดตามรถพยาบาล รพ.โพธาราม
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => onSelectTab('map')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                currentTab === 'map'
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Navigation className="w-4 h-4" />
              <span>แผนที่สั่งการ (Map)</span>
              {activeEmergencyCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-rose-500 text-white text-xs font-bold rounded-full animate-pulse">
                  {activeEmergencyCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onSelectTab('missions')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                currentTab === 'missions'
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className="text-sm">📋</span>
              <span>ภารกิจ Refer / EMS</span>
            </button>

            <button
              onClick={() => onSelectTab('driver')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                currentTab === 'driver'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className="text-sm">⚡</span>
              <span>โหมดพลขับ (Driver Cab)</span>
            </button>

            <button
              onClick={() => onSelectTab('facilities')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                currentTab === 'facilities'
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>โรงพยาบาล/ปลายทาง</span>
            </button>

            <button
              onClick={() => onSelectTab('bases')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                currentTab === 'bases'
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <MapPin className="w-4 h-4" />
              <span>ฐานกู้ชีพ (Bases)</span>
            </button>
          </nav>

          {/* User badge & system status */}
          <div className="hidden lg:flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span className="text-slate-300">ระบบติดตาม: พร้อมทำงาน</span>
            </div>
            <div className="flex items-center gap-2 pl-2 border-l border-slate-700">
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-sky-400 border border-slate-600">
                DISP
              </div>
              <div className="text-left text-xs">
                <p className="font-semibold text-slate-200">Dispatcher (ศูนย์)</p>
                <p className="text-slate-400">รพ.โพธาราม</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
