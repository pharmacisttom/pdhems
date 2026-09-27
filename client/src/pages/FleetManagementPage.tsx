import React, { useState, useEffect } from 'react';
import {
  fetchVehicles,
  fetchDrivers,
  fetchStaff,
  createAmbulance,
  updateAmbulance,
  deleteAmbulance,
  createDriver,
  updateDriver,
  deleteDriver,
  createStaff,
  updateStaff,
  deleteStaff,
} from '../services/api';
import { VehicleMarkerData } from '../types/ems';
import { showSuccess, showError, confirmAction } from '../services/alertService';
import {
  Ambulance,
  Users,
  ShieldCheck,
  Plus,
  Edit,
  Trash2,
  Phone,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Activity,
  HeartPulse,
  Wind,
  Search,
  Filter,
  X,
} from 'lucide-react';

type FleetTab = 'ambulances' | 'drivers' | 'staff';

export const FleetManagementPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<FleetTab>('ambulances');
  const [vehicles, setVehicles] = useState<VehicleMarkerData[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isAmbulanceModalOpen, setIsAmbulanceModalOpen] = useState(false);
  const [editingAmbulance, setEditingAmbulance] = useState<any | null>(null);

  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<any | null>(null);

  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any | null>(null);

  // Form states
  const [ambForm, setAmbForm] = useState({
    vehicle_code: '',
    registration_no: '',
    vehicle_type: 'ALS_AMBULANCE',
    brand: 'Toyota',
    model: 'Commuter',
    odometer: 0,
    status: 'AVAILABLE',
  });

  const [drvForm, setDrvForm] = useState({
    employee_code: '',
    first_name: '',
    last_name: '',
    display_name: '',
    phone_optional: '',
    driver_license_no_optional: '',
    license_type_optional: 'ชนิดที่ 2 สาธารณะ',
    employment_status: 'AVAILABLE',
  });

  const [stfForm, setStfForm] = useState({
    employee_code: '',
    first_name: '',
    last_name: '',
    display_name: '',
    position: 'พยาบาลวิชาชีพชำนาญการ',
    profession: 'Nurse',
    phone_optional: '',
  });

  const loadAll = async () => {
    setLoading(true);
    try {
      const [vData, dData, sData] = await Promise.all([
        fetchVehicles(),
        fetchDrivers(),
        fetchStaff(),
      ]);
      setVehicles(vData);
      setDrivers(dData);
      setStaff(sData);
    } catch (err: any) {
      showError('ไม่สามารถโหลดข้อมูลได้', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  // Handlers for Ambulances
  const handleOpenAmbulanceModal = (v?: any) => {
    if (v) {
      setEditingAmbulance(v);
      setAmbForm({
        vehicle_code: v.vehicle_code,
        registration_no: v.registration_no,
        vehicle_type: v.vehicle_type,
        brand: v.brand || 'Toyota',
        model: v.model || 'Commuter',
        odometer: v.odometer || 0,
        status: v.status || 'AVAILABLE',
      });
    } else {
      setEditingAmbulance(null);
      setAmbForm({
        vehicle_code: `EMS-0${vehicles.length + 1}`,
        registration_no: 'กข-____ ระยอง',
        vehicle_type: 'ALS_AMBULANCE',
        brand: 'Toyota',
        model: 'Commuter D4D',
        odometer: 0,
        status: 'AVAILABLE',
      });
    }
    setIsAmbulanceModalOpen(true);
  };

  const handleSaveAmbulance = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingAmbulance) {
        await updateAmbulance(editingAmbulance.id, ambForm);
        showSuccess('สำเร็จ', `อัปเดตข้อมูลรถ ${ambForm.vehicle_code} เรียบร้อยแล้ว`);
      } else {
        await createAmbulance(ambForm);
        showSuccess('สำเร็จ', `เพิ่มรถพยาบาล ${ambForm.vehicle_code} เข้าสู่ระบบแล้ว`);
      }
      setIsAmbulanceModalOpen(false);
      loadAll();
    } catch (err: any) {
      showError('เกิดข้อผิดพลาด', err.message);
    }
  };

  const handleDeleteAmbulance = async (id: number, code: string) => {
    const ok = await confirmAction({ title: 'ยืนยันการลบรถ', text: `คุณต้องการปลดประจำการรถ ${code} หรือไม่?` });
    if (!ok) return;
    try {
      await deleteAmbulance(id);
      showSuccess('สำเร็จ', `ปลดประจำการรถ ${code} เรียบร้อยแล้ว`);
      loadAll();
    } catch (err: any) {
      showError('เกิดข้อผิดพลาด', err.message);
    }
  };

  // Handlers for Drivers
  const handleOpenDriverModal = (d?: any) => {
    if (d) {
      setEditingDriver(d);
      setDrvForm({
        employee_code: d.employee_code,
        first_name: d.first_name,
        last_name: d.last_name,
        display_name: d.display_name,
        phone_optional: d.phone_optional || '',
        driver_license_no_optional: d.driver_license_no_optional || '',
        license_type_optional: d.license_type_optional || 'ชนิดที่ 2 สาธารณะ',
        employment_status: d.employment_status || 'AVAILABLE',
      });
    } else {
      setEditingDriver(null);
      setDrvForm({
        employee_code: `DRV-00${drivers.length + 1}`,
        first_name: '',
        last_name: '',
        display_name: '',
        phone_optional: '08X-XXX-XXXX',
        driver_license_no_optional: 'DL-XXXXXXX',
        license_type_optional: 'ชนิดที่ 2 สาธารณะ',
        employment_status: 'AVAILABLE',
      });
    }
    setIsDriverModalOpen(true);
  };

  const handleSaveDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...drvForm,
        display_name: drvForm.display_name || `${drvForm.first_name} ${drvForm.last_name}`,
      };
      if (editingDriver) {
        await updateDriver(editingDriver.id, payload);
        showSuccess('สำเร็จ', `อัปเดตข้อมูลพลขับ ${payload.display_name} เรียบร้อยแล้ว`);
      } else {
        await createDriver(payload);
        showSuccess('สำเร็จ', `เพิ่มพลขับ ${payload.display_name} เข้าสู่ระบบแล้ว`);
      }
      setIsDriverModalOpen(false);
      loadAll();
    } catch (err: any) {
      showError('เกิดข้อผิดพลาด', err.message);
    }
  };

  const handleDeleteDriver = async (id: number, name: string) => {
    const ok = await confirmAction({ title: 'ยืนยันการลบ', text: `คุณต้องการนำพลขับ ${name} ออกจากระบบหรือไม่?` });
    if (!ok) return;
    try {
      await deleteDriver(id);
      showSuccess('สำเร็จ', `นำพลขับออกจากระบบเรียบร้อยแล้ว`);
      loadAll();
    } catch (err: any) {
      showError('เกิดข้อผิดพลาด', err.message);
    }
  };

  // Handlers for Staff
  const handleOpenStaffModal = (s?: any) => {
    if (s) {
      setEditingStaff(s);
      setStfForm({
        employee_code: s.employee_code,
        first_name: s.first_name,
        last_name: s.last_name,
        display_name: s.display_name,
        position: s.position || '',
        profession: s.profession || 'Nurse',
        phone_optional: s.phone_optional || '',
      });
    } else {
      setEditingStaff(null);
      setStfForm({
        employee_code: `STF-00${staff.length + 1}`,
        first_name: '',
        last_name: '',
        display_name: '',
        position: 'พยาบาลวิชาชีพชำนาญการ',
        profession: 'Nurse',
        phone_optional: '08X-XXX-XXXX',
      });
    }
    setIsStaffModalOpen(true);
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...stfForm,
        display_name: stfForm.display_name || `${stfForm.first_name} ${stfForm.last_name}`,
      };
      if (editingStaff) {
        await updateStaff(editingStaff.id, payload);
        showSuccess('สำเร็จ', `อัปเดตข้อมูลเจ้าหน้าที่ ${payload.display_name} เรียบร้อยแล้ว`);
      } else {
        await createStaff(payload);
        showSuccess('สำเร็จ', `เพิ่มเจ้าหน้าที่ ${payload.display_name} เข้าสู่ระบบแล้ว`);
      }
      setIsStaffModalOpen(false);
      loadAll();
    } catch (err: any) {
      showError('เกิดข้อผิดพลาด', err.message);
    }
  };

  const handleDeleteStaff = async (id: number, name: string) => {
    const ok = await confirmAction({ title: 'ยืนยันการลบ', text: `คุณต้องการนำเจ้าหน้าที่ ${name} ออกจากระบบหรือไม่?` });
    if (!ok) return;
    try {
      await deleteStaff(id);
      showSuccess('สำเร็จ', `นำเจ้าหน้าที่ออกจากระบบเรียบร้อยแล้ว`);
      loadAll();
    } catch (err: any) {
      showError('เกิดข้อผิดพลาด', err.message);
    }
  };

  // Filtered lists
  const filteredVehicles = vehicles.filter(
    (v) =>
      v.vehicle_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.registration_no.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredDrivers = drivers.filter(
    (d) =>
      d.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.employee_code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredStaff = staff.filter(
    (s) =>
      s.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.position?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.employee_code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-y-auto bg-ems-canvas p-4 sm:p-6 lg:p-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-sky-100 text-sky-700">
              <Ambulance className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-ems-ink tracking-tight">
                จัดการยานพาหนะและทีมกู้ชีพ (Fleet & Crew)
              </h1>
              <p className="text-xs sm:text-sm text-ems-muted mt-0.5">
                เครือข่าย EMS ปลวกแดง · รพ.ปลวกแดง · มูลนิธิกู้ภัยอำเภอปลวกแดง · รพ.กรุงเทพปลวกแดง
              </p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div>
          {activeTab === 'ambulances' && (
            <button
              onClick={() => handleOpenAmbulanceModal()}
              className="ems-primary-button text-xs sm:text-sm shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่มรถพยาบาล</span>
            </button>
          )}
          {activeTab === 'drivers' && (
            <button
              onClick={() => handleOpenDriverModal()}
              className="ems-primary-button text-xs sm:text-sm shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่มพลขับ</span>
            </button>
          )}
          {activeTab === 'staff' && (
            <button
              onClick={() => handleOpenStaffModal()}
              className="ems-primary-button text-xs sm:text-sm shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่มเจ้าหน้าที่</span>
            </button>
          )}
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <div className="bg-white border border-ems-border rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-ems-muted">
            <span>รถพยาบาลทั้งหมด</span>
            <Ambulance className="w-4 h-4 text-sky-600" />
          </div>
          <p className="text-2xl font-black text-ems-ink mt-2">{vehicles.length}</p>
          <p className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1 font-semibold">
            <CheckCircle2 className="w-3 h-3" /> พร้อมใช้ {vehicles.filter((v) => v.status === 'AVAILABLE').length} คัน
          </p>
        </div>

        <div className="bg-white border border-ems-border rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-ems-muted">
            <span>กำลังปฏิบัติภารกิจ</span>
            <Activity className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-ems-ink mt-2">
            {vehicles.filter((v) => ['EN_ROUTE', 'AT_SCENE', 'RETURNING', 'ASSIGNED'].includes(v.status)).length}
          </p>
          <p className="text-[11px] text-amber-700 mt-1 font-semibold">ออกเหตุฉุกเฉิน & Refer</p>
        </div>

        <div className="bg-white border border-ems-border rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-ems-muted">
            <span>พลขับประจำการ</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-ems-ink mt-2">{drivers.length}</p>
          <p className="text-[11px] text-indigo-600 mt-1 font-semibold">
            พร้อมรับภารกิจ {drivers.filter((d) => d.employment_status === 'AVAILABLE').length} ท่าน
          </p>
        </div>

        <div className="bg-white border border-ems-border rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-ems-muted">
            <span>ทีมการแพทย์ฉุกเฉิน</span>
            <HeartPulse className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl font-black text-ems-ink mt-2">{staff.length}</p>
          <p className="text-[11px] text-rose-600 mt-1 font-semibold">แพทย์ / พยาบาล / Paramedic</p>
        </div>
      </div>

      {/* Tabs and Search Bar */}
      <div className="bg-white border border-ems-border rounded-2xl p-4 shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex gap-2 border-b sm:border-b-0 border-ems-border pb-2 sm:pb-0">
            <button
              onClick={() => setActiveTab('ambulances')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
                activeTab === 'ambulances'
                  ? 'bg-sky-700 text-white shadow-md shadow-sky-700/20'
                  : 'bg-ems-inset text-ems-muted hover:text-ems-ink'
              }`}
            >
              <Ambulance className="w-4 h-4" />
              <span>รถพยาบาล ({vehicles.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('drivers')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
                activeTab === 'drivers'
                  ? 'bg-sky-700 text-white shadow-md shadow-sky-700/20'
                  : 'bg-ems-inset text-ems-muted hover:text-ems-ink'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>พลขับ ({drivers.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('staff')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
                activeTab === 'staff'
                  ? 'bg-sky-700 text-white shadow-md shadow-sky-700/20'
                  : 'bg-ems-inset text-ems-muted hover:text-ems-ink'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>เจ้าหน้าที่การแพทย์ ({staff.length})</span>
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ems-muted" />
            <input
              type="text"
              placeholder="ค้นหาชื่อ, รหัส, ทะเบียน..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-ems-inset border border-ems-border rounded-xl text-xs sm:text-sm text-ems-ink focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>
      </div>

      {/* Content Panels */}
      {loading ? (
        <div className="py-20 text-center text-ems-muted text-sm">กำลังโหลดข้อมูลระบบ Fleet & Crew…</div>
      ) : (
        <>
          {/* 1. Ambulances Tab */}
          {activeTab === 'ambulances' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredVehicles.map((v) => (
                <div
                  key={v.id}
                  className="bg-white border border-ems-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative flex flex-col justify-between"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white text-xl shadow-md">
                          🚑
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-lg text-ems-ink">{v.vehicle_code}</span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                v.status === 'AVAILABLE'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : v.status === 'MAINTENANCE'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {v.status === 'AVAILABLE'
                                ? 'พร้อมใช้งาน'
                                : v.status === 'MAINTENANCE'
                                ? 'ซ่อมบำรุง'
                                : v.status}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-sky-700 mt-0.5">{v.registration_no}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenAmbulanceModal(v)}
                          className="p-1.5 text-ems-muted hover:text-sky-700 hover:bg-sky-50 rounded-lg transition-colors"
                          title="แก้ไข"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteAmbulance(v.id, v.vehicle_code)}
                          className="p-1.5 text-ems-muted hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                          title="ปลดประจำการ"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Specs */}
                    <div className="bg-ems-canvas rounded-xl p-3 text-xs space-y-1.5 mb-4">
                      <div className="flex justify-between text-ems-muted">
                        <span>ประเภทรถ:</span>
                        <strong className="text-ems-ink font-semibold">
                          {v.vehicle_type === 'ALS_AMBULANCE'
                            ? 'กู้ชีพขั้นสูง (ALS)'
                            : v.vehicle_type === 'BLS_AMBULANCE'
                            ? 'กู้ชีพเบื้องต้น (BLS)'
                            : 'กู้ชีพส่งต่อ (Refer)'}
                        </strong>
                      </div>
                      <div className="flex justify-between text-ems-muted">
                        <span>รุ่น/ยี่ห้อ:</span>
                        <strong className="text-ems-ink font-semibold">
                          {v.brand || 'Toyota'} {v.model || 'Commuter'}
                        </strong>
                      </div>
                      <div className="flex justify-between text-ems-muted">
                        <span>เลขไมล์สะสม:</span>
                        <strong className="text-ems-ink font-semibold">{(v.odometer || 0).toLocaleString()} กม.</strong>
                      </div>
                      <div className="flex justify-between text-ems-muted">
                        <span>สัญญาณ GPS:</span>
                        <span className="text-emerald-700 font-bold flex items-center gap-1">
                          <Radio className="w-3 h-3" /> {v.gps_quality} ({v.current_speed} กม./ชม.)
                        </span>
                      </div>
                    </div>

                    {/* Standard Equipment Checklist */}
                    <div className="border-t border-ems-border pt-3">
                      <p className="text-[11px] font-bold text-ems-muted mb-2">อุปกรณ์การแพทย์ประจำรถ:</p>
                      <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                        <span className="flex items-center gap-1 text-emerald-700">
                          <CheckCircle2 className="w-3 h-3" /> AED / Defibrillator
                        </span>
                        <span className="flex items-center gap-1 text-emerald-700">
                          <CheckCircle2 className="w-3 h-3" /> Oxygen Central
                        </span>
                        <span className="flex items-center gap-1 text-emerald-700">
                          <CheckCircle2 className="w-3 h-3" /> Suction Unit
                        </span>
                        <span className="flex items-center gap-1 text-emerald-700">
                          <CheckCircle2 className="w-3 h-3" /> Spine Board
                        </span>
                        <span className="flex items-center gap-1 text-emerald-700">
                          <CheckCircle2 className="w-3 h-3" /> Vital Sign Monitor
                        </span>
                        <span className="flex items-center gap-1 text-emerald-700">
                          <CheckCircle2 className="w-3 h-3" /> Telematics GPS
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Footer status toggle */}
                  <div className="mt-4 pt-3 border-t border-ems-border flex items-center justify-between">
                    <span className="text-[11px] text-ems-muted">สถานะความพร้อม:</span>
                    <button
                      onClick={async () => {
                        const newStatus = v.status === 'AVAILABLE' ? 'MAINTENANCE' : 'AVAILABLE';
                        await updateAmbulance(v.id, { status: newStatus });
                        loadAll();
                        showSuccess(
                          'เปลี่ยนสถานะแล้ว',
                          `ปรับสถานะรถ ${v.vehicle_code} เป็น ${newStatus === 'AVAILABLE' ? 'พร้อมใช้งาน' : 'ซ่อมบำรุง'}`
                        );
                      }}
                      className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-all ${
                        v.status === 'AVAILABLE'
                          ? 'bg-amber-50 hover:bg-amber-100 text-amber-700'
                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {v.status === 'AVAILABLE' ? '🔧 สลับเป็นซ่อมบำรุง' : '✅ สลับเป็นพร้อมใช้'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 2. Drivers Tab */}
          {activeTab === 'drivers' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDrivers.map((d) => (
                <div
                  key={d.id}
                  className="bg-white border border-ems-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-600 flex items-center justify-center text-white text-lg font-bold shadow-md">
                          👨‍✈️
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-base text-ems-ink">{d.display_name}</span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                d.employment_status === 'AVAILABLE'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : d.employment_status === 'ON_MISSION'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {d.employment_status}
                            </span>
                          </div>
                          <p className="text-xs text-ems-muted mt-0.5">รหัส: {d.employee_code}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenDriverModal(d)}
                          className="p-1.5 text-ems-muted hover:text-sky-700 hover:bg-sky-50 rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteDriver(d.id, d.display_name)}
                          className="p-1.5 text-ems-muted hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="bg-ems-canvas rounded-xl p-3 text-xs space-y-1.5 mb-2">
                      <div className="flex justify-between text-ems-muted">
                        <span>ใบขับขี่:</span>
                        <strong className="text-ems-ink font-semibold">
                          {d.license_type_optional || 'ชนิดที่ 2 สาธารณะ'}
                        </strong>
                      </div>
                      <div className="flex justify-between text-ems-muted">
                        <span>เลขที่ใบขับขี่:</span>
                        <strong className="text-ems-ink font-semibold">
                          {d.driver_license_no_optional || 'DL-7788991'}
                        </strong>
                      </div>
                      <div className="flex justify-between text-ems-muted">
                        <span>เบอร์ติดต่อ:</span>
                        <a
                          href={`tel:${d.phone_optional}`}
                          className="text-sky-700 font-bold flex items-center gap-1 hover:underline"
                        >
                          <Phone className="w-3 h-3" /> {d.phone_optional || 'ไม่ระบุ'}
                        </a>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-ems-border flex items-center justify-between text-xs">
                    <span className="text-[11px] text-ems-muted">สังกัด: ศูนย์กู้ชีพ รพ.ปลวกแดง / มูลนิธิกู้ภัย / BHP</span>
                    <button
                      onClick={async () => {
                        const newStatus = d.employment_status === 'AVAILABLE' ? 'OFF_DUTY' : 'AVAILABLE';
                        await updateDriver(d.id, { employment_status: newStatus });
                        loadAll();
                        showSuccess(
                          'อัปเดตสถานะแล้ว',
                          `ปรับสถานะพลขับเป็น ${newStatus === 'AVAILABLE' ? 'พร้อมรับงาน' : 'ออกเวร/พักผ่อน'}`
                        );
                      }}
                      className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-all ${
                        d.employment_status === 'AVAILABLE'
                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {d.employment_status === 'AVAILABLE' ? 'ออกเวร' : 'เข้าเวร'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 3. Staff Tab */}
          {activeTab === 'staff' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStaff.map((s) => (
                <div
                  key={s.id}
                  className="bg-white border border-ems-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-bold shadow-md ${
                            s.profession === 'Doctor'
                              ? 'bg-gradient-to-tr from-emerald-600 to-teal-600'
                              : s.profession === 'Nurse'
                              ? 'bg-gradient-to-tr from-sky-600 to-indigo-600'
                              : s.profession === 'Paramedic'
                              ? 'bg-gradient-to-tr from-amber-600 to-rose-600'
                              : 'bg-gradient-to-tr from-blue-600 to-cyan-600'
                          }`}
                        >
                          {s.profession === 'Doctor' ? '🩺' : s.profession === 'Nurse' ? '👩‍⚕️' : '🚑'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-base text-ems-ink">{s.display_name}</span>
                          </div>
                          <p className="text-xs text-ems-muted mt-0.5">{s.position || 'เจ้าหน้าที่กู้ชีพ'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenStaffModal(s)}
                          className="p-1.5 text-ems-muted hover:text-sky-700 hover:bg-sky-50 rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteStaff(s.id, s.display_name)}
                          className="p-1.5 text-ems-muted hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="bg-ems-canvas rounded-xl p-3 text-xs space-y-1.5 mb-2">
                      <div className="flex justify-between text-ems-muted">
                        <span>รหัสบุคลากร:</span>
                        <strong className="text-ems-ink font-semibold">{s.employee_code}</strong>
                      </div>
                      <div className="flex justify-between text-ems-muted">
                        <span>วิชาชีพ:</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800">
                          {s.profession}
                        </span>
                      </div>
                      <div className="flex justify-between text-ems-muted">
                        <span>เบอร์โทรศัพท์:</span>
                        <a
                          href={`tel:${s.phone_optional}`}
                          className="text-sky-700 font-bold flex items-center gap-1 hover:underline"
                        >
                          <Phone className="w-3 h-3" /> {s.phone_optional || 'ไม่ระบุ'}
                        </a>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-ems-border flex items-center justify-between text-xs">
                    <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> พร้อมปฏิบัติการ
                    </span>
                    <span className="text-[10px] text-ems-muted">เครือข่าย EMS ปลวกแดง</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* AMBULANCE MODAL */}
      {isAmbulanceModalOpen && (
        <div className="fixed inset-0 z-[2000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4 border-b pb-3">
              <h3 className="font-bold text-lg text-ems-ink flex items-center gap-2">
                <Ambulance className="w-5 h-5 text-sky-700" />
                <span>{editingAmbulance ? 'แก้ไขข้อมูลรถพยาบาล' : 'เพิ่มรถพยาบาลใหม่'}</span>
              </h3>
              <button
                onClick={() => setIsAmbulanceModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-ems-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAmbulance} className="space-y-3 text-xs sm:text-sm">
              <div>
                <label className="block font-semibold text-ems-ink mb-1">รหัสรถพยาบาล (Vehicle Code) *</label>
                <input
                  required
                  type="text"
                  value={ambForm.vehicle_code}
                  onChange={(e) => setAmbForm({ ...ambForm, vehicle_code: e.target.value })}
                  placeholder="เช่น EMS-06"
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-ems-ink mb-1">เลขทะเบียนรถ *</label>
                <input
                  required
                  type="text"
                  value={ambForm.registration_no}
                  onChange={(e) => setAmbForm({ ...ambForm, registration_no: e.target.value })}
                  placeholder="เช่น กข-9901 ระยอง"
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-ems-ink mb-1">ประเภทรถ</label>
                  <select
                    value={ambForm.vehicle_type}
                    onChange={(e) => setAmbForm({ ...ambForm, vehicle_type: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl"
                  >
                    <option value="ALS_AMBULANCE">ALS (กู้ชีพขั้นสูง)</option>
                    <option value="BLS_AMBULANCE">BLS (กู้ชีพพื้นฐาน)</option>
                    <option value="INTERMEDIATE">Refer / ส่งต่อ</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-ems-ink mb-1">สถานะ</label>
                  <select
                    value={ambForm.status}
                    onChange={(e) => setAmbForm({ ...ambForm, status: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl"
                  >
                    <option value="AVAILABLE">AVAILABLE (พร้อมใช้งาน)</option>
                    <option value="MAINTENANCE">MAINTENANCE (ซ่อมบำรุง)</option>
                    <option value="OUT_OF_SERVICE">OUT_OF_SERVICE (งดใช้)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-ems-ink mb-1">ยี่ห้อ (Brand)</label>
                  <input
                    type="text"
                    value={ambForm.brand}
                    onChange={(e) => setAmbForm({ ...ambForm, brand: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-ems-ink mb-1">รุ่น (Model)</label>
                  <input
                    type="text"
                    value={ambForm.model}
                    onChange={(e) => setAmbForm({ ...ambForm, model: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-ems-ink mb-1">เลขไมล์สะสม (กม.)</label>
                <input
                  type="number"
                  value={ambForm.odometer}
                  onChange={(e) => setAmbForm({ ...ambForm, odometer: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t mt-4">
                <button
                  type="button"
                  onClick={() => setIsAmbulanceModalOpen(false)}
                  className="px-4 py-2 rounded-xl border text-ems-muted hover:bg-slate-50 font-semibold"
                >
                  ยกเลิก
                </button>
                <button type="submit" className="ems-primary-button">
                  บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DRIVER MODAL */}
      {isDriverModalOpen && (
        <div className="fixed inset-0 z-[2000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4 border-b pb-3">
              <h3 className="font-bold text-lg text-ems-ink flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-700" />
                <span>{editingDriver ? 'แก้ไขข้อมูลพลขับ' : 'เพิ่มพลขับใหม่'}</span>
              </h3>
              <button
                onClick={() => setIsDriverModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-ems-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDriver} className="space-y-3 text-xs sm:text-sm">
              <div>
                <label className="block font-semibold text-ems-ink mb-1">รหัสพนักงาน *</label>
                <input
                  required
                  type="text"
                  value={drvForm.employee_code}
                  onChange={(e) => setDrvForm({ ...drvForm, employee_code: e.target.value })}
                  placeholder="เช่น DRV-005"
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-ems-ink mb-1">ชื่อจริง *</label>
                  <input
                    required
                    type="text"
                    value={drvForm.first_name}
                    onChange={(e) => setDrvForm({ ...drvForm, first_name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-ems-ink mb-1">นามสกุล *</label>
                  <input
                    required
                    type="text"
                    value={drvForm.last_name}
                    onChange={(e) => setDrvForm({ ...drvForm, last_name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-ems-ink mb-1">เบอร์โทรศัพท์</label>
                <input
                  type="text"
                  value={drvForm.phone_optional}
                  onChange={(e) => setDrvForm({ ...drvForm, phone_optional: e.target.value })}
                  placeholder="เช่น 081-234-5678"
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-ems-ink mb-1">ประเภทใบขับขี่</label>
                  <input
                    type="text"
                    value={drvForm.license_type_optional}
                    onChange={(e) => setDrvForm({ ...drvForm, license_type_optional: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-ems-ink mb-1">สถานะ</label>
                  <select
                    value={drvForm.employment_status}
                    onChange={(e) => setDrvForm({ ...drvForm, employment_status: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl"
                  >
                    <option value="AVAILABLE">AVAILABLE (พร้อมรับงาน)</option>
                    <option value="OFF_DUTY">OFF_DUTY (ออกเวร)</option>
                    <option value="LEAVE">LEAVE (ลา)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t mt-4">
                <button
                  type="button"
                  onClick={() => setIsDriverModalOpen(false)}
                  className="px-4 py-2 rounded-xl border text-ems-muted hover:bg-slate-50 font-semibold"
                >
                  ยกเลิก
                </button>
                <button type="submit" className="ems-primary-button">
                  บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STAFF MODAL */}
      {isStaffModalOpen && (
        <div className="fixed inset-0 z-[2000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4 border-b pb-3">
              <h3 className="font-bold text-lg text-ems-ink flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-700" />
                <span>{editingStaff ? 'แก้ไขข้อมูลเจ้าหน้าที่' : 'เพิ่มเจ้าหน้าที่ใหม่'}</span>
              </h3>
              <button
                onClick={() => setIsStaffModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-ems-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStaff} className="space-y-3 text-xs sm:text-sm">
              <div>
                <label className="block font-semibold text-ems-ink mb-1">รหัสบุคลากร *</label>
                <input
                  required
                  type="text"
                  value={stfForm.employee_code}
                  onChange={(e) => setStfForm({ ...stfForm, employee_code: e.target.value })}
                  placeholder="เช่น STF-006"
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-ems-ink mb-1">ชื่อจริง *</label>
                  <input
                    required
                    type="text"
                    value={stfForm.first_name}
                    onChange={(e) => setStfForm({ ...stfForm, first_name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-ems-ink mb-1">นามสกุล *</label>
                  <input
                    required
                    type="text"
                    value={stfForm.last_name}
                    onChange={(e) => setStfForm({ ...stfForm, last_name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-ems-ink mb-1">วิชาชีพ</label>
                  <select
                    value={stfForm.profession}
                    onChange={(e) => setStfForm({ ...stfForm, profession: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl"
                  >
                    <option value="Nurse">Nurse (พยาบาลวิชาชีพ)</option>
                    <option value="Paramedic">Paramedic (นักปฏิบัติการฉุกเฉินฯ)</option>
                    <option value="EMT">EMT (พนักงานฉุกเฉินการแพทย์)</option>
                    <option value="Doctor">Doctor (แพทย์)</option>
                    <option value="Other">Other (เจ้าหน้าที่อื่นๆ)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-ems-ink mb-1">ตำแหน่ง</label>
                  <input
                    type="text"
                    value={stfForm.position}
                    onChange={(e) => setStfForm({ ...stfForm, position: e.target.value })}
                    placeholder="เช่น พว.ชำนาญการ"
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-ems-ink mb-1">เบอร์โทรศัพท์</label>
                <input
                  type="text"
                  value={stfForm.phone_optional}
                  onChange={(e) => setStfForm({ ...stfForm, phone_optional: e.target.value })}
                  placeholder="เช่น 089-111-2222"
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t mt-4">
                <button
                  type="button"
                  onClick={() => setIsStaffModalOpen(false)}
                  className="px-4 py-2 rounded-xl border text-ems-muted hover:bg-slate-50 font-semibold"
                >
                  ยกเลิก
                </button>
                <button type="submit" className="ems-primary-button">
                  บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default FleetManagementPage;
