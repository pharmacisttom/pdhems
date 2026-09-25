import React, { useState, useEffect } from 'react';
import { AvailableResources } from '../../types/ems';
import { assignMission, fetchAvailableResources } from '../../services/api';
import { X, Check, AlertCircle, ShieldAlert, Truck, UserCheck, Users } from 'lucide-react';

interface AssignMissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  missionId: number;
  missionNo: string;
  onAssigned: () => void;
}

export const AssignMissionModal: React.FC<AssignMissionModalProps> = ({
  isOpen,
  onClose,
  missionId,
  missionNo,
  onAssigned,
}) => {
  const [resources, setResources] = useState<AvailableResources>({
    availableVehicles: [],
    availableDrivers: [],
    availableStaff: [],
  });
  const [selectedVehicle, setSelectedVehicle] = useState<number | ''>('');
  const [selectedDriver, setSelectedDriver] = useState<number | ''>('');
  const [selectedCrew, setSelectedCrew] = useState<
    Array<{ staffId: number; role: string; isTeamLeader: boolean }>
  >([]);

  const [loading, setLoading] = useState<boolean>(false);
  const [fetching, setFetching] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadResources();
    }
  }, [isOpen]);

  const loadResources = async () => {
    setFetching(true);
    setError(null);
    try {
      const res = await fetchAvailableResources();
      setResources(res);
      if (res.availableVehicles.length > 0) setSelectedVehicle(res.availableVehicles[0].id);
      if (res.availableDrivers.length > 0) setSelectedDriver(res.availableDrivers[0].id);
      if (res.availableStaff.length > 0) {
        setSelectedCrew([
          { staffId: res.availableStaff[0].id, role: 'NURSE', isTeamLeader: true },
        ]);
      }
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถโหลดทรัพยากรว่างได้');
    } finally {
      setFetching(false);
    }
  };

  const handleToggleStaff = (staffId: number, profession: string) => {
    const existing = selectedCrew.find((c) => c.staffId === staffId);
    if (existing) {
      setSelectedCrew(selectedCrew.filter((c) => c.staffId !== staffId));
    } else {
      let defaultRole = 'EMT';
      if (profession.toLowerCase().includes('doctor')) defaultRole = 'DOCTOR';
      else if (profession.toLowerCase().includes('nurse')) defaultRole = 'NURSE';
      else if (profession.toLowerCase().includes('paramedic')) defaultRole = 'PARAMEDIC';

      const isFirst = selectedCrew.length === 0;
      setSelectedCrew([...selectedCrew, { staffId, role: defaultRole, isTeamLeader: isFirst }]);
    }
  };

  const handleSetLeader = (staffId: number) => {
    setSelectedCrew(
      selectedCrew.map((c) => ({
        ...c,
        isTeamLeader: c.staffId === staffId,
      }))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle) {
      setError('กรุณาเลือกรถพยาบาลที่พร้อมใช้งาน');
      return;
    }
    if (!selectedDriver) {
      setError('กรุณาเลือกพลขับที่พร้อมปฏิบัติงาน');
      return;
    }
    if (selectedCrew.length === 0) {
      setError('กรุณาเลือกเจ้าหน้าที่ EMS ประจำรถอย่างน้อย 1 คน');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await assignMission(missionId, {
        vehicleId: Number(selectedVehicle),
        driverId: Number(selectedDriver),
        crew: selectedCrew,
      });

      if (res.success) {
        onAssigned();
        onClose();
      } else {
        setError(res.message || 'เกิดข้อผิดพลาดในการมอบหมาย');
      }
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative text-slate-100 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-100 p-2 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-600/30">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">มอบหมายรถ พลขับ และทีมกู้ชีพ</h3>
            <p className="text-xs text-slate-400">ภารกิจ: <span className="text-sky-400 font-mono font-semibold">{missionNo}</span></p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {fetching ? (
          <div className="py-8 text-center text-slate-400 text-sm">กำลังตรวจสอบทรัพยากรว่างในระบบ...</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Vehicle Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-sky-400" />
                เลือกรถพยาบาล (Available Ambulances)
              </label>
              {resources.availableVehicles.length === 0 ? (
                <p className="text-xs text-amber-400 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                  ไม่มีรถพยาบาลสถานะว่างในขณะนี้ (รถทุกคันกำลังปฏิบัติงานหรือซ่อมบำรุง)
                </p>
              ) : (
                <select
                  value={selectedVehicle}
                  onChange={(e) => setSelectedVehicle(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  {resources.availableVehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.vehicle_code} — {v.registration_no} ({v.brand} {v.model})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Driver Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                เลือกพลขับ (Available Drivers)
              </label>
              {resources.availableDrivers.length === 0 ? (
                <p className="text-xs text-amber-400 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                  ไม่มีพลขับว่างในระบบ
                </p>
              ) : (
                <select
                  value={selectedDriver}
                  onChange={(e) => setSelectedDriver(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {resources.availableDrivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.display_name} {d.phone_optional ? `(${d.phone_optional})` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Crew Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-indigo-400" />
                  เลือกทีมปฏิบัติการประจำรถ (EMS Crew)
                </span>
                <span className="text-[11px] text-slate-400 font-normal">
                  เลือกแล้ว: {selectedCrew.length} คน
                </span>
              </label>
              <div className="space-y-2 border border-slate-800 rounded-xl p-3 bg-slate-950/50 max-h-48 overflow-y-auto">
                {resources.availableStaff.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-2">ไม่มีเจ้าหน้าที่ว่าง</p>
                ) : (
                  resources.availableStaff.map((staff) => {
                    const isSelected = selectedCrew.some((c) => c.staffId === staff.id);
                    const crewItem = selectedCrew.find((c) => c.staffId === staff.id);

                    return (
                      <div
                        key={staff.id}
                        className={`flex items-center justify-between p-2 rounded-lg border text-xs transition-colors ${
                          isSelected
                            ? 'bg-sky-500/10 border-sky-500/30 text-white'
                            : 'bg-slate-800/40 border-slate-700/50 text-slate-400 hover:bg-slate-800'
                        }`}
                      >
                        <div
                          className="flex items-center gap-2 cursor-pointer flex-1"
                          onClick={() => handleToggleStaff(staff.id, staff.profession)}
                        >
                          <div
                            className={`w-4 h-4 rounded flex items-center justify-center border ${
                              isSelected ? 'bg-sky-600 border-sky-500 text-white' : 'border-slate-600'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3" />}
                          </div>
                          <div>
                            <span className="font-medium text-slate-200">{staff.display_name}</span>
                            <span className="ml-2 text-[10px] text-slate-400">({staff.profession})</span>
                          </div>
                        </div>

                        {isSelected && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleSetLeader(staff.id)}
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                                crewItem?.isTeamLeader
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                              }`}
                            >
                              {crewItem?.isTeamLeader ? '★ หัวหน้าทีม' : 'ตั้งเป็นหัวหน้า'}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={loading || resources.availableVehicles.length === 0}
                className="px-5 py-2 text-sm font-semibold bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white rounded-xl shadow-lg shadow-sky-600/30 flex items-center gap-2 transition-all disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>{loading ? 'กำลังบันทึก...' : 'ยืนยันการมอบหมาย'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
