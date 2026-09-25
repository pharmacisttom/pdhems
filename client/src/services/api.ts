import { authFetch as fetch } from './auth';
import {
  VehicleMarkerData,
  FacilityData,
  EmsBaseData,
  ActiveMissionData,
  MissionTrackResponse,
  GpsTrackPoint,
  TrackingHealthSummary,
} from '../types/ems';

const API_BASE = '/api';

export async function fetchVehicles(): Promise<VehicleMarkerData[]> {
  try {
    const res = await fetch(`${API_BASE}/map/vehicles`);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.error('Failed to fetch vehicles:', err);
    return [];
  }
}

export async function fetchFacilities(): Promise<FacilityData[]> {
  try {
    const res = await fetch(`${API_BASE}/map/facilities`);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.error('Failed to fetch facilities:', err);
    return [];
  }
}

export async function fetchBases(): Promise<EmsBaseData[]> {
  try {
    const res = await fetch(`${API_BASE}/map/bases`);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.error('Failed to fetch EMS bases:', err);
    return [];
  }
}

export async function fetchActiveMissions(): Promise<ActiveMissionData[]> {
  try {
    const res = await fetch(`${API_BASE}/map/active-missions`);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.error('Failed to fetch active missions:', err);
    return [];
  }
}

// Phase MAP-2: Fetch Recorded GPS Track for a Mission (Section 13, 25, 35)
export async function fetchMissionTrack(missionIdOrNo: string | number): Promise<MissionTrackResponse | null> {
  try {
    const res = await fetch(`${API_BASE}/map/mission/${missionIdOrNo}/track`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error(`Failed to fetch track for mission ${missionIdOrNo}:`, err);
    return null;
  }
}

// Phase MAP-2: Fetch Recent Vehicle Track
export async function fetchVehicleTrack(vehicleId: number): Promise<GpsTrackPoint[]> {
  try {
    const res = await fetch(`${API_BASE}/map/vehicles/${vehicleId}/track`);
    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.error(`Failed to fetch track for vehicle ${vehicleId}:`, err);
    return [];
  }
}

// Phase MAP-2: Fetch Fleet Tracking Health Summary (Section 33)
export async function fetchTrackingHealth(): Promise<TrackingHealthSummary | null> {
  try {
    const res = await fetch(`${API_BASE}/map/tracking-health`);
    if (!res.ok) return null;
    const json = await res.json();
    return json.data || null;
  } catch (err) {
    console.error('Failed to fetch tracking health summary:', err);
    return null;
  }
}

export async function saveFacility(
  facility: Partial<FacilityData>
): Promise<{ success: boolean; data?: FacilityData; message?: string }> {
  try {
    const url = facility.id ? `${API_BASE}/facilities/${facility.id}` : `${API_BASE}/facilities`;
    const method = facility.id ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',

      },
      body: JSON.stringify(facility),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function saveBase(
  base: Partial<EmsBaseData>
): Promise<{ success: boolean; data?: EmsBaseData; message?: string }> {
  try {
    const url = base.id ? `${API_BASE}/bases/${base.id}` : `${API_BASE}/bases`;
    const method = base.id ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',

      },
      body: JSON.stringify(base),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function updateAmbulanceLocation(
  vehicleId: number,
  coords: { latitude: number; longitude: number; speed?: number; heading?: number; status?: string }
): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/ambulances/${vehicleId}/location`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(coords),
    });
    return res.ok;
  } catch (err) {
    console.error('Failed to update ambulance location:', err);
    return false;
  }
}

// -------------------------------------------------------------
// Phase 2 & 3: Mission & Pretrip Telematics API Methods
// -------------------------------------------------------------

function getAuthHeader(): Record<string, string> { return {}; }

export async function fetchMissions(filter?: { status?: string; type?: string }): Promise<any[]> {
  try {
    let url = `${API_BASE}/missions?limit=50`;
    if (filter?.status) url += `&status=${filter.status}`;
    if (filter?.type) url += `&type=${filter.type}`;

    let res = await fetch(url, { headers: getAuthHeader() });

    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.error('Failed to fetch missions:', err);
    return [];
  }
}

export async function fetchMissionDetail(id: number): Promise<any | null> {
  try {
    let res = await fetch(`${API_BASE}/missions/${id}`, { headers: getAuthHeader() });

    if (!res.ok) return null;
    const json = await res.json();
    return json.data || null;
  } catch (err) {
    console.error(`Failed to fetch mission ${id}:`, err);
    return null;
  }
}

export async function fetchAvailableResources(): Promise<any> {
  try {
    let res = await fetch(`${API_BASE}/missions/resources/available`, { headers: getAuthHeader() });

    const json = await res.json();
    return json.data || { availableVehicles: [], availableDrivers: [], availableStaff: [] };
  } catch (err) {
    console.error('Failed to fetch available resources:', err);
    return { availableVehicles: [], availableDrivers: [], availableStaff: [] };
  }
}

export async function createReferMission(payload: {
  originFacilityId: number;
  destinationFacilityId: number;
  notes?: string;
}): Promise<{ success: boolean; data?: any; message?: string }> {
  try {
    let res = await fetch(`${API_BASE}/missions/refer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload),
    });

    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function assignMission(
  id: number,
  payload: { vehicleId?: number; driverId?: number; crew?: any[] }
): Promise<{ success: boolean; message?: string }> {
  try {
    let res = await fetch(`${API_BASE}/missions/${id}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function confirmMissionReadiness(
  id: number,
  confirmedBy: 'DRIVER' | 'CREW'
): Promise<{ success: boolean; message?: string; data?: any }> {
  try {
    const res = await fetch(`${API_BASE}/missions/${id}/confirm-readiness`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ confirmedBy }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function submitPretripChecklist(
  id: number,
  payload: any
): Promise<{ success: boolean; isPassed?: boolean; message?: string }> {
  try {
    const res = await fetch(`${API_BASE}/missions/${id}/pretrip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function departMission(
  id: number,
  payload: { isEmergencyOverride?: boolean; overrideReason?: string }
): Promise<{ success: boolean; status?: string; message?: string; missingRequirements?: string[] }> {
  try {
    const res = await fetch(`${API_BASE}/missions/${id}/depart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function markMissionArrived(id: number): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch(`${API_BASE}/missions/${id}/arrived`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function confirmMissionHandover(
  id: number,
  payload: { receiverName: string; notes?: string }
): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch(`${API_BASE}/missions/${id}/handover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function startMissionReturn(id: number): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch(`${API_BASE}/missions/${id}/start-return`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function completeMission(id: number): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch(`${API_BASE}/missions/${id}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

// Phase 9 & MAP-7: Reports, EMS KPIs and Spatial Density API calls
export async function fetchEmsKpis(timeframe = 'all', missionType = 'ALL'): Promise<any> {
  try {
    let res = await fetch(`${API_BASE}/reports/kpis?timeframe=${timeframe}&missionType=${missionType}`, {
      headers: getAuthHeader(),
    });

    return await res.json();
  } catch (err: any) {
    console.error('Failed to fetch EMS KPIs:', err);
    return { success: false, message: err.message };
  }
}

export async function fetchTripSummary(params?: {
  missionType?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<any> {
  try {
    const searchParams = new URLSearchParams();
    if (params?.missionType) searchParams.append('missionType', params.missionType);
    if (params?.status) searchParams.append('status', params.status);
    if (params?.limit) searchParams.append('limit', String(params.limit));
    if (params?.offset) searchParams.append('offset', String(params.offset));

    let res = await fetch(`${API_BASE}/reports/trip-summary?${searchParams.toString()}`, {
      headers: getAuthHeader(),
    });

    return await res.json();
  } catch (err: any) {
    console.error('Failed to fetch Trip Summary Report:', err);
    return { success: false, trips: [], total: 0 };
  }
}

export async function fetchSpatialDensity(timeframe = 'all'): Promise<any> {
  try {
    let res = await fetch(`${API_BASE}/reports/spatial-density?timeframe=${timeframe}`, {
      headers: getAuthHeader(),
    });

    return await res.json();
  } catch (err: any) {
    console.error('Failed to fetch Spatial Density:', err);
    return { success: false, hotspots: [], referCorridors: [], rawIncidents: [] };
  }
}

