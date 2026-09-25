export type VehicleStatus =
  | 'AVAILABLE'
  | 'ASSIGNED'
  | 'EN_ROUTE'
  | 'AT_SCENE'
  | 'AT_DESTINATION'
  | 'RETURNING'
  | 'MAINTENANCE'
  | 'OUT_OF_SERVICE'
  | 'TRACKING_LOST';

export type TrackingHealthStatus =
  | 'TRACKING'
  | 'TRACKING_DELAYED'
  | 'TRACKING_LOST'
  | 'DEVICE_OFFLINE'
  | 'GPS_UNAVAILABLE';

export type FacilityType =
  | 'HOSPITAL'
  | 'COMMUNITY_HOSPITAL'
  | 'GENERAL_HOSPITAL'
  | 'REGIONAL_HOSPITAL'
  | 'EMS_BASE'
  | 'OTHER';

export interface VehicleMarkerData {
  id: number;
  vehicle_code: string;
  registration_no: string;
  vehicle_type: string;
  status: VehicleStatus;
  current_latitude: number | null;
  current_longitude: number | null;
  current_heading: number | null;
  current_speed: number;
  is_stopped?: boolean;
  last_gps_at: string | null;
  gps_quality: 'GOOD' | 'FAIR' | 'POOR' | 'INVALID';
  seconds_since_last_gps: number | null;
  tracking_health: TrackingHealthStatus;
  active_mission?: {
    id: number;
    mission_no: string;
    mission_type: 'REFER' | 'EMERGENCY' | 'OTHER';
    status: string;
    destination_name?: string;
    scene_description?: string;
  } | null;
  driver?: {
    id: number;
    display_name: string;
    phone?: string;
  } | null;
  crew_count?: number;
}

export interface FacilityData {
  id: number;
  facility_code: string;
  name: string;
  facility_type: FacilityType;
  latitude: number;
  longitude: number;
  geofence_radius: number;
  phone_optional?: string | null;
  active: boolean;
}

export interface EmsBaseData {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  geofence_radius: number;
  active: boolean;
}

export interface ActiveMissionData {
  id: number;
  mission_no: string;
  mission_type: 'REFER' | 'EMERGENCY' | 'OTHER';
  status: string;
  scene_latitude?: number | null;
  scene_longitude?: number | null;
  scene_description?: string | null;
  departure_at?: string | null;
  arrived_at?: string | null;
  created_at: string;
  vehicle_id?: number | null;
  vehicle_code?: string | null;
  vehicle_lat?: number | null;
  vehicle_lng?: number | null;
  current_speed?: number | null;
  driver_name?: string | null;
  origin_name?: string | null;
  origin_lat?: number | null;
  origin_lng?: number | null;
  destination_name?: string | null;
  destination_lat?: number | null;
  destination_lng?: number | null;
}

export interface GpsTrackPoint {
  id?: number;
  latitude: number;
  longitude: number;
  altitude?: number | null;
  speed: number;
  heading?: number | null;
  accuracy?: number;
  gps_quality: 'GOOD' | 'FAIR' | 'POOR' | 'INVALID';
  recorded_at: string;
}

export interface MissionTrackResponse {
  success: boolean;
  mission_id: number;
  mission_no: string;
  mission_type: string;
  vehicle_code: string;
  points_count: number;
  raw_distance_km: number;
  validated_distance_km: number;
  track_points: GpsTrackPoint[];
}

export interface TrackingHealthSummary {
  total_vehicles: number;
  online_moving: number;
  online_stopped: number;
  tracking_delayed: number;
  tracking_lost: number;
  gps_unavailable: number;
}

export interface MapLayersState {
  vehicles: boolean;
  facilities: boolean;
  bases: boolean;
  geofences: boolean;
  activeEmergencyScenes: boolean;
  actualTracks: boolean;
  trafficOrDark: boolean;
}

export type MapFilterType =
  | 'ALL'
  | 'AVAILABLE'
  | 'REFER'
  | 'EMERGENCY'
  | 'EN_ROUTE'
  | 'AT_SCENE'
  | 'RETURNING'
  | 'TRACKING_ALERT'
  | 'SAFETY_ALERT';

export interface PretripChecklist {
  id?: number;
  mission_id: number;
  vehicle_id: number;
  fuel_level: 'FULL' | 'THREE_QUARTERS' | 'HALF' | 'ONE_QUARTER' | 'LOW';
  oxygen_level_psi: number;
  medical_equipment_ready: boolean;
  lights_siren_working: boolean;
  tires_brakes_checked: boolean;
  communication_device_ready: boolean;
  dashcam_gps_ready: boolean;
  notes?: string;
  is_passed: boolean;
  created_at?: string;
}

