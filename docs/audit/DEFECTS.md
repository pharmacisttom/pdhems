# PDH SMART EMS — DEFECT LOG & REPAIR REGISTER

**Audit Date:** 2026-09-25  
**System:** PDH Smart EMS Command & Refer System  

---

## Defect Priority Definitions
- **P0 — Critical:** Mission cannot dispatch/depart, data corruption, authentication bypass, mission lost.
- **P1 — High:** Telematics pipeline failure, offline sync breakdown, incorrect status/location display, unhandled coordinate crashes.
- **P2 — Medium:** Workflow inconvenience, responsive layout defects on tablet/mobile, performance bottlenecks.
- **P3 — Low:** Cosmetic flaws, minor spacing or typography discrepancies.

---

## Defect Register & Resolution Log

| Defect ID | Priority | Module | Description | Root Cause | Repair Action | Verification | Status |
|---|---|---|---|---|---|---|---|
| **DEF-01** | **P1** | Map / Facilities | `TypeError: fac.latitude.toFixed is not a function` on Facility markers | `mysql2` driver returns `DECIMAL(10,7)` fields as string values rather than JavaScript numbers. When passed directly to `.toFixed(4)` or Leaflet LatLng, an uncaught runtime error occurs. | Applied explicit `Number(...)` casting in both backend controllers (`facilityController.ts`, `baseController.ts`, `mapController.ts`) and frontend layer components (`FacilityMarkerLayer.tsx`, `BaseMarkerLayer.tsx`, `VehicleMarkerLayer.tsx`). | Tested with automated API tests and live browser execution on `http://localhost:5173/`. 0 console errors. | **RESOLVED** |
| **DEF-02** | **P2** | Command Center UI | Command Center Map and Telematics Drawer stacked vertically instead of side-by-side on 1366x768 standard hospital screens | Responsive breakpoint was set to `lg:flex-row`, which only triggers at 1024px+ with specific container margins, collapsing into a 100vh vertical scroll on standard 1366x599 browser viewports. | Changed layout container breakpoint to `md:flex-row` with `md:w-80` fixed sidebar width and `flex-1` for map canvas. | Verified in browser at 1366x599 viewport. Map and fleet telemetry display side-by-side simultaneously. | **RESOLVED** |
| **DEF-03** | **P2** | Frontend Dependencies | `react-leaflet@5.x` peer dependency conflict with React 18 | `react-leaflet@5.0` requires React 19, whereas project is built on stable React 18.3.1. | Pinned `react-leaflet` to `^4.2.1` in `client/package.json` and cleanly reinstalled. | `npm run build` in `client/` compiles without peer dependency warnings or build errors. | **RESOLVED** |
| **DEF-04** | **P3** | Telemetry UI | Missing visual indicator when ambulance is stationary with healthy GPS vs. lost signal | Ambiguous status: speed = 0 could be mistaken for disconnected telematics. | Implemented discrete `🅿️ จอดนิ่ง` stopped badge for speed == 0 with fresh GPS, and separate amber `⚠️ LAST KNOWN LOCATION` warning with dashed outline when GPS timestamp exceeds 5 minutes. | Verified in `VehicleMarkerLayer.tsx` and Browser screenshots. | **RESOLVED** |

---

## Active Defect Summary
- **P0 Defects:** 0
- **P1 Defects:** 0
- **P2 Defects:** 0
- **P3 Defects:** 0

**System Health:** All identified defects during initial audit have been resolved and regression-tested. Zero active blockers exist.
