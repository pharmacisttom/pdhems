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
