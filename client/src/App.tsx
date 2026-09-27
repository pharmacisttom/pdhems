import { AuthBoundary } from './components/AuthBoundary';
import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { CommandCenterMapPage } from './pages/CommandCenterMapPage';
import { FacilitiesPage } from './pages/FacilitiesPage';
import { BasesPage } from './pages/BasesPage';
import { MissionsPage } from './pages/MissionsPage';
import { DriverCabPage } from './pages/DriverCabPage';
import { ReportsPage } from './pages/ReportsPage';
import { FleetManagementPage } from './pages/FleetManagementPage';
import { UsersManagementPage } from './pages/UsersManagementPage';
import { ExpensesAndAuditLogsPage } from './pages/ExpensesAndAuditLogsPage';
import { MobileBottomNav } from './components/common/MobileBottomNav';
import { fetchActiveMissions } from './services/api';

function Workspace({ navigation }: { navigation: string[] }) {
  const [currentTab, setCurrentTab] = useState<
    'map' | 'missions' | 'driver' | 'fleet' | 'facilities' | 'bases' | 'reports' | 'expenses' | 'users'
  >((navigation[0] as any) || 'map');
  const [activeEmergencyCount, setActiveEmergencyCount] = useState<number>(0);

  useEffect(() => {
    const checkEmergencies = async () => {
      const missions = await fetchActiveMissions();
      const em = missions.filter((m) => m.mission_type === 'EMERGENCY');
      setActiveEmergencyCount(em.length);
    };

    checkEmergencies();
    const interval = setInterval(checkEmergencies, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-[calc(100dvh-44px)] bg-ems-canvas text-ems-ink flex flex-col font-sans pb-[env(safe-area-inset-bottom)]">
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        activeEmergencyCount={activeEmergencyCount}
        allowedTabs={navigation}
      />

      <main className="flex-1 flex flex-col overflow-hidden pb-20 md:pb-0">
        {currentTab === 'map' && <CommandCenterMapPage />}
        {currentTab === 'missions' && <MissionsPage />}
        {currentTab === 'driver' && <DriverCabPage />}
        {currentTab === 'fleet' && <FleetManagementPage />}
        {currentTab === 'facilities' && <FacilitiesPage />}
        {currentTab === 'bases' && <BasesPage />}
        {currentTab === 'reports' && <ReportsPage />}
        {currentTab === 'expenses' && <ExpensesAndAuditLogsPage />}
        {currentTab === 'users' && <UsersManagementPage />}
      </main>

      {/* Mobile Bottom Navigation Bar (Thumb-friendly & Safe Area compliant) */}
      <MobileBottomNav
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        activeEmergencyCount={activeEmergencyCount}
        allowedTabs={navigation}
      />
    </div>
  );
}

export function App() { return <AuthBoundary>{user => <Workspace navigation={user.navigation} />}</AuthBoundary>; }
export default App;
