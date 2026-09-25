import { VehicleMarkerData, FacilityData, EmsBaseData, ActiveMissionData } from '../types/ems';

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

export async function saveFacility(facility: Partial<FacilityData>): Promise<{ success: boolean; data?: FacilityData; message?: string }> {
  try {
    const url = facility.id ? `${API_BASE}/facilities/${facility.id}` : `${API_BASE}/facilities`;
    const method = facility.id ? 'PUT' : 'POST';
    const token = localStorage.getItem('token');

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(facility)
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function saveBase(base: Partial<EmsBaseData>): Promise<{ success: boolean; data?: EmsBaseData; message?: string }> {
  try {
    const url = base.id ? `${API_BASE}/bases/${base.id}` : `${API_BASE}/bases`;
    const method = base.id ? 'PUT' : 'POST';
    const token = localStorage.getItem('token');

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(base)
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
      body: JSON.stringify(coords)
    });
    return res.ok;
  } catch (err) {
    console.error('Failed to update ambulance location:', err);
    return false;
  }
}
