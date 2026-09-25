import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Check, Crosshair, Navigation } from 'lucide-react';
import { getActiveMapProvider } from '../../services/mapProviderAdapter';

interface MapLocationPickerProps {
  initialLatitude?: number;
  initialLongitude?: number;
  initialRadius?: number;
  title?: string;
  onConfirm: (location: { latitude: number; longitude: number; radius: number }) => void;
  onCancel?: () => void;
}

// Draggable / Click-to-place pin icon
const pinIcon = L.divIcon({
  html: `
    <div style="display: flex; flex-direction: column; align-items: center; cursor: grab;">
      <div style="
        background: #ef4444; 
        color: white; 
        border: 2px solid white; 
        border-radius: 9999px; 
        width: 32px; 
        height: 32px; 
        display: flex; 
        align-items: center; 
        justify-content: center; 
        font-size: 16px;
        box-shadow: 0 4px 10px rgba(0,0,0,0.5);
      ">
        📍
      </div>
      <div style="width: 2px; height: 10px; background: #ef4444;"></div>
      <div style="width: 8px; height: 4px; background: rgba(0,0,0,0.4); border-radius: 9999px;"></div>
    </div>
  `,
  className: 'custom-picker-pin',
  iconSize: [32, 46],
  iconAnchor: [16, 46],
});

// Click handler component for react-leaflet
function MapClickHandler({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e: L.LeafletMouseEvent) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export const MapLocationPicker: React.FC<MapLocationPickerProps> = ({
  initialLatitude = 13.693822,
  initialLongitude = 99.851921,
  initialRadius = 200,
  title = 'เลือกพิกัดบนแผนที่ (Map Location Picker)',
  onConfirm,
  onCancel,
}) => {
  const [lat, setLat] = useState<number>(initialLatitude);
  const [lng, setLng] = useState<number>(initialLongitude);
  const [radius, setRadius] = useState<number>(initialRadius);

  const provider = getActiveMapProvider('openstreetmap');
  const tileConfig = provider.getTileConfig();

  const handleMarkerDrag = (e: any) => {
    const newPos = e.target.getLatLng();
    setLat(newPos.lat);
    setLng(newPos.lng);
  };

  const handleMapClick = (clickLat: number, clickLng: number) => {
    setLat(clickLat);
    setLng(clickLng);
  };

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(pos.coords.latitude);
          setLng(pos.coords.longitude);
        },
        (err) => {
          alert('ไม่สามารถดึงพิกัดจากอุปกรณ์ได้: ' + err.message);
        },
        { enableHighAccuracy: true }
      );
    } else {
      alert('เบราว์เซอร์ไม่รองรับ Geolocation');
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[560px]">
      {/* Header */}
      <div className="p-4 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-rose-500" />
          <h3 className="font-bold text-slate-100 text-sm sm:text-base">{title}</h3>
        </div>
        <button
          type="button"
          onClick={handleGetCurrentLocation}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-sky-300 text-xs font-medium transition-colors"
        >
          <Crosshair className="w-3.5 h-3.5" />
          <span>ตำแหน่งปัจจุบันของฉัน</span>
        </button>
      </div>

      {/* Map Area */}
      <div className="relative flex-1">
        <MapContainer
          center={[lat, lng]}
          zoom={14}
          scrollWheelZoom={true}
          style={{ width: '100%', height: '100%' }}
        >
          <TileLayer attribution={tileConfig.attribution} url={tileConfig.url} />
          <MapClickHandler onLocationSelect={handleMapClick} />
          <Marker
            position={[lat, lng]}
            icon={pinIcon}
            draggable={true}
            eventHandlers={{
              dragend: handleMarkerDrag,
            }}
          />
          <Circle
            center={[lat, lng]}
            radius={radius}
            pathOptions={{
              color: '#ef4444',
              fillColor: '#ef4444',
              fillOpacity: 0.15,
              weight: 2,
              dashArray: '4, 4',
            }}
          />
        </MapContainer>

        <div className="absolute top-3 left-3 z-[1000] bg-slate-900/90 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-700 text-[11px] text-slate-300 shadow-md">
          💡 คลิกบนแผนที่หรือลากหมุดสีแดงเพื่อปรับตำแหน่ง
        </div>
      </div>

      {/* Footer Controls & Coordinate Confirmation */}
      <div className="p-4 bg-slate-800/95 border-t border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div>
            <label className="block text-[10px] text-slate-400 font-semibold mb-0.5">LATITUDE</label>
            <input
              type="number"
              step="0.000001"
              value={lat.toFixed(6)}
              onChange={(e) => setLat(parseFloat(e.target.value) || 0)}
              className="w-28 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-slate-100 font-mono focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-[10px] text-slate-400 font-semibold mb-0.5">LONGITUDE</label>
            <input
              type="number"
              step="0.000001"
              value={lng.toFixed(6)}
              onChange={(e) => setLng(parseFloat(e.target.value) || 0)}
              className="w-28 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-slate-100 font-mono focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-[10px] text-slate-400 font-semibold mb-0.5">
              GEOFENCE: {radius} เมตร
            </label>
            <input
              type="range"
              min="50"
              max="1000"
              step="25"
              value={radius}
              onChange={(e) => setRadius(parseInt(e.target.value, 10))}
              className="w-32 accent-rose-500 cursor-pointer"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs font-semibold transition-colors"
            >
              ยกเลิก
            </button>
          )}
          <button
            type="button"
            onClick={() => onConfirm({ latitude: lat, longitude: lng, radius })}
            className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-emerald-600/30 transition-all hover:scale-105"
          >
            <Check className="w-4 h-4" />
            <span>ยืนยันพิกัดนี้</span>
          </button>
        </div>
      </div>
    </div>
  );
};
