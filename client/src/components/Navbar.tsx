import {
  Activity,
  MapPin,
  Building2,
  Navigation,
  BarChart3,
  Ambulance,
  ClipboardList,
  ShieldCheck,
  Truck,
  Users,
  DollarSign,
} from 'lucide-react';

export type WorkspaceTab =
  | 'map'
  | 'missions'
  | 'driver'
  | 'fleet'
  | 'facilities'
  | 'bases'
  | 'reports'
  | 'expenses'
  | 'users';

export const navigationItems = [
  { id: 'map' as const, label: 'แผนที่สั่งการ', short: 'แผนที่', icon: Navigation },
  { id: 'missions' as const, label: 'ภารกิจ EMS / Refer', short: 'ภารกิจ', icon: ClipboardList },
  { id: 'driver' as const, label: 'โหมดพลขับ', short: 'พลขับ', icon: Ambulance },
  { id: 'fleet' as const, label: 'รถและทีมกู้ชีพ', short: 'รถ/ทีม', icon: Truck },
  { id: 'facilities' as const, label: 'สถานพยาบาล', short: 'รพ.', icon: Building2 },
  { id: 'bases' as const, label: 'ฐานกู้ชีพ', short: 'ฐาน', icon: MapPin },
  { id: 'reports' as const, label: 'รายงานและสถิติ', short: 'รายงาน', icon: BarChart3 },
  { id: 'expenses' as const, label: 'ค่าใช้จ่ายและ Log', short: 'ค่าใช้จ่าย/Log', icon: DollarSign },
  { id: 'users' as const, label: 'จัดการผู้ใช้และสิทธิ์', short: 'ผู้ใช้งาน', icon: Users },
];
interface NavbarProps {
  currentTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  activeEmergencyCount: number;
  allowedTabs: string[];
}
export const Navbar = ({ currentTab, onSelectTab, activeEmergencyCount, allowedTabs }: NavbarProps) => (
  <header className="ems-header">
    <div className="ems-brand-row">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-12 h-12 flex-shrink-0 rounded-full overflow-hidden shadow-sm border border-sky-100 bg-white grid place-items-center">
          <img src="/logo.png" alt="โลโก้ระบบการแพทย์ฉุกเฉิน โรงพยาบาลปลวกแดง" className="w-full h-full object-cover rounded-full" />
        </div>
        <div className="min-w-0">
          <p className="ems-eyebrow">PLUAKDAENG EMS NETWORK</p>
          <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-ems-ink">PDH <span className="text-sky-700">SMART EMS</span></h1>
          <p className="text-xs text-ems-muted mt-0.5">ระบบการแพทย์ฉุกเฉิน รพ.ปลวกแดง · มูลนิธิกู้ภัยอำเภอปลวกแดง · รพ.กรุงเทพปลวกแดง</p>
        </div>
      </div>
      <div className="hidden sm:flex items-center gap-3">
        <div className="ems-service-label"><ShieldCheck size={18} /><span>EMS Command &amp; Refer</span></div>
        <div className="hidden lg:block text-right border-l border-ems-border pl-4">
          <p className="text-xs text-ems-muted">ศูนย์สั่งการเครือข่าย EMS ปลวกแดง</p>
          <p className="text-sm font-semibold text-ems-ink mt-1">พร้อมดูแล ทุกการส่งต่อ</p>
        </div>
      </div>
    </div>
    <nav className="ems-desktop-nav" aria-label="เมนูหลัก">
      {navigationItems.filter(item => allowedTabs.includes(item.id)).map(({ id, label, icon: Icon }) => (
        <button key={id} onClick={() => onSelectTab(id)} aria-current={currentTab === id ? 'page' : undefined} className={`ems-nav-item ${currentTab === id ? 'is-active' : ''}`}>
          <Icon size={18} strokeWidth={currentTab === id ? 2.4 : 1.8} /><span>{label}</span>
          {id === 'map' && activeEmergencyCount > 0 && <span className="ems-count">{activeEmergencyCount}</span>}
        </button>
      ))}
    </nav>
  </header>
);
