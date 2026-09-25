import React from 'react';
import { Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import { EmsBaseData } from '../../types/ems';

interface BaseMarkerLayerProps {
  bases: EmsBaseData[];
  showGeofence: boolean;
}

function createBaseIcon(base: EmsBaseData) {
  const html = `
    <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer;">
      <div style="
        background-color: #0d9488;
        border: 2px solid #5eead4;
        color: white;
        padding: 3px 8px;
        border-radius: 9999px;
        font-weight: 700;
        font-size: 11px;
        display: flex;
        align-items: center;
        gap: 4px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.4);
        white-space: nowrap;
      ">
        <span>📍</span>
        <span>ฐาน ${base.name.split(' ')[0]}</span>
      </div>
      <div style="
        width: 0; 
        height: 0; 
        border-left: 4px solid transparent;
        border-right: 4px solid transparent;
        border-top: 5px solid #0d9488;
      "></div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-base-marker',
    iconSize: [80, 30],
    iconAnchor: [40, 30],
    popupAnchor: [0, -30],
  });
}

export const BaseMarkerLayer: React.FC<BaseMarkerLayerProps> = ({ bases, showGeofence }) => {
  return (
    <>
      {bases.map((base) => {
        const lat = Number(base.latitude);
        const lng = Number(base.longitude);
        const radius = Number(base.geofence_radius) || 150;
        if (isNaN(lat) || isNaN(lng)) return null;

        return (
          <React.Fragment key={`base-group-${base.id}`}>
            {showGeofence && (
              <Circle
                center={[lat, lng]}
                radius={radius}
                pathOptions={{
                  color: '#0d9488',
                  fillColor: '#0d9488',
                  fillOpacity: 0.15,
                  weight: 1.5,
                  dashArray: '3, 5',
                }}
              />
            )}

            <Marker position={[lat, lng]} icon={createBaseIcon(base)}>
              <Popup minWidth={220}>
                <div className="p-3 text-slate-100 space-y-2">
                  <div className="flex items-center gap-2 border-b border-slate-700/80 pb-2">
                    <span className="text-xl">📍</span>
                    <div>
                      <h4 className="font-bold text-sm text-white">{base.name}</h4>
                      <p className="text-[11px] text-teal-400">ฐานจอดรถกู้ชีพ EMS Base</p>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">รัศมี Geofence:</span>
                      <span className="font-semibold text-slate-200">{radius} เมตร</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400 pt-1">
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
