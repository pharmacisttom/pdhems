import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { CommandCenterMapPage } from './pages/CommandCenterMapPage';
import { FacilitiesPage } from './pages/FacilitiesPage';
import { BasesPage } from './pages/BasesPage';
import { MissionsPage } from './pages/MissionsPage';
import { DriverCabPage } from './pages/DriverCabPage';
import { fetchActiveMissions } from './services/api';

export function App() {
  const [currentTab, setCurrentTab] = useState<'map' | 'missions' | 'driver' | 'facilities' | 'bases'>('map');
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        activeEmergencyCount={activeEmergencyCount}
      />

      <main className="flex-1 flex flex-col overflow-hidden">
        {currentTab === 'map' && <CommandCenterMapPage />}
        {currentTab === 'missions' && <MissionsPage />}
        {currentTab === 'driver' && <DriverCabPage />}
        {currentTab === 'facilities' && <FacilitiesPage />}
        {currentTab === 'bases' && <BasesPage />}
      </main>
    </div>
  );
}

export default App;
