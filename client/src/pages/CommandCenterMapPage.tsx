import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import {
  VehicleMarkerData,
  FacilityData,
  EmsBaseData,
  ActiveMissionData,
  MapFilterType,
  MapLayersState,
} from '../types/ems';
import { fetchVehicles, fetchFacilities, fetchBases, fetchActiveMissions, updateAmbulanceLocation } from '../services/api';
import { getActiveMapProvider } from '../services/mapProviderAdapter';
import { MapFilterBar } from '../components/map/MapFilterBar';
import { MapLayerControl } from '../components/map/MapLayerControl';
import { VehicleMarkerLayer } from '../components/map/VehicleMarkerLayer';
import { FacilityMarkerLayer } from '../components/map/FacilityMarkerLayer';
import { BaseMarkerLayer } from '../components/map/BaseMarkerLayer';
import {
  AlertTriangle,
  Ambulance,
  PhoneCall,
  Activity,
  Navigation,
  RefreshCw,
  Clock,
  ShieldAlert,
  ChevronRight,
  MapPin,
  Flame,
} from 'lucide-react';

// Emergency Scene Pin Icon
const sceneIcon = L.divIcon({
  html: `
    <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
      <div style="position: absolute; top: -6px; left: -6px; right: -6px; bottom: -6px; border-radius: 9999px; background: rgba(239, 68, 68, 0.5); animation: ping 1.2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
      <div style="
        background: #ef4444; 
        color: white; 
        border: 2px solid white; 
        padding: 4px 8px; 
        border-radius: 9999px; 
        font-weight: 800; 
        font-size: 11px;
        box-shadow: 0 4px 10px rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        gap: 3px;
        white-space: nowrap;
      ">
        <span>🚨</span>
        <span>จุดเกิดเหตุ</span>
      </div>
    </div>
  `,
  className: 'custom-scene-marker',
  iconSize: [80, 30],
  iconAnchor: [40, 30],
  popupAnchor: [0, -30],
});

