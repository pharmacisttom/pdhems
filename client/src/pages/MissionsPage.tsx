import React, { useState, useEffect } from 'react';
import {
  fetchMissions,
  fetchMissionDetail,
  fetchFacilities,
  confirmMissionReadiness,
  departMission,
  markMissionArrived,
  startMissionReturn,
  completeMission,
} from '../services/api';
import { FacilityData, FullMissionDetail } from '../types/ems';
import { CreateReferModal } from '../components/missions/CreateReferModal';
import { AssignMissionModal } from '../components/missions/AssignMissionModal';
import { PretripChecklistModal } from '../components/missions/PretripChecklistModal';
import { EmergencyOverrideModal } from '../components/missions/EmergencyOverrideModal';
import { HandoverModal } from '../components/missions/HandoverModal';
import { MobileMissionCardList } from '../components/missions/MobileMissionCardList';
import { showWarning, showError, showToast, confirmAction, confirmDeparture } from '../services/alertService';
import {
  Plus,
  RefreshCw,
  Search,
  Filter,
  Truck,
  UserCheck,
  Users,
  ShieldCheck,
  AlertTriangle,
  Play,
  MapPin,
  CheckCircle,
  Clock,
  ArrowRight,
  RotateCcw,
  FileCheck2,
  ChevronRight,
  Info,
} from 'lucide-react';

