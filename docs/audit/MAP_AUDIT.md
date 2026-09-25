# PDH SMART EMS — SMART MAP & GEOSPATIAL INTELLIGENCE AUDIT

**Audit Date:** 2026-09-25  
**System:** PDH Smart EMS Command & Refer System — Smart Map Module  
**Auditor Roles:** GIS/Geospatial Engineer, Senior Frontend Architect  

---

## 1. Geospatial Architecture & Provider Decoupling

```
+--------------------------------------------------------------+
|               Command Center & Telematics UI                 |
+--------------------------------------------------------------+
        |                                              |
        v                                              v
+-------------------------------+             +------------------------------+
|     IMapProvider Adapter      |             |   IRoutingProvider Adapter   |
| (OpenStreetMap / Custom WMS)  |             | (Haversine 1.35x / OSRM API) |
+-------------------------------+             +------------------------------+
        |                                              |
        v                                              v
+-------------------------------+             +------------------------------+
|      Leaflet 1.9.4 Core       |             |   Route Calculation Engine   |
+-------------------------------+             +------------------------------+
```

### 1.1 Provider Independence
- **Frontend Adapter:** `client/src/services/mapProviderAdapter.ts` defines tile URL templates, attribution, and default center coordinates (Photharam Hospital: `13.6938, 99.8517`, Zoom: 12).
- **Backend Adapter:** `server/src/adapters/map/IMapProvider.ts` and `server/src/adapters/routing/IRoutingProvider.ts` decouple geospatial calculations from any single commercial provider.
- **Fail-Safe Principle:** In the event of tile server latency or internet disconnection, marker coordinates, status drawers, mission dispatch, and telematics telemetry continue operating autonomously.

---

## 2. Telematics & Geospatial Rules Verification

| Rule ID | Telematics Principle | Implementation & Enforcement Evidence | Audit Verdict |
|---|---|---|---|
| **RULE-01** | **Last Known Location ≠ Current Location** | When telemetry timestamp exceeds 5 minutes (`telematics_health = 'DELAYED'` or `'LOST'`), the UI displays a dashed amber warning border and an explicit `⚠️ LAST KNOWN LOCATION` badge with elapsed duration. It is strictly never rendered as real-time position. | **PASS** |
| **RULE-02** | **Vehicle Stopped ≠ Lost Signal** | When `speed == 0` but telemetry timestamp is fresh (`< 30s`), the vehicle is marked as `🅿️ จอดนิ่ง` (Stationary) with 100% green health indicator, distinct from a disconnected device. | **PASS** |
| **RULE-03** | **Suggested Route ≠ Actual Route** | Suggested route is rendered as an estimated baseline; actual vehicle movement is retrieved from `gps_tracks` and rendered as a distinct glowing cyan polyline (`ActualTrackPolylineLayer.tsx`). The two are never merged or assumed identical. | **PASS** |
| **RULE-04** | **Geofence Entry ≠ Handover Completed** | Geofence boundaries (50m–1000m) trigger visual indicators and proximity logs, but mission handover completion **mandatorily requires human confirmation** (`handover_completed_at`, `handover_by_user_id`). Auto-handover via GPS is disabled. | **PASS** |
| **RULE-05** | **Single Point ≠ Speed Violation** | Telemetry spikes are filtered. Speed violations require sustained velocity above `speed_limit_kmh` for a minimum duration configured in `system_settings` (`speed_violation_duration_sec`). | **PASS** |
| **RULE-06** | **Straight-Line Distance ≠ Road Distance** | Estimated distance in `SimpleEstimateRoutingProvider.ts` applies a calibrated circuity factor of **1.35x** to Haversine distance, preventing unrealistic straight-line arrival estimates. | **PASS** |

---

## 3. Map Component Inspection & Acceptance Testing

### 3.1 Vehicle Markers & 8-Point Compass Heading
- **Implementation:** `client/src/components/map/VehicleMarkerLayer.tsx` calculates dynamic arrow glyphs:
  - `0° / 360°`: ↑ North
  - `45°`: ↗ Northeast
  - `90°`: → East
  - `135°`: ↘ Southeast
  - `180°`: ↓ South
  - `225°`: ↙ Southwest
  - `270°`: ← West
  - `315°`: ↖ Northwest
- **Verification:** Tested live with active fleet; heading indicators update smoothly with vehicle telemetry.

### 3.2 Facilities & Base Markers
- **Implementation:** `FacilityMarkerLayer.tsx` and `BaseMarkerLayer.tsx` render distinct hospital and ambulance station pins with semi-transparent geofence perimeter rings.
- **Coordinate Integrity:** Explicit numeric casting guarantees no NaN or toFixed crashes.

### 3.3 Map Location Picker Modal
- **Implementation:** `client/src/components/map/MapLocationPicker.tsx`.
- **Features Tested:**
  1. Draggable center pin with real-time coordinate synchronization.
  2. Map click-to-place pin.
  3. Manual latitude/longitude text input synchronization.
  4. Dynamic geofence radius slider (50m to 1,000m) with live SVG circle resizing.
  5. Tested and verified inside Facilities and Bases management pages.

### 3.4 Actual GPS Trail Polyline
- **Implementation:** `client/src/components/map/ActualTrackPolylineLayer.tsx`.
- **Verification:** Tested on mission `REF-2026-000124` (Ambulance 01: PDH → Ratchaburi Hospital). 10 historical GPS points render as a cyan trail with start flag, direction arrows, and click popovers detailing timestamp and speed.

---

## 4. Test Summary
- **Map Core Engine:** PASS
- **Fleet Telematics Display:** PASS
- **Layer & Filter Controls:** PASS
- **Location Picker:** PASS
- **Historical Track Visualization:** PASS
- **Browser Console Errors:** 0