export interface MissionCrewMember {
  id?: number;
  staff_id: number;
  display_name?: string;
  position?: string;
  profession?: string;
  crew_role: string;
  is_team_leader: boolean;
  confirmed?: boolean;
}

export interface FullMissionDetail {
  id: number;
  mission_no: string;
  mission_type: 'REFER' | 'EMERGENCY' | 'OTHER';
  status: string;
  vehicle_id?: number | null;
  vehicle_code?: string | null;
  registration_no?: string | null;
  current_speed?: number | null;
  driver_id?: number | null;
  driver_name?: string | null;
  driver_phone?: string | null;
  origin_facility_id?: number | null;
  origin_facility_name?: string | null;
  destination_facility_id?: number | null;
  destination_facility_name?: string | null;
  driver_confirmed_at?: string | null;
  crew_confirmed_at?: string | null;
  pretrip_passed?: boolean;
  is_emergency_override?: boolean;
  override_reason?: string | null;
  handover_confirmed_by?: string | null;
  handover_notes?: string | null;
  departure_at?: string | null;
  arrived_at?: string | null;
  handover_at?: string | null;
  return_started_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  crew?: MissionCrewMember[];
  pretrip_checklist?: PretripChecklist | null;
  status_logs?: Array<{
    id: number;
    status: string;
    note: string | null;
    logged_by_name: string | null;
    created_at: string;
  }>;
}

export interface AvailableResources {
  availableVehicles: Array<{
    id: number;
    vehicle_code: string;
    registration_no: string;
    brand: string;
    model: string;
  }>;
  availableDrivers: Array<{
    id: number;
    display_name: string;
    phone_optional?: string;
    driver_license_no_optional?: string;
  }>;
  availableStaff: Array<{
    id: number;
    display_name: string;
    profession: string;
    position?: string;
  }>;
}

export interface EmsKpiMetric {
  name: string;
  code: string;
  avgMinutes: number;
  benchmarkMinutes?: number;
  complianceRatePercent?: number;
  unit: string;
  samples: number;
}

export interface EmsKpisResponse {
  success: boolean;
  timeframe: string;
  missionType: string;
  summary: {
    totalMissions: number;
    completedCount: number;
    activeCount: number;
    emergencyCount: number;
    referCount: number;
  };
  kpis: {
    t1_call_to_dispatch: EmsKpiMetric;
    t2_turnout_time: EmsKpiMetric;
    t3_response_time: EmsKpiMetric;
    t4_onscene_time: EmsKpiMetric;
    t5_transport_time: EmsKpiMetric;
    t6_handover_time: EmsKpiMetric;
    t7_return_time: EmsKpiMetric;
    t8_total_cycle_time: EmsKpiMetric;
  };
}

export interface TripSummaryItem {
  id: number;
  missionNo: string;
  missionType: 'REFER' | 'EMERGENCY' | 'OTHER';
  status: string;
  vehicleCode: string;
  registrationNo: string;
  driverName: string;
  origin: string;
  destination: string;
  sceneDescription?: string | null;
  sceneLatitude?: number | null;
  sceneLongitude?: number | null;
  createdAt: string;
  departureAt?: string | null;
  arrivedAt?: string | null;
  handoverAt?: string | null;
  completedAt?: string | null;
  durationMinutes: number;
  distanceKm: number;
  maxSpeedKmh: number;
  speedWarningsCount: number;
  speedCriticalsCount: number;
  offlineSyncCount: number;
  handoverConfirmedBy?: string | null;
  handoverNotes?: string | null;
  pretripPassed: boolean;
  isEmergencyOverride: boolean;
}

export interface SpatialHotspot {
  latitude: number;
  longitude: number;
  count: number;
  intensity: number;
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  avgResponseMinutes: number;
  label: string;
  descriptions: string[];
}

export interface ReferCorridor {
  originId: number;
  originName: string;
  originCoords: [number, number];
  destinationId: number;
  destinationName: string;
  destinationCoords: [number, number];
  transferCount: number;
  avgTransportMinutes: number;
}

export interface SpatialDensityResponse {
  success: boolean;
  timeframe: string;
  totalIncidents: number;
  hotspots: SpatialHotspot[];
  referCorridors: ReferCorridor[];
  rawIncidents: Array<{
    id: number;
    missionNo: string;
    latitude: number;
    longitude: number;
    description: string;
    createdAt: string;
    responseMinutes: number | null;
  }>;
}

