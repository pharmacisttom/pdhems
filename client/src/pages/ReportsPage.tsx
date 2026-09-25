import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Flame,
  FileSpreadsheet,
  Printer,
  Clock,
  Navigation,
  ShieldAlert,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Search,
  ArrowRight,
  TrendingUp,
  MapPin,
  RefreshCw,
  Info,
} from 'lucide-react';
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline, Tooltip } from 'react-leaflet';
import { fetchEmsKpis, fetchTripSummary, fetchSpatialDensity } from '../services/api';
import { EmsKpisResponse, TripSummaryItem, SpatialDensityResponse } from '../types/ems';
import { getActiveMapProvider } from '../services/mapProviderAdapter';

export function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'kpis' | 'spatial' | 'trips'>('kpis');
  const [timeframe, setTimeframe] = useState<'all' | 'today' | '7days' | '30days'>('all');
  const [missionType, setMissionType] = useState<'ALL' | 'EMERGENCY' | 'REFER'>('ALL');
  const [loading, setLoading] = useState<boolean>(true);

  // Data states
  const [kpiData, setKpiData] = useState<EmsKpisResponse | null>(null);
  const [tripData, setTripData] = useState<{ trips: TripSummaryItem[]; total: number }>({ trips: [], total: 0 });
  const [spatialData, setSpatialData] = useState<SpatialDensityResponse | null>(null);

  // Trip filter
  const [tripSearch, setTripSearch] = useState('');
  const [spatialLayer, setSpatialLayer] = useState<'both' | 'hotspots' | 'corridors'>('both');

  const mapProvider = getActiveMapProvider();

  // Load data based on filters
  const loadReports = async () => {
    setLoading(true);
    try {
      const [kpisRes, tripsRes, spatialRes] = await Promise.all([
        fetchEmsKpis(timeframe, missionType),
        fetchTripSummary({ missionType, limit: 100 }),
        fetchSpatialDensity(timeframe),
      ]);

      if (kpisRes.success) setKpiData(kpisRes);
      if (tripsRes.success) setTripData({ trips: tripsRes.trips, total: tripsRes.total });
      if (spatialRes.success) setSpatialData(spatialRes);
    } catch (err) {
      console.error('Error loading report data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [timeframe, missionType]);

  // CSV Export utility
  const exportCsv = () => {
    if (!tripData.trips || tripData.trips.length === 0) return;

    const headers = [
      'Mission No',
      'Type',
      'Status',
      'Vehicle',
      'Driver',
      'Origin',
      'Destination',
      'Duration (min)',
      'Est. Distance (km)',
      'Max Speed (km/h)',
      'Speed Warnings (>90)',
      'Speed Criticals (>110)',
      'Offline Sync Points',
      'Created At',
      'Completed At',
    ];

    const rows = tripData.trips.map((t) => [
      t.missionNo,
      t.missionType,
      t.status,
      t.vehicleCode,
      `"${t.driverName}"`,
      `"${t.origin}"`,
      `"${t.destination}"`,
      t.durationMinutes,
      t.distanceKm,
      t.maxSpeedKmh,
      t.speedWarningsCount,
      t.speedCriticalsCount,
      t.offlineSyncCount,
      t.createdAt,
      t.completedAt || '',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `PDH_EMS_Trip_Audit_${timeframe}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  // Filter trips for search
  const filteredTrips = tripData.trips.filter((t) => {
    if (!tripSearch) return true;
    const query = tripSearch.toLowerCase();
    return (
      t.missionNo.toLowerCase().includes(query) ||
      t.vehicleCode.toLowerCase().includes(query) ||
      t.driverName.toLowerCase().includes(query) ||
      t.destination.toLowerCase().includes(query)
    );
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-y-auto print:bg-white print:text-black">
      {/* Top Header & Filters */}
      <header className="bg-slate-900/90 border-b border-slate-800 p-4 sticky top-0 z-30 backdrop-blur-md print:hidden">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">📊</span>
              <h1 className="text-xl font-bold text-white tracking-tight">
                PDH EMS Analytics & KPI Command Center
              </h1>
              <span className="px-2 py-0.5 text-xs font-semibold rounded bg-sky-500/20 text-sky-400 border border-sky-500/30">
                AUDIT & SPATIAL INTELLIGENCE
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              ดัชนีชี้วัดเวลา 8 มาตรฐาน EMS, แผนที่ความหนาแน่นจุดเกิดเหตุซ้ำซาก และรายงานการเดินทางโทรมาตร
            </p>
          </div>

          {/* Action buttons & Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Timeframe selector */}
            <div className="flex items-center bg-slate-800 rounded-lg p-1 border border-slate-700 text-xs">
              <button
                onClick={() => setTimeframe('all')}
                className={`px-2.5 py-1 rounded font-medium transition-all ${
                  timeframe === 'all' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                ทั้งหมด
              </button>
              <button
                onClick={() => setTimeframe('today')}
                className={`px-2.5 py-1 rounded font-medium transition-all ${
                  timeframe === 'today' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                วันนี้
              </button>
              <button
                onClick={() => setTimeframe('7days')}
                className={`px-2.5 py-1 rounded font-medium transition-all ${
                  timeframe === '7days' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                7 วันล่าสุด
              </button>
              <button
                onClick={() => setTimeframe('30days')}
                className={`px-2.5 py-1 rounded font-medium transition-all ${
                  timeframe === '30days' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                30 วันล่าสุด
              </button>
            </div>

            {/* Mission Type filter */}
            <select
              value={missionType}
              onChange={(e) => setMissionType(e.target.value as any)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            >
              <option value="ALL">ภารกิจทั้งหมด (All Types)</option>
              <option value="EMERGENCY">🚨 เฉพาะเหตุฉุกเฉิน (Emergency)</option>
              <option value="REFER">🏥 เฉพาะส่งต่อ (Refer)</option>
            </select>

            <button
              onClick={exportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
              title="ส่งออกรายงานทริปเป็น CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-all"
              title="พิมพ์เอกสารสรุป KPI"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>พิมพ์รายงาน</span>
            </button>

            <button
              onClick={loadReports}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg border border-slate-700 transition-all"
              title="รีเฟรชข้อมูล"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-sky-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Tab selection navigation */}
        <div className="max-w-7xl mx-auto flex items-center gap-2 mt-3 pt-3 border-t border-slate-800/80">
          <button
            onClick={() => setActiveTab('kpis')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'kpis'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>8 EMS Time KPIs (ดัชนีชี้วัดเวลา)</span>
          </button>

          <button
            onClick={() => setActiveTab('spatial')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'spatial'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>จุดเสี่ยง & ความหนาแน่นเชิงพื้นที่ (Spatial Heatmap)</span>
            {spatialData?.hotspots && spatialData.hotspots.length > 0 && (
              <span className="px-1.5 py-0.2 bg-rose-500/30 text-rose-300 text-[10px] rounded-full border border-rose-500/40">
                {spatialData.hotspots.length} จุด
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('trips')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'trips'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>ประวัติการเดินทางรายคัน (Trip Audit)</span>
            <span className="px-1.5 py-0.2 bg-indigo-500/30 text-indigo-300 text-[10px] rounded-full border border-indigo-500/40">
              {tripData.total} ทริป
            </span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto w-full p-4 space-y-6">
        {/* SUMMARY STATS BAR */}
        {kpiData && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl flex flex-col justify-between">
              <span className="text-xs text-slate-400">ภารกิจทั้งหมด (Total)</span>
              <span className="text-2xl font-black text-white mt-1">
                {kpiData.summary.totalMissions}
              </span>
              <span className="text-[10px] text-slate-500">บันทึกในระบบ</span>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl flex flex-col justify-between">
              <span className="text-xs text-slate-400">เสร็จสิ้นแล้ว (Completed)</span>
              <span className="text-2xl font-black text-emerald-400 mt-1">
                {kpiData.summary.completedCount}
              </span>
              <span className="text-[10px] text-emerald-500/80">พร้อมประมวลผล KPI</span>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl flex flex-col justify-between">
              <span className="text-xs text-slate-400">เหตุฉุกเฉิน (Emergency)</span>
              <span className="text-2xl font-black text-rose-400 mt-1">
                {kpiData.summary.emergencyCount}
              </span>
              <span className="text-[10px] text-rose-500/80">ตรวจวัด Response Time</span>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl flex flex-col justify-between">
              <span className="text-xs text-slate-400">ส่งต่อผู้ป่วย (Refer)</span>
              <span className="text-2xl font-black text-sky-400 mt-1">
                {kpiData.summary.referCount}
              </span>
              <span className="text-[10px] text-sky-500/80">ตรวจวัด Turnout/Handover</span>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl flex flex-col justify-between">
              <span className="text-xs text-slate-400">กำลังปฏิบัติการ (Active)</span>
              <span className="text-2xl font-black text-amber-400 mt-1">
                {kpiData.summary.activeCount}
              </span>
              <span className="text-[10px] text-amber-500/80">อยู่ระหว่างเดินทาง/จุดเกิดเหตุ</span>
            </div>
          </div>
        )}

        {/* TAB 1: 8 EMS TIME KPIS */}
        {activeTab === 'kpis' && kpiData && (
          <div className="space-y-6">
            {/* EMS Workflow Time Pipeline Flowchart */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-sky-400" />
                  <h2 className="text-sm font-bold text-white">
                    ขั้นตอนวงรอบเวลาปฏิบัติการฉุกเฉิน (EMS Time Cycle Pipeline)
                  </h2>
                </div>
                <span className="text-[11px] text-slate-400">
                  อ้างอิงมาตรฐาน สพฉ. (NIEMS Standard)
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 text-center text-xs">
                {[
                  { code: 'T1', title: 'รับแจ้งสั่งการ', time: kpiData.kpis.t1_call_to_dispatch.avgMinutes },
                  { code: 'T2', title: 'เตรียมพร้อมออก', time: kpiData.kpis.t2_turnout_time.avgMinutes, target: '< 2 น.' },
                  { code: 'T3', title: 'เดินทางถึงเหตุ', time: kpiData.kpis.t3_response_time.avgMinutes, target: '< 8 น.' },
                  { code: 'T4', title: 'ปฏิบัติการที่เกิดเหตุ', time: kpiData.kpis.t4_onscene_time.avgMinutes, target: '< 15 น.' },
                  { code: 'T5', title: 'เดินทางส่งต่อ', time: kpiData.kpis.t5_transport_time.avgMinutes },
                  { code: 'T6', title: 'ส่งมอบปลายทาง', time: kpiData.kpis.t6_handover_time.avgMinutes, target: '< 15 น.' },
                  { code: 'T7', title: 'เดินทางกลับฐาน', time: kpiData.kpis.t7_return_time.avgMinutes },
                  { code: 'T8', title: 'วงรอบรวมทั้งสิ้น', time: kpiData.kpis.t8_total_cycle_time.avgMinutes },
                ].map((step, idx) => (
                  <div
                    key={step.code}
                    className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-2.5 flex flex-col justify-between relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300">
                        {step.code}
                      </span>
                      {step.target && (
                        <span className="text-[9px] text-amber-400 font-medium">เป้า {step.target}</span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-300 font-medium truncate mb-1">
                      {step.title}
                    </span>
                    <span className="text-base font-extrabold text-white">
                      {step.time} <span className="text-[10px] font-normal text-slate-400">นาที</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 8 Detailed KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(kpiData.kpis).map(([key, kpi]) => {
                const isCompliant =
                  kpi.complianceRatePercent !== undefined ? kpi.complianceRatePercent >= 80 : true;
                const isWarning =
                  kpi.complianceRatePercent !== undefined
                    ? kpi.complianceRatePercent < 80 && kpi.complianceRatePercent >= 60
                    : false;

                return (
                  <div
                    key={key}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition-all shadow-sm"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-800 text-sky-400 border border-slate-700">
                          {kpi.code}
                        </span>
                        {kpi.benchmarkMinutes && (
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            เป้าหมาย: &le; {kpi.benchmarkMinutes} {kpi.unit}
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-semibold text-slate-200 line-clamp-1 mb-3">
                        {kpi.name}
                      </h3>

                      <div className="flex items-baseline gap-2 mb-3">
                        <span className="text-3xl font-black text-white">
                          {kpi.avgMinutes}
                        </span>
                        <span className="text-sm font-medium text-slate-400">{kpi.unit}</span>
                      </div>

                      {/* Compliance rate progress bar */}
                      {kpi.complianceRatePercent !== undefined && (
                        <div className="space-y-1.5 mb-3 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                          <div className="flex justify-between text-xs font-medium">
                            <span className="text-slate-400">ความสอดคล้องเกณฑ์มาตรฐาน:</span>
                            <span
                              className={`font-bold ${
                                isCompliant
                                  ? 'text-emerald-400'
                                  : isWarning
                                  ? 'text-amber-400'
                                  : 'text-rose-400'
                              }`}
                            >
                              {kpi.complianceRatePercent}%
                            </span>
                          </div>
                          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-500 ${
                                isCompliant
                                  ? 'bg-emerald-500'
                                  : isWarning
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                              }`}
                              style={{ width: `${Math.min(kpi.complianceRatePercent, 100)}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                      <span>จำนวนภารกิจที่คำนวณ:</span>
                      <span className="text-slate-300 font-semibold">{kpi.samples} ครั้ง</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Benchmark Standards Legend */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 text-xs text-slate-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-sky-400 shrink-0" />
                <span>
                  เกณฑ์มาตรฐานสากล: Turnout Time &le; 2 นาที (เวลากลางวัน), Response Time &le; 8 นาทีสำหรับเคสระดับสีแดง (Emergency Red), On-scene &le; 15 นาที
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>&ge; 80% ผ่านเกณฑ์</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span>60-79% เฝ้าระวัง</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span>&lt; 60% ต่ำกว่าเกณฑ์</span>
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SPATIAL DENSITY & ACCIDENT HEATMAP (MAP-7) */}
        {activeTab === 'spatial' && (
          <div className="space-y-6">
            {/* Map Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3 rounded-xl">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Flame className="w-4 h-4 text-rose-500" />
                  <span>แผนที่ความหนาแน่นจุดเกิดเหตุฉุกเฉินซ้ำซาก และระเบียงส่งต่อ (Hotspots & Corridors)</span>
                </h2>
                <p className="text-xs text-slate-400">
                  วิเคราะห์ทางภูมิศาสตร์เพื่อวางตำแหน่งสแตนด์บายรถพยาบาล (Dynamic EMS Staging)
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400">แสดงผลเลเยอร์:</span>
                <button
                  onClick={() => setSpatialLayer('both')}
                  className={`px-2.5 py-1 rounded font-medium transition-all ${
                    spatialLayer === 'both' ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  ทั้งหมด
                </button>
                <button
                  onClick={() => setSpatialLayer('hotspots')}
                  className={`px-2.5 py-1 rounded font-medium transition-all ${
                    spatialLayer === 'hotspots' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  จุดเสี่ยงอุบัติเหตุ
                </button>
                <button
                  onClick={() => setSpatialLayer('corridors')}
                  className={`px-2.5 py-1 rounded font-medium transition-all ${
                    spatialLayer === 'corridors' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  เส้นทาง Refer
                </button>
              </div>
            </div>

            {/* Map Canvas */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg h-[520px] relative">
              <MapContainer
                center={mapProvider.getDefaultCenter()}
                zoom={12}
                style={{ width: '100%', height: '100%' }}
                className="z-10"
              >
                <TileLayer
                  url={mapProvider.getTileConfig().url}
                  attribution={mapProvider.getTileConfig().attribution}
                />

                {/* Hotspot Circles */}
                {(spatialLayer === 'both' || spatialLayer === 'hotspots') &&
                  spatialData?.hotspots.map((hs, idx) => {
                    const color =
                      hs.riskLevel === 'CRITICAL'
                        ? '#ef4444'
                        : hs.riskLevel === 'HIGH'
                        ? '#f97316'
                        : hs.riskLevel === 'MEDIUM'
                        ? '#eab308'
                        : '#3b82f6';

                    const radius = Math.max(16, Math.min(42, hs.count * 12));

                    return (
                      <CircleMarker
                        key={`hs-${idx}`}
                        center={[hs.latitude, hs.longitude]}
                        radius={radius}
                        pathOptions={{
                          color: color,
                          fillColor: color,
                          fillOpacity: 0.55,
                          weight: 3,
                        }}
                      >
                        <Popup>
                          <div className="p-1 min-w-[200px]">
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="text-base">🚨</span>
                              <span className="font-bold text-slate-900 text-sm">{hs.label}</span>
                            </div>
                            <div className="text-xs space-y-1 text-slate-700">
                              <div className="flex justify-between">
                                <span>จำนวนการเกิดเหตุ:</span>
                                <span className="font-bold text-red-600">{hs.count} ครั้ง</span>
                              </div>
                              <div className="flex justify-between">
                                <span>ระดับความเสี่ยง:</span>
                                <span className="font-bold text-amber-700">{hs.riskLevel}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>เวลาตอบสนองเฉลี่ย:</span>
                                <span className="font-bold">{hs.avgResponseMinutes} นาที</span>
                              </div>
                              <div className="mt-2 text-[10px] text-slate-500 italic">
                                แนะนำจุดจอดสแตนด์บายเพื่อลดเวลา Turnout
                              </div>
                            </div>
                          </div>
                        </Popup>
                        <Tooltip permanent direction="top" offset={[0, -radius]}>
                          <span className="text-[10px] font-bold text-slate-900 bg-white/90 px-1 py-0.5 rounded shadow">
                            {hs.count} เหตุ
                          </span>
                        </Tooltip>
                      </CircleMarker>
                    );
                  })}

                {/* Refer Corridors Polylines */}
                {(spatialLayer === 'both' || spatialLayer === 'corridors') &&
                  spatialData?.referCorridors.map((rc, idx) => (
                    <Polyline
                      key={`rc-${idx}`}
                      positions={[rc.originCoords, rc.destinationCoords]}
                      pathOptions={{
                        color: '#6366f1',
                        weight: Math.min(8, 2 + rc.transferCount * 1.5),
                        opacity: 0.75,
                        dashArray: '8, 6',
                      }}
                    >
                      <Popup>
                        <div className="p-1 text-xs text-slate-800">
                          <div className="font-bold text-indigo-700 mb-1">
                            เส้นทาง Refer: {rc.originName} &rarr; {rc.destinationName}
                          </div>
                          <div>จำนวนการส่งต่อ: {rc.transferCount} เที่ยว</div>
                          <div>เวลาเดินทางเฉลี่ย: {rc.avgTransportMinutes} นาที</div>
                        </div>
                      </Popup>
                    </Polyline>
                  ))}
              </MapContainer>

              {/* Map Floating Legend */}
              <div className="absolute bottom-4 right-4 bg-slate-900/95 border border-slate-700 rounded-lg p-3 z-[1000] text-xs shadow-xl backdrop-blur-md">
                <div className="font-bold text-white mb-2 flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-rose-400" />
                  <span>สัญลักษณ์ความหนาแน่นจุดเสี่ยง</span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500 border border-white" />
                    <span className="text-slate-300">วิกฤต (Critical Hotspot &ge; 3 เหตุ)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-orange-500 border border-white" />
                    <span className="text-slate-300">ความถี่สูง (High Hotspot 2 เหตุ)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-yellow-500 border border-white" />
                    <span className="text-slate-300">ความถี่ปานกลาง (Medium)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-0.5 bg-indigo-500 border border-dashed" />
                    <span className="text-slate-300">ระเบียงเส้นทาง Refer ถี่</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Hotspots & Corridors Table Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Hotspots Leaderboard */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-rose-400" />
                  <span>อันดับจุดเสี่ยงอุบัติเหตุฉุกเฉินสูงสุด (Top Hotspots)</span>
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-800/60 text-slate-400 uppercase text-[10px]">
                      <tr>
                        <th className="py-2 px-3">จุดเกิดเหตุ / พิกัด</th>
                        <th className="py-2 px-2 text-center">จำนวนเหตุ</th>
                        <th className="py-2 px-2 text-center">ระดับความเสี่ยง</th>
                        <th className="py-2 px-2 text-right">เวลาตอบสนอง</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {spatialData?.hotspots && spatialData.hotspots.length > 0 ? (
                        spatialData.hotspots.map((h, i) => (
                          <tr key={i} className="hover:bg-slate-800/40">
                            <td className="py-2.5 px-3">
                              <div className="font-semibold text-white">{h.label}</div>
                              <div className="text-[10px] text-slate-500">
                                {h.latitude.toFixed(4)}, {h.longitude.toFixed(4)}
                              </div>
                            </td>
                            <td className="py-2.5 px-2 text-center font-bold text-rose-400">
                              {h.count}
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  h.riskLevel === 'CRITICAL'
                                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                    : h.riskLevel === 'HIGH'
                                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                    : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                                }`}
                              >
                                {h.riskLevel}
                              </span>
                            </td>
                            <td className="py-2.5 px-2 text-right text-slate-300 font-medium">
                              {h.avgResponseMinutes} นาที
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-6 text-center text-slate-500">
                            ไม่พบข้อมูลจุดเสี่ยงในรอบเวลานี้
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Refer Corridors Overview */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-indigo-400" />
                  <span>เส้นทางส่งต่อที่ใช้งานถี่ (Frequent Refer Corridors)</span>
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-800/60 text-slate-400 uppercase text-[10px]">
                      <tr>
                        <th className="py-2 px-3">ต้นทาง &rarr; ปลายทาง</th>
                        <th className="py-2 px-2 text-center">จำนวนเที่ยว</th>
                        <th className="py-2 px-2 text-right">เวลาเฉลี่ย</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {spatialData?.referCorridors && spatialData.referCorridors.length > 0 ? (
                        spatialData.referCorridors.map((rc, i) => (
                          <tr key={i} className="hover:bg-slate-800/40">
                            <td className="py-2.5 px-3">
                              <div className="font-semibold text-white">
                                {rc.originName} &rarr; {rc.destinationName}
                              </div>
                              <div className="text-[10px] text-slate-500">
                                เส้นทางโรงพยาบาลหลักประจำเครือข่าย
                              </div>
                            </td>
                            <td className="py-2.5 px-2 text-center font-bold text-indigo-400">
                              {rc.transferCount} เที่ยว
                            </td>
                            <td className="py-2.5 px-2 text-right text-slate-300 font-medium">
                              {rc.avgTransportMinutes} นาที
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="py-6 text-center text-slate-500">
                            ไม่พบข้อมูลเส้นทางส่งต่อในรอบเวลานี้
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: TRIP SUMMARY AUDIT (SECTION 39) */}
        {activeTab === 'trips' && (
          <div className="space-y-4">
            {/* Search & Statistics Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3 rounded-xl">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหาตามรหัสภารกิจ, ทะเบียนรถ, ชื่อคนขับ หรือปลายทาง..."
                  value={tripSearch}
                  onChange={(e) => setTripSearch(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 w-72 sm:w-96"
                />
              </div>

              <div className="text-xs text-slate-400">
                แสดงผล <span className="text-white font-bold">{filteredTrips.length}</span> จากทั้งหมด{' '}
                <span className="text-white font-bold">{tripData.total}</span> ทริป
              </div>
            </div>

            {/* Trips Audit Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-800 text-slate-300 uppercase text-[10px]">
                    <tr>
                      <th className="py-3 px-3">รหัสภารกิจ / ประเภท</th>
                      <th className="py-3 px-3">รถพยาบาล / พลขับ</th>
                      <th className="py-3 px-3">เส้นทาง (ต้นทาง &rarr; ปลายทาง)</th>
                      <th className="py-3 px-2 text-center">ระยะเวลา</th>
                      <th className="py-3 px-2 text-center">ระยะทาง (กม.)</th>
                      <th className="py-3 px-2 text-center">ความเร็วสูงสุด</th>
                      <th className="py-3 px-2 text-center">เตือนความเร็วเกิน</th>
                      <th className="py-3 px-2 text-center">ส่งออฟไลน์</th>
                      <th className="py-3 px-3 text-right">สถานะ / การส่งมอบ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredTrips.length > 0 ? (
                      filteredTrips.map((t) => {
                        const hasSpeedWarning = t.speedWarningsCount > 0 || t.speedCriticalsCount > 0;
                        return (
                          <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 px-3">
                              <div className="font-bold text-white">{t.missionNo}</div>
                              <span
                                className={`inline-block mt-0.5 px-2 py-0.2 rounded text-[10px] font-bold ${
                                  t.missionType === 'EMERGENCY'
                                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                    : 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                                }`}
                              >
                                {t.missionType === 'EMERGENCY' ? '🚨 ฉุกเฉิน' : '🏥 ส่งต่อ'}
                              </span>
                            </td>

                            <td className="py-3 px-3">
                              <div className="font-semibold text-slate-200">
                                {t.vehicleCode} ({t.registrationNo})
                              </div>
                              <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                <span>👤</span> {t.driverName}
                              </div>
                            </td>

                            <td className="py-3 px-3 max-w-xs">
                              <div className="font-medium text-slate-200 truncate">
                                {t.origin} &rarr; {t.destination}
                              </div>
                              {t.sceneDescription && (
                                <div className="text-[10px] text-amber-400/90 truncate mt-0.5">
                                  {t.sceneDescription}
                                </div>
                              )}
                            </td>

                            <td className="py-3 px-2 text-center font-bold text-white">
                              {t.durationMinutes} <span className="text-[10px] text-slate-400 font-normal">น.</span>
                            </td>

                            <td className="py-3 px-2 text-center text-slate-300 font-medium">
                              {t.distanceKm}
                            </td>

                            <td className="py-3 px-2 text-center">
                              <span
                                className={`font-bold ${
                                  t.maxSpeedKmh > 110
                                    ? 'text-rose-400'
                                    : t.maxSpeedKmh > 90
                                    ? 'text-amber-400'
                                    : 'text-slate-300'
                                }`}
                              >
                                {t.maxSpeedKmh} กม./ชม.
                              </span>
                            </td>

                            <td className="py-3 px-2 text-center">
                              {hasSpeedWarning ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>{t.speedWarningsCount + t.speedCriticalsCount} ครั้ง</span>
                                </span>
                              ) : (
                                <span className="text-emerald-400 text-[11px] font-medium">ปกติ</span>
                              )}
                            </td>

                            <td className="py-3 px-2 text-center">
                              {t.offlineSyncCount > 0 ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                                  {t.offlineSyncCount} จุด
                                </span>
                              ) : (
                                <span className="text-slate-500 text-[11px]">-</span>
                              )}
                            </td>

                            <td className="py-3 px-3 text-right">
                              <div className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                {t.status}
                              </div>
                              {t.handoverConfirmedBy && (
                                <div className="text-[10px] text-slate-400 mt-1">
                                  รับโดย: {t.handoverConfirmedBy}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-slate-500">
                          ไม่พบประวัติการเดินทางตามเงื่อนไขที่เลือก
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ReportsPage;
