import React, { useState } from 'react';
import { Globe, Download, Copy, Check, ExternalLink, ShieldCheck, MapPin, Building2, Car, Layers } from 'lucide-react';
import alertService from '../../services/alertService';

interface GisExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GisExportModal: React.FC<GisExportModalProps> = ({ isOpen, onClose }) => {
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  if (!isOpen) return null;

  const origin = window.location.origin;

  const gisLayers = [
    {
      id: 'ambulances',
      name: 'รถพยาบาลกู้ชีพฉุกเฉิน (Ambulance Fleet)',
      desc: 'พิกัด GPS สด, ทิศทางมุ่งหน้า, ความเร็ว, พลขับ, ภารกิจปัจจุบัน',
      geojsonUrl: `${origin}/api/gis/ambulances.geojson`,
      downloadUrl: `/api/gis/ambulances.geojson?download=true`,
      icon: '🚑',
      badge: 'Point (Live Telematics)',
    },
    {
      id: 'facilities',
      name: 'โรงพยาบาลและจุดส่งต่อ (Facilities & Hospitals)',
      desc: 'ศูนย์แม่ข่าย รพ.ปลวกแดง, รพ.ระยอง, รพ.กรุงเทพปลวกแดง, รพ.สต. และรัศมี Geofence',
      geojsonUrl: `${origin}/api/gis/facilities.geojson`,
      downloadUrl: `/api/gis/facilities.geojson?download=true`,
      icon: '🏥',
      badge: 'Point + Geofence',
    },
    {
      id: 'bases',
      name: 'ฐานปฏิบัติการกู้ชีพ (EMS Bases)',
      desc: 'ฐานศูนย์วิทยุกู้ภัย, จุดจอดฉุกเฉิน และขอบเขตรัศมี Geofence 150m',
      geojsonUrl: `${origin}/api/gis/bases.geojson`,
      downloadUrl: `/api/gis/bases.geojson?download=true`,
      icon: '📍',
      badge: 'Point + Geofence',
    },
    {
      id: 'all',
      name: 'รวมทุกชั้นข้อมูล GIS (All GIS Layers Master)',
      desc: 'รวมรถพยาบาล โรงพยาบาล และฐานกู้ชีพทั้งหมดในไฟล์ GeoJSON เดียวกัน',
      geojsonUrl: `${origin}/api/gis/all.geojson`,
      downloadUrl: `/api/gis/all.geojson?download=true`,
      icon: '🗺️',
      badge: 'FeatureCollection (Master)',
    },
  ];

  const handleCopy = (url: string, name: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    alertService.showSuccess(`คัดลอก URL ของ ${name} เรียบร้อยแล้ว`, 'สามารถนำไปเปิดใน QGIS / ArcGIS / Web GIS ได้ทันที');
    setTimeout(() => setCopiedUrl(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-ems-surface border border-ems-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-sky-900/40 via-sky-800/20 to-transparent border-b border-ems-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-500/20 text-sky-400 rounded-xl border border-sky-500/30">
              <Globe className="w-6 h-6 text-sky-400 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold text-ems-ink flex items-center gap-2">
                นำขึ้นระบบ GIS & ส่งออกชั้นข้อมูลแผนที่
                <span className="px-2 py-0.5 text-[10px] uppercase font-mono tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full">
                  RFC 7946 / WGS 84
                </span>
              </h2>
              <p className="text-xs text-ems-muted mt-0.5">
                เชื่อมต่อระบบภูมิสารสนเทศ (QGIS, ArcGIS, Google Earth, ระบบ สสจ.ระยอง)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-ems-muted hover:text-ems-ink hover:bg-ems-inset transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Quick Info Banner */}
          <div className="p-3.5 bg-sky-500/10 border border-sky-500/20 rounded-xl text-xs text-sky-300 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-sky-200">มาตรฐานระบบสารสนเทศภูมิศาสตร์ (Open GIS Standard):</span>
              <p className="text-sky-300/90 mt-0.5">
                พิกัดอ้างอิง WGS 84 (EPSG:4326) สามารถดาวน์โหลดเป็นไฟล์ <b>.geojson</b> หรือ <b>.kml</b> ไปเปิดใน QGIS, ArcGIS Desktop/Online, Google Earth Pro หรือคัดลอก Live URL ไปผูกเป็น Vector Tile/Live Feed ได้โดยตรง
              </p>
            </div>
          </div>

          {/* Layer List */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-ems-muted uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-sky-400" /> รายการชั้นข้อมูล (GIS Layers)
            </h3>

            {gisLayers.map((layer) => (
              <div
                key={layer.id}
                className="p-3.5 bg-ems-inset/60 hover:bg-ems-inset border border-ems-border/70 rounded-xl transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{layer.icon}</span>
                    <span className="font-bold text-sm text-ems-ink">{layer.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 font-mono">
                      {layer.badge}
                    </span>
                  </div>
                  <p className="text-xs text-ems-muted pl-6">{layer.desc}</p>
                </div>

                <div className="flex items-center gap-2 pl-6 sm:pl-0 shrink-0">
                  <a
                    href={layer.downloadUrl}
                    download
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-medium shadow-sm transition-all hover:scale-105"
                    title="ดาวน์โหลดไฟล์ .geojson"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>GeoJSON</span>
                  </a>
                  <button
                    onClick={() => handleCopy(layer.geojsonUrl, layer.name)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition-all"
                    title="คัดลอก URL สำหรับ QGIS / ArcGIS Live Feed"
                  >
                    {copiedUrl === layer.geojsonUrl ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span className="hidden sm:inline">Live URL</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* KML Export Option */}
          <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 font-bold text-xs text-amber-200">
                <span>🌍</span> Google Earth / KML Export (.kml)
              </div>
              <p className="text-xs text-amber-300/80">
                ส่งออกพิกัดรถพยาบาล, โรงพยาบาล และฐานกู้ชีพทั้งหมด สำหรับเปิดใน Google Earth Pro
              </p>
            </div>
            <a
              href="/api/gis/export/kml"
              download="pdh_ems_geospatial.kml"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold shrink-0 shadow-sm transition-all hover:scale-105"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ดาวน์โหลด KML</span>
            </a>
          </div>

          {/* How-to in QGIS & ArcGIS */}
          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 space-y-2 text-xs">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              💡 วิธีนำ Live URL ไปเปิดใน QGIS:
            </span>
            <ol className="list-decimal list-inside text-slate-400 space-y-1 pl-1">
              <li>เปิดโปรแกรม <b>QGIS</b> → ไปที่เมนู <b>Layer</b> → <b>Add Layer</b> → <b>Add Vector Layer...</b></li>
              <li>ในส่วน Source Type เลือก <b>Protocol (HTTP(S), cloud, etc.)</b></li>
              <li>ในช่อง <b>Type</b> เลือก <b>GeoJSON</b> แล้ว Paste URL ที่คัดลอกมา → กด <b>Add</b></li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-ems-inset border-t border-ems-border flex items-center justify-between">
          <span className="text-[11px] text-ems-muted font-mono">
            CRS: EPSG:4326 (WGS 84) | GeoJSON RFC 7946
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs font-medium transition-colors"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