export const MissionsPage: React.FC = () => {
  const [missions, setMissions] = useState<any[]>([]);
  const [facilities, setFacilities] = useState<FacilityData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [assignMissionTarget, setAssignMissionTarget] = useState<any | null>(null);
  const [pretripTarget, setPretripTarget] = useState<any | null>(null);
  const [overrideTarget, setOverrideTarget] = useState<{
    id: number;
    missionNo: string;
    missing: string[];
  } | null>(null);
  const [handoverTarget, setHandoverTarget] = useState<any | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<FullMissionDetail | null>(null);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadMissionsOnly, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadMissionsOnly(), loadFacilitiesOnly()]);
    setLoading(false);
  };

  const loadMissionsOnly = async () => {
    const data = await fetchMissions();
    setMissions(data);
  };

  const loadFacilitiesOnly = async () => {
    const facs = await fetchFacilities();
    setFacilities(facs);
  };

  const handleOpenDetail = async (id: number) => {
    const detail = await fetchMissionDetail(id);
    setSelectedDetail(detail);
  };

  const handleConfirmReadiness = async (missionId: number, type: 'DRIVER' | 'CREW') => {
    await confirmMissionReadiness(missionId, type);
    await loadMissionsOnly();
    if (selectedDetail && selectedDetail.id === missionId) {
      handleOpenDetail(missionId);
    }
  };

  const handleDepartAttempt = async (mission: any) => {
    const confirmed = await confirmDeparture({
      vehicleCode: mission.vehicle_code || 'N/A',
      driverName: mission.driver_name || 'ไม่ได้ระบุ',
      crewCount: 2,
      destination: mission.destination_facility_name || mission.scene_description || 'สถานพยาบาลปลายทาง',
    });
    if (!confirmed) return;

    const res = await departMission(mission.id, { isEmergencyOverride: false });
    if (res.success) {
      showToast('🚀 ยืนยันออกเดินทางเรียบร้อยแล้ว', 'success');
      await loadMissionsOnly();
      if (selectedDetail) handleOpenDetail(mission.id);
    } else if (res.missingRequirements) {
      setOverrideTarget({
        id: mission.id,
        missionNo: mission.mission_no,
        missing: res.missingRequirements,
      });
    } else {
      await showError('ไม่สามารถออกเดินทางได้', res.message);
    }
  };

  const handleMarkArrived = async (id: number) => {
    const res = await markMissionArrived(id);
    if (res.success) {
      showToast('📍 บันทึกเวลาถึงจุดหมายเรียบร้อยแล้ว', 'success');
      await loadMissionsOnly();
      if (selectedDetail) handleOpenDetail(id);
    } else {
      await showError('ไม่สามารถอัปเดตสถานะได้', res.message);
    }
  };

  const handleStartReturn = async (id: number) => {
    const confirmed = await confirmAction({
      title: 'เริ่มเดินทางกลับฐาน?',
      text: 'ระบบจะเริ่มบันทึกเวลาเดินทางกลับ (Return Time)',
      confirmButtonText: '🔄 เริ่มเดินทางกลับ',
    });
    if (!confirmed) return;

    const res = await startMissionReturn(id);
    if (res.success) {
      showToast('🔄 เริ่มเดินทางกลับฐานกู้ชีพ', 'info');
      await loadMissionsOnly();
      if (selectedDetail) handleOpenDetail(id);
    } else {
      await showError('ไม่สามารถอัปเดตสถานะได้', res.message);
    }
  };

  const handleComplete = async (id: number) => {
    const confirmed = await confirmAction({
      title: 'ยืนยันปิดภารกิจ?',
      text: 'ข้อมูลการเดินทางจะถูกสรุปเป็นสถิติ และสถานะรถจะคืนเป็นว่างพร้อมรับงานทันที',
      confirmButtonText: '✓ ปิดภารกิจ',
    });
    if (!confirmed) return;

    const res = await completeMission(id);
    if (res.success) {
      showToast('✓ ปิดภารกิจเสร็จสมบูรณ์ รถพร้อมรับงานใหม่', 'success');
      await loadMissionsOnly();
      if (selectedDetail) handleOpenDetail(id);
    } else {
      await showError('ไม่สามารถปิดภารกิจได้', res.message);
    }
  };

  const filteredMissions = missions.filter((m) => {
    const matchesFilter =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' &&
        !['COMPLETED', 'CANCELLED'].includes(m.status)) ||
      m.status === statusFilter;

    const matchesSearch =
      !searchQuery ||
      m.mission_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.vehicle_code && m.vehicle_code.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (m.driver_name && m.driver_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (m.destination_facility_name &&
        m.destination_facility_name.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesFilter && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CREATED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">รอจัดสรรทีม</span>;
      case 'ASSIGNED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/20 text-sky-400 border border-sky-500/30">มอบหมายแล้ว (รอตรวจความพร้อม)</span>;
      case 'CREW_CONFIRMED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">ทีมพร้อม (รอตรวจรถ)</span>;
      case 'READY':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">✓ รถและทีมพร้อมออกรถ</span>;
      case 'EN_ROUTE':
      case 'DEPARTED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30 animate-pulse">🚑 กำลังเดินทาง (En Route)</span>;
      case 'ARRIVED':
      case 'AT_DESTINATION':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-400 border border-purple-500/30">🏥 ถึง รพ.ปลายทาง</span>;
      case 'HANDOVER_COMPLETED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-500/20 text-teal-400 border border-teal-500/30">✓ ส่งมอบเรียบร้อย</span>;
      case 'RETURNING':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">↩ กำลังเดินทางกลับฐาน</span>;
      case 'COMPLETED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-700 text-slate-300">✓ เสร็จสิ้นภารกิจ</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400">{status}</span>;
    }
  };

  return (
    <div className="flex-1 bg-slate-950 p-4 md:p-6 overflow-y-auto">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">📋</span>
              <h1 className="text-xl font-bold text-white tracking-tight">
                บริหารจัดการภารกิจส่งต่อและกู้ชีพ (EMS & Refer Missions)
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              ขั้นตอน: มอบหมายทีม → ตรวจความพร้อมรถ → ยืนยันออกรถ → ติดตาม GPS → ส่งมอบปลายทาง → เดินทางกลับ
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
              title="รีเฟรชข้อมูล"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="px-4 py-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-sky-600/30 flex items-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>สร้าง Refer Mission</span>
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          {/* Status Tabs */}
          <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
            {[
              { id: 'ALL', label: 'ทั้งหมด' },
              { id: 'ACTIVE', label: 'กำลังปฏิบัติงาน' },
              { id: 'CREATED', label: 'รอจัดสรร' },
              { id: 'ASSIGNED', label: 'มอบหมายแล้ว' },
              { id: 'READY', label: 'พร้อมออกรถ' },
              { id: 'EN_ROUTE', label: 'เดินทาง' },
              { id: 'ARRIVED', label: 'ถึงปลายทาง' },
              { id: 'RETURNING', label: 'ขากลับ' },
              { id: 'COMPLETED', label: 'เสร็จสิ้น' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === tab.id
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search box */}
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="ค้นหาเลขที่, รถ, พลขับ, รพ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>

        {/* Missions List */}
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-sm">กำลังโหลดข้อมูลภารกิจ...</div>
        ) : filteredMissions.length === 0 ? (
          <div className="py-16 text-center bg-slate-900/30 rounded-2xl border border-slate-800 text-slate-400 text-sm">
            ไม่พบภารกิจที่ตรงกับเงื่อนไขการค้นหา
          </div>
        ) : (
          <>
            {/* Mobile View: Touch-First Card List */}
            <div className="block md:hidden">
              <MobileMissionCardList
                missions={filteredMissions}
                onOpenDetail={handleOpenDetail}
                onOpenAssign={setAssignMissionTarget}
                onOpenPretrip={setPretripTarget}
                onDepart={handleDepartAttempt}
                onMarkArrived={handleMarkArrived}
                onOpenHandover={setHandoverTarget}
                onStartReturn={handleStartReturn}
                onComplete={handleComplete}
              />
            </div>

            {/* Desktop View: Multi-column Card Rows */}
            <div className="hidden md:grid grid-cols-1 gap-4">
            {filteredMissions.map((mission) => {
              const isAssigned = !!mission.vehicle_id;
              const isReady = mission.status === 'READY';
              const isEnRoute = ['EN_ROUTE', 'DEPARTED'].includes(mission.status);
              const isArrived = mission.status === 'ARRIVED';
              const isHandover = mission.status === 'HANDOVER_COMPLETED';
              const isReturning = mission.status === 'RETURNING';
              const isCompleted = mission.status === 'COMPLETED';

              return (
                <div
                  key={mission.id}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-4 sm:p-5 transition-all shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  {/* Left Column: Mission Info & Route */}
                  <div className="space-y-3 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-base font-bold text-white tracking-wider">
                        {mission.mission_no}
                      </span>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                          mission.mission_type === 'EMERGENCY'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                        }`}
                      >
                        {mission.mission_type}
                      </span>
                      {getStatusBadge(mission.status)}
                      {mission.is_emergency_override === 1 && (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-500/20 text-amber-400 border border-amber-500/40">
                          ⚡ EMERGENCY OVERRIDE
                        </span>
                      )}
                    </div>

                    {/* Route Display */}
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-400 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-sky-400" />
                        {mission.origin_facility_name || 'รพ.โพธาราม'}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                      <span className="text-emerald-400 font-medium flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                        {mission.destination_facility_name || 'ไม่ระบุปลายทาง'}
                      </span>
                    </div>

                    {/* Asset / Driver tags */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-slate-500" />
                        {mission.vehicle_code ? (
                          <span className="text-slate-200 font-medium">
                            {mission.vehicle_code} ({mission.registration_no})
                          </span>
                        ) : (
                          <span className="text-amber-400 italic">ยังไม่ระบุรถ</span>
                        )}
                      </span>

                      <span className="flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                        {mission.driver_name ? (
                          <span className="text-slate-200 font-medium">{mission.driver_name}</span>
                        ) : (
                          <span className="text-amber-400 italic">ยังไม่ระบุพลขับ</span>
                        )}
                      </span>

                      <span className="flex items-center gap-1 text-[11px] text-slate-500">
                        <Clock className="w-3 h-3" />
                        สร้างเมื่อ {new Date(mission.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  {/* Right Column: Dynamic Action Buttons per Workflow Stage */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
                    {/* Stage 1: Assign Vehicle & Crew */}
                    {mission.status === 'CREATED' && (
                      <button
                        onClick={() => setAssignMissionTarget(mission)}
                        className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-sky-600/20 flex items-center gap-1.5 transition-all"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>มอบหมายทีมและรถ</span>
                      </button>
                    )}

                    {/* Stage 2: Readiness Checks */}
                    {['ASSIGNED', 'CREW_CONFIRMED'].includes(mission.status) && (
                      <>
                        <button
                          onClick={() => setPretripTarget(mission)}
                          className={`px-3 py-2 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition-colors ${
                            mission.pretrip_passed
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                          }`}
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>{mission.pretrip_passed ? '✓ รถพร้อม' : 'ตรวจสภาพรถ'}</span>
                        </button>

                        <button
                          onClick={() => handleConfirmReadiness(mission.id, 'CREW')}
                          className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>ยืนยันทีมพร้อม</span>
                        </button>

                        <button
                          onClick={() => handleDepartAttempt(mission)}
                          className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-semibold shadow-md flex items-center gap-1.5 transition-all"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>ออกเดินทาง</span>
                        </button>
                      </>
                    )}

                    {/* Stage 3: Ready to Depart */}
                    {isReady && (
                      <button
                        onClick={() => handleDepartAttempt(mission)}
                        className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition-all animate-pulse"
                      >
                        <Play className="w-4 h-4" />
                        <span>ออกเดินทาง (Depart)</span>
                      </button>
                    )}

                    {/* Stage 4: En Route -> Arrive */}
                    {isEnRoute && (
                      <button
                        onClick={() => handleMarkArrived(mission.id)}
                        className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-purple-600/20 flex items-center gap-1.5 transition-all"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        <span>ถึงปลายทาง (Arrived)</span>
                      </button>
                    )}

                    {/* Stage 5: Arrived -> Human Handover */}
                    {isArrived && (
                      <button
                        onClick={() => setHandoverTarget(mission)}
                        className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-purple-600/20 flex items-center gap-2 transition-all animate-pulse"
                      >
                        <UserCheck className="w-4 h-4" />
                        <span>ยืนยันส่งมอบตัวผู้ป่วย (Handover)</span>
                      </button>
                    )}

                    {/* Stage 6: Handover Complete -> Start Return */}
                    {isHandover && (
                      <button
                        onClick={() => handleStartReturn(mission.id)}
                        className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-amber-600/20 flex items-center gap-1.5 transition-all"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>เริ่มเดินทางกลับฐาน</span>
                      </button>
                    )}

                    {/* Stage 7: Returning -> Complete Mission */}
                    {isReturning && (
                      <button
                        onClick={() => handleComplete(mission.id)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>ถึงฐาน / ปิดภารกิจ (Complete)</span>
                      </button>
                    )}

                    {/* View Details Button */}
                    <button
                      onClick={() => handleOpenDetail(mission.id)}
                      className="p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-xl transition-colors border border-slate-700/50"
                      title="ดูรายละเอียดภารกิจและประวัติ Log"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
        )}
      </div>

      {/* Detail Drawer Modal */}
      {selectedDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border-l border-slate-800 w-full max-w-md h-full p-6 overflow-y-auto space-y-6 text-slate-100 shadow-2xl relative">
            <button
              onClick={() => setSelectedDetail(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-100 p-2 rounded-lg hover:bg-slate-800 transition-colors"
            >
              ✕
            </button>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-lg font-bold text-sky-400">
                  {selectedDetail.mission_no}
                </span>
                {getStatusBadge(selectedDetail.status)}
              </div>
              <p className="text-xs text-slate-400">
                ประเภท: {selectedDetail.mission_type} | สร้างเมื่อ{' '}
                {new Date(selectedDetail.created_at).toLocaleString('th-TH')}
              </p>
            </div>

            {/* Crew Members */}
            <div className="border border-slate-800 rounded-xl p-3.5 bg-slate-950/50 space-y-2">
              <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-indigo-400" />
                ทีมปฏิบัติการประจำรถ
              </h4>
              {!selectedDetail.crew || selectedDetail.crew.length === 0 ? (
                <p className="text-xs text-slate-500 italic">ยังไม่มีการมอบหมายเจ้าหน้าที่</p>
              ) : (
                <div className="space-y-1.5">
                  {selectedDetail.crew.map((c, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-slate-200">
                        {c.display_name} ({c.profession || c.crew_role})
                      </span>
                      {c.is_team_leader && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-300 rounded border border-amber-500/30">
                          ★ หัวหน้าทีม
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pretrip Inspection Result */}
            <div className="border border-slate-800 rounded-xl p-3.5 bg-slate-950/50 space-y-2">
              <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                ผลการตรวจสภาพรถ (Pre-trip Inspection)
              </h4>
              {!selectedDetail.pretrip_checklist ? (
                <p className="text-xs text-amber-400 italic">ยังไม่ได้ตรวจสภาพรถก่อนออก</p>
              ) : (
                <div className="space-y-1 text-xs text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">น้ำมันเชื้อเพลิง:</span>
                    <span className="font-semibold text-slate-200">
                      {selectedDetail.pretrip_checklist.fuel_level}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">ออกซิเจน:</span>
                    <span className="font-semibold text-sky-400">
                      {selectedDetail.pretrip_checklist.oxygen_level_psi} PSI
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">ผลการประเมิน:</span>
                    <span className="text-emerald-400 font-bold">✓ ผ่านเกณฑ์พร้อมออกรถ</span>
                  </div>
                </div>
              )}
            </div>

            {/* Handover Data */}
            {selectedDetail.handover_confirmed_by && (
              <div className="border border-purple-500/30 bg-purple-500/5 rounded-xl p-3.5 space-y-1.5 text-xs">
                <h4 className="font-semibold text-purple-300 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4" />
                  การส่งมอบตัวผู้ป่วยปลายทาง
                </h4>
                <p className="text-slate-300">
                  <span className="text-slate-400">ผู้รับมอบ:</span>{' '}
                  <span className="font-semibold text-white">{selectedDetail.handover_confirmed_by}</span>
                </p>
                {selectedDetail.handover_notes && (
                  <p className="text-slate-400 text-[11px]">หมายเหตุ: {selectedDetail.handover_notes}</p>
                )}
                {selectedDetail.handover_at && (
                  <p className="text-purple-400 text-[10px]">
                    ยืนยันเมื่อ: {new Date(selectedDetail.handover_at).toLocaleString('th-TH')}
                  </p>
                )}
              </div>
            )}

            {/* Status Timeline Logs */}
            <div className="border border-slate-800 rounded-xl p-3.5 bg-slate-950/50 space-y-3">
              <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-sky-400" />
                ประวัติไทม์ไลน์สถานะ (Audit Trail)
              </h4>
              <div className="relative border-l border-slate-700/60 ml-2 space-y-3 pl-3 text-xs">
                {selectedDetail.status_logs?.map((log) => (
                  <div key={log.id} className="relative">
                    <div className="absolute -left-[17px] top-1 w-2 h-2 rounded-full bg-sky-500 ring-4 ring-slate-900" />
                    <div className="font-semibold text-slate-200">{log.status}</div>
                    <div className="text-[11px] text-slate-400">{log.note}</div>
                    <div className="text-[10px] text-slate-500">
                      {new Date(log.created_at).toLocaleTimeString('th-TH')}
                      {log.logged_by_name ? ` • โดย ${log.logged_by_name}` : ''}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Creation Modal */}
      <CreateReferModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        facilities={facilities}
        onCreated={loadMissionsOnly}
      />

      {/* Assignment Modal */}
      {assignMissionTarget && (
        <AssignMissionModal
          isOpen={true}
          onClose={() => setAssignMissionTarget(null)}
          missionId={assignMissionTarget.id}
          missionNo={assignMissionTarget.mission_no}
          onAssigned={loadMissionsOnly}
        />
      )}

      {/* Pretrip Checklist Modal */}
      {pretripTarget && (
        <PretripChecklistModal
          isOpen={true}
          onClose={() => setPretripTarget(null)}
          missionId={pretripTarget.id}
          missionNo={pretripTarget.mission_no}
          vehicleCode={pretripTarget.vehicle_code || 'EMS'}
          onCompleted={loadMissionsOnly}
        />
      )}

      {/* Emergency Override Modal */}
      {overrideTarget && (
        <EmergencyOverrideModal
          isOpen={true}
          onClose={() => setOverrideTarget(null)}
          missionId={overrideTarget.id}
          missionNo={overrideTarget.missionNo}
          missingRequirements={overrideTarget.missing}
          onDeparted={loadMissionsOnly}
        />
      )}

      {/* Handover Modal */}
      {handoverTarget && (
        <HandoverModal
          isOpen={true}
          onClose={() => setHandoverTarget(null)}
          missionId={handoverTarget.id}
          missionNo={handoverTarget.mission_no}
          destFacilityName={handoverTarget.destination_facility_name || 'รพ.ปลายทาง'}
          onCompleted={loadMissionsOnly}
        />
      )}
    </div>
  );
};
