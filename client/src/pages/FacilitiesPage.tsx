import React, { useState, useEffect } from 'react';
import { FacilityData } from '../types/ems';
import { fetchFacilities, saveFacility } from '../services/api';
import { FacilityModal } from '../components/modals/FacilityModal';
import { Building2, Plus, Edit2, MapPin, Search, Phone } from 'lucide-react';

export const FacilitiesPage: React.FC = () => {
  const [facilities, setFacilities] = useState<FacilityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState<FacilityData | null>(null);

  const loadFacilities = async () => {
    setLoading(true);
    try {
      const data = await fetchFacilities();
      setFacilities(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFacilities();
  }, []);

  const handleSave = async (data: Partial<FacilityData>) => {
    const res = await saveFacility(data);
    if (!res.success) throw new Error(res.message || 'บันทึกไม่สำเร็จ');
    await loadFacilities();
  };

  const filtered = facilities.filter(
    (f) =>
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.facility_code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="w-6 h-6 text-sky-400" />
            <h1 className="text-xl sm:text-2xl font-bold text-white">
              ทะเบียนโรงพยาบาลและปลายทาง (Facility Master)
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            กำหนดตำแหน่ง GPS และรัศมี Geofence สำหรับตรวจจับการเข้า-ออกของรถพยาบาลอัตโนมัติ
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedFacility(null);
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-sky-600/30 transition-all hover:scale-105"
        >
          <Plus className="w-4 h-4" />
          <span>เพิ่มสถานพยาบาลใหม่</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="ค้นหาชื่อโรงพยาบาล หรือ รหัสย่อ..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
      </div>

      {/* Facility Cards / Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/80 text-xs uppercase font-semibold text-slate-400 border-b border-slate-700">
              <tr>
                <th className="py-3 px-4">รหัส</th>
                <th className="py-3 px-4">ชื่อสถานพยาบาล</th>
                <th className="py-3 px-4">ประเภท</th>
                <th className="py-3 px-4">พิกัด GPS (Lat, Lng)</th>
                <th className="py-3 px-4">รัศมี Geofence</th>
                <th className="py-3 px-4">เบอร์โทรศัพท์</th>
                <th className="py-3 px-4 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.map((fac) => (
                <tr key={fac.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-sky-400">
                    {fac.facility_code}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-100">{fac.name}</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-800 border border-slate-700 text-slate-300">
                      {fac.facility_type}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-xs text-slate-400">
                    {Number(fac.latitude).toFixed(5)}, {Number(fac.longitude).toFixed(5)}
                  </td>
                  <td className="py-3.5 px-4 text-xs font-semibold text-slate-200">
                    {Number(fac.geofence_radius) || 200} ม.
                  </td>
                  <td className="py-3.5 px-4 text-xs text-slate-300">
                    {fac.phone_optional ? (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {fac.phone_optional}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => {
                        setSelectedFacility(fac);
                        setIsModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 text-xs font-medium inline-flex items-center gap-1 transition-colors"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>แก้ไข / พิกัด</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal with Map Picker */}
      <FacilityModal
        isOpen={isModalOpen}
        facility={selectedFacility}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedFacility(null);
        }}
        onSave={handleSave}
      />
    </div>
  );
};
