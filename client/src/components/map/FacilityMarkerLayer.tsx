import React from 'react';
import { Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import { FacilityData } from '../../types/ems';

interface FacilityMarkerLayerProps {
  facilities: FacilityData[];
  showGeofence: boolean;
}

function getFacilityColor(type: string) {
  switch (type) {
    case 'REGIONAL_HOSPITAL':
      return { bg: '#8b5cf6', border: '#c4b5fd', label: 'รพ.ศูนย์ (Regional)' };
    case 'GENERAL_HOSPITAL':
      return { bg: '#3b82f6', border: '#93c5fd', label: 'รพ.ทั่วไป (General)' };
    case 'COMMUNITY_HOSPITAL':
      return { bg: '#06b6d4', border: '#67e8f9', label: 'รพ.ชุมชน (Community)' };
    case 'EMS_BASE':
      return { bg: '#10b981', border: '#6ee7b7', label: 'ฐานกู้ชีพ (EMS Base)' };
    default:
      return { bg: '#64748b', border: '#94a3b8', label: 'สถานพยาบาล (Hospital)' };
  }
}

function createFacilityIcon(facility: FacilityData) {
  const styles = getFacilityColor(facility.facility_type);
  const isPdh = facility.facility_code === 'PDH';

  const html = `
    <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer;">
      <div style="
        background-color: ${isPdh ? '#0284c7' : styles.bg};
        border: 2px solid ${isPdh ? '#38bdf8' : styles.border};
        color: white;
        padding: 4px 8px;
        border-radius: 8px;
        font-weight: 700;
        font-size: 11px;
        display: flex;
        align-items: center;
        gap: 4px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.4);
        white-space: nowrap;
      ">
        <span>🏥</span>
        <span>${facility.facility_code}</span>
      </div>
      <div style="
        width: 0; 
        height: 0; 
        border-left: 5px solid transparent;
        border-right: 5px solid transparent;
        border-top: 6px solid ${isPdh ? '#0284c7' : styles.bg};
      "></div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-facility-marker',
    iconSize: [60, 32],
    iconAnchor: [30, 32],
    popupAnchor: [0, -32],
  });
}

export const FacilityMarkerLayer: React.FC<FacilityMarkerLayerProps> = ({
  facilities,
  showGeofence,
}) => {
  return (
    <>
      {facilities.map((fac) => {
        const styles = getFacilityColor(fac.facility_type);
        const lat = Number(fac.latitude);
        const lng = Number(fac.longitude);
        const radius = Number(fac.geofence_radius) || 200;
        if (isNaN(lat) || isNaN(lng)) return null;

        return (
          <React.Fragment key={`facility-group-${fac.id}`}>
            {/* Geofence Ring (Section 12) */}
            {showGeofence && (
              <Circle
                center={[lat, lng]}
                radius={radius}
                pathOptions={{
                  color: styles.bg,
                  fillColor: styles.bg,
                  fillOpacity: 0.12,
                  weight: 1.5,
                  dashArray: '4, 4',
                }}
              />
            )}

            <Marker
              position={[lat, lng]}
              icon={createFacilityIcon(fac)}
            >
              <Popup minWidth={240}>
                <div className="p-3 text-ems-ink space-y-2">
                  <div className="flex items-center gap-2 border-b border-ems-border/80 pb-2">
                    <span className="text-xl">🏥</span>
                    <div>
                      <h4 className="font-bold text-sm text-ems-ink">{fac.name}</h4>
                      <p className="text-[11px] text-ems-muted">
                        รหัส: <span className="font-semibold text-sky-700">{fac.facility_code}</span>
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-ems-muted">ประเภท:</span>
                      <span className="font-semibold text-ems-ink">{styles.label}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ems-muted">รัศมี Geofence:</span>
                      <span className="font-semibold text-ems-ink">{radius} เมตร</span>
                    </div>
                    {fac.phone_optional && (
                      <div className="flex justify-between items-center">
                        <span className="text-ems-muted">เบอร์โทรศัพท์:</span>
                        <a
                          href={`tel:${fac.phone_optional}`}
                          className="text-sky-700 font-semibold hover:underline"
                        >
                          {fac.phone_optional}
                        </a>
                      </div>
                    )}
                    <div className="flex justify-between text-[11px] text-ems-muted pt-1">
                      <span>พิกัด GPS:</span>
                      <span className="font-mono">
                        {lat.toFixed(5)}, {lng.toFixed(5)}
                      </span>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          </React.Fragment>
        );
      })}
    </>
  );
};
