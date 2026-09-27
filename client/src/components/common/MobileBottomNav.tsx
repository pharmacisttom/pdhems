import { navigationItems, WorkspaceTab } from '../Navbar';
interface MobileBottomNavProps {
  currentTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  activeEmergencyCount: number;
  allowedTabs: string[];
}
export const MobileBottomNav = ({ currentTab, onSelectTab, activeEmergencyCount, allowedTabs }: MobileBottomNavProps) => (
  <nav className="ems-mobile-nav" aria-label="เมนูบนมือถือ">
    {navigationItems.filter(item => allowedTabs.includes(item.id)).map(({id, short, icon: Icon}) => (
      <button key={id} onClick={() => onSelectTab(id)} aria-current={currentTab === id ? 'page' : undefined} className={currentTab === id ? 'is-active' : ''}>
        <span className="relative"><Icon size={21}/>{id === 'map' && activeEmergencyCount > 0 && <span className="ems-mobile-count">{activeEmergencyCount}</span>}</span>
        <span>{short}</span>
      </button>
    ))}
  </nav>
);
