import React, { useState, useEffect } from 'react';
import { EmsBaseData } from '../types/ems';
import { fetchBases, saveBase } from '../services/api';
import { BaseModal } from '../components/modals/BaseModal';
import { MapPin, Plus, Edit2, Search } from 'lucide-react';

export const BasesPage: React.FC = () => {
  const [bases, setBases] = useState<EmsBaseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBase, setSelectedBase] = useState<EmsBaseData | null>(null);

  const loadBases = async () => {
    setLoading(true);
    try {
      const data = await fetchBases();
      setBases(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBases();
  }, []);

  const handleSave = async (data: Partial<EmsBaseData>) => {
    const res = await saveBase(data);
    if (!res.success) throw new Error(res.message || 'บันทึกไม่สำเร็จ');
    await loadBases();
  };

  const filtered = bases.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <MapPin className="w-6 h-6 text-teal-400" />
            <h1 className="text-xl sm:text-2xl font-bold text-white">
              ฐานจอดรถกู้ชีพ (EMS Bases Master)
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            จัดการฐานจอดรถพยาบาล รัศมีตรวจจับ Geofence การกลับถึงฐาน และการเตรียมพร้อมออกเหตุ
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedBase(null);
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-teal-600/30 transition-all hover:scale-105"
        >
          <Plus className="w-4 h-4" />
          <span>เพิ่มฐานกู้ชีพใหม่</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="ค้นหาชื่อฐานกู้ชีพ..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>

      {/* Bases Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/80 text-xs uppercase font-semibold text-slate-400 border-b border-slate-700">
              <tr>
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">ชื่อฐานกู้ชีพ / จุดจอดรถ</th>
                <th className="py-3 px-4">พิกัด GPS (Lat, Lng)</th>
                <th className="py-3 px-4">รัศมี Geofence ฐาน</th>
                <th className="py-3 px-4">สถานะ</th>
                <th className="py-3 px-4 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.map((base, idx) => (
                <tr key={base.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="py-3.5 px-4 font-mono text-slate-500">{idx + 1}</td>
                  <td className="py-3.5 px-4 font-semibold text-slate-100 flex items-center gap-2">
                    <span className="text-teal-400">📍</span>
                    <span>{base.name}</span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-xs text-slate-400">
                    {Number(base.latitude).toFixed(5)}, {Number(base.longitude).toFixed(5)}
                  </td>
                  <td className="py-3.5 px-4 text-xs font-semibold text-teal-300">
                    {Number(base.geofence_radius) || 150} เมตร
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      เปิดใช้งาน
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => {
                        setSelectedBase(base);
                        setIsModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700 text-xs font-medium inline-flex items-center gap-1 transition-colors"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>แก้ไข / ปักหมุด</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal with Map Picker */}
      <BaseModal
        isOpen={isModalOpen}
        base={selectedBase}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedBase(null);
        }}
        onSave={handleSave}
      />
    </div>
  );
};