export const CommandCenterMapPage: React.FC = () => {
  const [vehicles, setVehicles] = useState<VehicleMarkerData[]>([]);
  const [facilities, setFacilities] = useState<FacilityData[]>([]);
  const [bases, setBases] = useState<EmsBaseData[]>([]);
  const [missions, setMissions] = useState<ActiveMissionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [mapError, setMapError] = useState<boolean>(false);

  // Filters & Layers
  const [currentFilter, setCurrentFilter] = useState<MapFilterType>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [layers, setLayers] = useState<MapLayersState>({
    vehicles: true,
    facilities: true,
    bases: true,
    geofences: true,
    activeEmergencyScenes: true,
    trafficOrDark: true,
  });

  const [selectedVehicle, setSelectedVehicle] = useState<VehicleMarkerData | null>(null);

  // Load Data
  const loadData = async () => {
    try {
      const [vData, fData, bData, mData] = await Promise.all([
        fetchVehicles(),
        fetchFacilities(),
        fetchBases(),
        fetchActiveMissions(),
      ]);
      setVehicles(vData);
      setFacilities(fData);
      setBases(bData);
      setMissions(mData);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Error loading telematics data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Auto polling every 10 seconds for real-time tracking
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleLayer = (key: keyof MapLayersState) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Filter vehicles according to active criteria
  const filteredVehicles = vehicles.filter((v) => {
    // Search query matches vehicle code, mission no, or driver name
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchCode = v.vehicle_code.toLowerCase().includes(q);
      const matchMission = v.active_mission?.mission_no.toLowerCase().includes(q);
      const matchDriver = v.driver?.display_name.toLowerCase().includes(q);
      if (!matchCode && !matchMission && !matchDriver) return false;
    }

    if (currentFilter === 'ALL') return true;
    if (currentFilter === 'AVAILABLE') return v.status === 'AVAILABLE';
    if (currentFilter === 'REFER')
      return v.active_mission?.mission_type === 'REFER' && v.status !== 'AVAILABLE';
    if (currentFilter === 'EMERGENCY')
      return v.active_mission?.mission_type === 'EMERGENCY' && v.status !== 'AVAILABLE';
    if (currentFilter === 'EN_ROUTE') return v.status === 'EN_ROUTE';
    if (currentFilter === 'AT_SCENE') return v.status === 'AT_SCENE';
    if (currentFilter === 'RETURNING') return v.status === 'RETURNING';
    if (currentFilter === 'TRACKING_ALERT')
      return v.tracking_health === 'TRACKING_DELAYED' || v.tracking_health === 'TRACKING_LOST';
    return true;
  });

  const activeEmergencies = missions.filter((m) => m.mission_type === 'EMERGENCY');
  const provider = getActiveMapProvider();
  const tileConfig = provider.getTileConfig();
  const defaultCenter = provider.getDefaultCenter();

  // Test simulation: move an ambulance slightly
  const handleSimulateGps = async (vehicleId: number) => {
    const v = vehicles.find((x) => x.id === vehicleId);
    if (!v || v.current_latitude === null || v.current_longitude === null) return;
    const deltaLat = (Math.random() - 0.48) * 0.005;
    const deltaLng = (Math.random() - 0.48) * 0.005;
    const newSpeed = Math.floor(45 + Math.random() * 40);
    const newHeading = Math.floor(Math.random() * 360);

    await updateAmbulanceLocation(vehicleId, {
      latitude: v.current_latitude + deltaLat,
      longitude: v.current_longitude + deltaLng,
      speed: newSpeed,
      heading: newHeading,
      status: v.status === 'AVAILABLE' ? 'EN_ROUTE' : v.status,
    });
    await loadData();
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-slate-950">
      {/* Active Emergency Banner (Section 33) */}
      {activeEmergencies.length > 0 && (
        <div className="bg-rose-950/80 border-b border-rose-500/40 px-4 py-2 flex items-center justify-between text-xs text-rose-200">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
            </span>
            <span className="font-bold text-rose-100 flex items-center gap-1.5">
              🚨 ACTIVE EMERGENCY ({activeEmergencies.length} เหตุฉุกเฉินกำลังดำเนินการ)
            </span>
            <span className="hidden md:inline text-rose-300">
              — {activeEmergencies[0].mission_no}: {activeEmergencies[0].scene_description || 'ออกเหตุฉุกเฉิน'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-rose-300">
              รถ: <strong className="text-white">{activeEmergencies[0].vehicle_code || 'EMS'}</strong> | สถานะ:{' '}
              <strong className="text-white">{activeEmergencies[0].status}</strong>
            </span>
          </div>
        </div>
      )}

      {/* Top Filter and Search Bar */}
      <MapFilterBar
        currentFilter={currentFilter}
        onFilterChange={setCurrentFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        vehicles={vehicles}
      />

      {/* Main Workspace Layout (Section 32) */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Left Side Panel: Missions & Fleet List */}
        <aside className="w-full lg:w-80 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 order-2 lg:order-1 h-64 lg:h-auto overflow-hidden">
          {/* Panel Header */}
          <div className="p-3 bg-slate-800/80 border-b border-slate-700/80 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Ambulance className="w-4 h-4 text-sky-400" />
              <span className="font-bold text-slate-100">รายการรถ EMS & ภารกิจ</span>
            </div>
            <button
              onClick={loadData}
              title="รีเฟรชข้อมูล GPS"
              className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-700 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Vehicle List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/80 p-2 space-y-1.5 scrollbar-thin">
            {filteredVehicles.map((v) => {
              const isSelected = selectedVehicle?.id === v.id;
              const isLost = v.tracking_health === 'TRACKING_LOST';
              const isDelayed = v.tracking_health === 'TRACKING_DELAYED';

              return (
                <div
                  key={`list-v-${v.id}`}
                  onClick={() => setSelectedVehicle(v)}
                  className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-sky-950/60 border-sky-500 shadow-md shadow-sky-900/30'
                      : 'bg-slate-800/50 border-slate-700/60 hover:bg-slate-800/90 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base">🚑</span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm text-white">{v.vehicle_code}</span>
                          {v.current_speed > 0 && !isLost && (
                            <span className="px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 text-[10px] font-semibold border border-sky-500/30">
                              {Math.round(v.current_speed)} km/h
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400">{v.registration_no}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          v.status === 'AVAILABLE'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : v.status === 'EN_ROUTE'
                            ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40'
                            : v.status === 'AT_SCENE'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                            : isLost
                            ? 'bg-slate-600/30 text-slate-400 border border-slate-600'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                        }`}
                      >
                        {v.status}
                      </span>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {v.seconds_since_last_gps !== null
                          ? `${v.seconds_since_last_gps}s ago`
                          : 'No GPS'}
                      </p>
                    </div>
                  </div>

                  {/* Warning tag */}
                  {(isLost || isDelayed) && (
                    <div className="mt-1.5 px-2 py-1 rounded bg-amber-950/40 border border-amber-500/30 text-[10px] text-amber-300 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                      <span>{isLost ? 'Tracking Lost (พิกัดเก่า)' : 'Tracking Delayed'}</span>
                    </div>
                  )}

                  {/* Active mission subtitle */}
                  {v.active_mission && (
                    <div className="mt-2 pt-1.5 border-t border-slate-700/60 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 truncate max-w-[150px]">
                        {v.active_mission.mission_no}
                      </span>
                      <span className="text-sky-400 font-medium">
                        {v.active_mission.mission_type}
                      </span>
                    </div>
                  )}

                  {/* Simulation button */}
                  <div className="mt-2 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSimulateGps(v.id);
                      }}
                      className="px-2 py-0.5 text-[10px] bg-slate-700 hover:bg-slate-600 text-sky-300 rounded border border-slate-600 transition-colors"
                      title="จำลองพิกัด GPS เคลื่อนที่เพื่อทดสอบการตอบสนองของแผนที่"
                    >
                      ⚡ จำลอง GPS เคลื่อนที่
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer of Left Panel */}
          <div className="p-2.5 bg-slate-900 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>แสดง {filteredVehicles.length} / {vehicles.length} คัน</span>
            <span>อัปเดต: {lastRefreshed.toLocaleTimeString('th-TH')}</span>
          </div>
        </aside>

        {/* Center: Full Interactive Map */}
        <div className="flex-1 relative order-1 lg:order-2 h-full">
          {/* Layer Control Menu */}
          <MapLayerControl
            layers={layers}
            onChangeLayer={handleToggleLayer}
            vehicleCount={vehicles.length}
            facilityCount={facilities.length}
            baseCount={bases.length}
          />

          {/* Fail-Safe Warning if Map Provider fails (Section 42) */}
          {mapError ? (
            <div className="absolute inset-0 flex items-center justify-center p-6 bg-slate-900 text-center">
              <div className="max-w-md p-6 bg-slate-800 border border-amber-500 rounded-2xl shadow-2xl">
                <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-3" />
                <h3 className="font-bold text-lg text-white mb-2">Map Provider ไม่ตอบสนอง</h3>
                <p className="text-xs text-slate-300 mb-4">
                  ระบบเข้าสู่โหมด Fail-Safe Telematics: แผนที่อาจแสดงผลไม่ได้ชั่วคราว
                  แต่งานสั่งการ EMS รับแจ้งเหตุ และการบันทึก GPS ยังทำงานได้ตามปกติ
                </p>
                <button
                  onClick={() => setMapError(false)}
                  className="px-4 py-2 bg-sky-600 text-white rounded-lg text-xs font-semibold"
                >
                  ลองใหม่อีกครั้ง
                </button>
              </div>
            </div>
          ) : (
            <MapContainer
              center={defaultCenter}
              zoom={12}
              scrollWheelZoom={true}
              className={`w-full h-full ${layers.trafficOrDark ? 'dark-tiles' : ''}`}
            >
              <TileLayer attribution={tileConfig.attribution} url={tileConfig.url} />

              {/* Bases Layer */}
              {layers.bases && <BaseMarkerLayer bases={bases} showGeofence={layers.geofences} />}

              {/* Facilities Layer */}
              {layers.facilities && (
                <FacilityMarkerLayer
                  facilities={facilities}
                  showGeofence={layers.geofences}
                />
              )}

              {/* Vehicles Layer */}
              {layers.vehicles && (
                <VehicleMarkerLayer
                  vehicles={filteredVehicles}
                  onSelectMission={(mNo) => alert(`ดูภารกิจ: ${mNo}`)}
                />
              )}

              {/* Active Emergency Scene Markers */}
              {layers.activeEmergencyScenes &&
                missions
                  .filter(
                    (m) =>
                      m.mission_type === 'EMERGENCY' &&
                      m.scene_latitude !== null &&
                      m.scene_longitude !== null
                  )
                  .map((m) => {
                    const sceneLat = Number(m.scene_latitude);
                    const sceneLng = Number(m.scene_longitude);
                    if (isNaN(sceneLat) || isNaN(sceneLng)) return null;

                    return (
                      <React.Fragment key={`scene-${m.id}`}>
                        {layers.geofences && (
                          <Circle
                            center={[sceneLat, sceneLng]}
                            radius={100}
                            pathOptions={{
                              color: '#ef4444',
                              fillColor: '#ef4444',
                              fillOpacity: 0.2,
                              weight: 2,
                              dashArray: '3, 4',
                            }}
                          />
                        )}
                        <Marker
                          position={[sceneLat, sceneLng]}
                          icon={sceneIcon}
                        >
                        <Popup minWidth={220}>
                          <div className="p-3 text-slate-100 space-y-1.5">
                            <div className="flex items-center gap-1.5 text-rose-400 font-bold text-sm border-b border-slate-700 pb-1">
                              <span>🚨</span>
                              <span>{m.mission_no} (จุดเกิดเหตุ)</span>
                            </div>
                            <p className="text-xs text-slate-300 font-medium">
                              {m.scene_description || 'ไม่มีคำอธิบายจุดเกิดเหตุ'}
                            </p>
                            <div className="text-[11px] text-slate-400 pt-1">
                              สถานะ: <strong className="text-white">{m.status}</strong>
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    </React.Fragment>
                  );
                })}
            </MapContainer>
          )}

          {/* Quick Map Legend Badge at Bottom Right */}
          <div className="absolute bottom-4 right-4 z-[1000] bg-slate-900/90 border border-slate-700/80 backdrop-blur-md rounded-xl p-2.5 text-[11px] text-slate-300 shadow-xl hidden md:flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span>พร้อมใช้งาน</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
              <span>กำลังเดินทาง</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              <span>จุดเกิดเหตุ</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span>กลับฐาน/Stale</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span>
              <span>Tracking Lost</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
