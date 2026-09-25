-- Phase MAP-7 & Phase 9: Spatial Analytics, Trip Reports & EMS KPI Schema Enhancement

ALTER TABLE ems_missions
  ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS scene_arrived_at TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS scene_departure_at TIMESTAMP NULL;

-- Spatial index hints for accident hotspots and frequent corridors
CREATE INDEX IF NOT EXISTS idx_mission_scene_coords ON ems_missions (scene_latitude, scene_longitude);
CREATE INDEX IF NOT EXISTS idx_mission_corridor ON ems_missions (origin_facility_id, destination_facility_id);
CREATE INDEX IF NOT EXISTS idx_mission_timestamps ON ems_missions (created_at, completed_at);
