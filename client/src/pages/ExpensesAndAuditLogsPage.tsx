import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Receipt,
  Fuel,
  Wrench,
  Package,
  Clock,
  Plus,
  Search,
  Filter,
  Trash2,
  Calendar,
  FileText,
  ShieldAlert,
  ShieldCheck,
  Building2,
  Ambulance,
  History,
  TrendingUp,
  Tag,
  CheckCircle,
} from 'lucide-react';
import Swal from 'sweetalert2';
import {
  fetchExpenses,
  createExpense,
  deleteExpense,
  fetchAuditLogs,
  fetchVehicles,
} from '../services/api';

const CATEGORY_MAP: Record<string, { label: string; icon: any; color: string }> = {
  FUEL: { label: 'ค่าน้ำมันเชื้อเพลิง', icon: Fuel, color: 'text-amber-600 bg-amber-500/10 border-amber-500/30' },
  MAINTENANCE: { label: 'ค่าซ่อมบำรุง/อะไหล่', icon: Wrench, color: 'text-blue-600 bg-blue-500/10 border-blue-500/30' },
  MEDICAL_SUPPLIES: { label: 'เวชภัณฑ์/ออกซิเจน', icon: Package, color: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/30' },
  REFER_FEE: { label: 'ค่าประสานงานส่งต่อ', icon: TrendingUp, color: 'text-purple-600 bg-purple-500/10 border-purple-500/30' },
  OT_ALLOWANCE: { label: 'ค่าเบี้ยเลี้ยง / OT', icon: Clock, color: 'text-indigo-600 bg-indigo-500/10 border-indigo-500/30' },
  TOLL_WAY: { label: 'ค่าผ่านทาง/ทางด่วน', icon: DollarSign, color: 'text-teal-600 bg-teal-500/10 border-teal-500/30' },
  EQUIPMENT: { label: 'อุปกรณ์การแพทย์', icon: Tag, color: 'text-sky-600 bg-sky-500/10 border-sky-500/30' },
  OTHER: { label: 'ค่าใช้จ่ายเบ็ดเตล็ด', icon: FileText, color: 'text-slate-600 bg-slate-500/10 border-slate-500/30' },
};

export const ExpensesAndAuditLogsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'expenses' | 'audit'>('expenses');
  const [expenses, setExpenses] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filter States
  const [search, setSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedVehicle, setSelectedVehicle] = useState<string>('ALL');
  const [auditSearch, setAuditSearch] = useState<string>('');
  const [auditEntity, setAuditEntity] = useState<string>('ALL');

  // Modal State
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [category, setCategory] = useState<string>('FUEL');
  const [amount, setAmount] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [vehicleId, setVehicleId] = useState<string>('');
  const [invoiceNo, setInvoiceNo] = useState<string>('');
  const [expenseDate, setExpenseDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    loadData();
  }, [selectedCategory, selectedVehicle]);

  const loadData = async () => {
    setLoading(true);
    try {
      const filters: any = {};
      if (selectedCategory !== 'ALL') filters.category = selectedCategory;
      if (selectedVehicle !== 'ALL') filters.vehicle_id = selectedVehicle;

      const [expData, logsData, vehData] = await Promise.all([
        fetchExpenses(filters),
        fetchAuditLogs(),
        fetchVehicles(),
      ]);

      setExpenses(expData.data);
      setSummary(expData.summary);
      setAuditLogs(logsData);
      setVehicles(vehData);
    } catch (err) {
      console.error('Failed to load expenses or audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !amount) {
      await Swal.fire({ icon: 'warning', title: 'ข้อมูลไม่ครบ', text: 'กรุณากรอกรายการและจำนวนเงิน' });
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        category,
        amount: Number(amount),
        title: title.trim(),
        vehicle_id: vehicleId ? Number(vehicleId) : null,
        invoice_no: invoiceNo.trim() || null,
        expense_date: expenseDate,
        notes: notes.trim() || null,
      };

      const res = await createExpense(payload);
      if (!res.success) throw new Error(res.message);

      await Swal.fire({
        icon: 'success',
        title: 'บันทึกสำเร็จ!',
        text: `บันทึกรายการ ${res.data.expense_no} จำนวน ${Number(amount).toLocaleString()} บาท พร้อมลงบันทึกใน Audit Log เรียบร้อยแล้ว`,
      });

      setShowCreateModal(false);
      setTitle('');
      setAmount('');
      setInvoiceNo('');
      setNotes('');
      await loadData();
    } catch (err: any) {
      await Swal.fire({ icon: 'error', title: 'บันทึกไม่สำเร็จ', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async (exp: any) => {
    const confirm = await Swal.fire({
      icon: 'warning',
      title: `ลบรายการ ${exp.expense_no}?`,
      text: `รายการ: ${exp.title} (${Number(exp.amount).toLocaleString()} บาท) ข้อมูลจะถูกบันทึกลงใน Audit Log`,
      showCancelButton: true,
      confirmButtonText: 'ลบรายการ',
      cancelButtonText: 'ยกเลิก',
    });

    if (!confirm.isConfirmed) return;

    try {
      const res = await deleteExpense(exp.id);
      if (!res.success) throw new Error(res.message);
      await Swal.fire({ icon: 'success', title: 'ลบสำเร็จ', text: res.message });
      await loadData();
    } catch (err: any) {
      await Swal.fire({ icon: 'error', text: err.message });
    }
  };

  // Filtered expense list
  const filteredExpenses = expenses.filter((e) => {
    return (
      !search ||
      e.title?.toLowerCase().includes(search.toLowerCase()) ||
      e.expense_no?.toLowerCase().includes(search.toLowerCase()) ||
      e.invoice_no?.toLowerCase().includes(search.toLowerCase()) ||
      e.vehicle_code?.toLowerCase().includes(search.toLowerCase())
    );
  });

  // Filtered audit logs
  const filteredAuditLogs = auditLogs.filter((log) => {
    const matchEntity = auditEntity === 'ALL' || log.entity === auditEntity;
    const matchSearch =
      !auditSearch ||
      log.action?.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.user_name?.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.details?.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.ip_address?.includes(auditSearch);
    return matchEntity && matchSearch;
  });

  return (
    <div className="flex-1 flex flex-col p-4 md:p-6 bg-ems-canvas space-y-5 overflow-y-auto">
      {/* Top Banner & Tab Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-ems-surface border border-ems-border p-5 rounded-3xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-700 dark:text-emerald-400 rounded-2xl border border-emerald-500/30">
            <DollarSign className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-ems-ink">
              จัดการค่าใช้จ่ายและบันทึกประวัติ (Expenses &amp; Audit Logs)
            </h1>
            <p className="text-xs text-ems-muted mt-0.5">
              ระบบบันทึกค่าใช้จ่ายการปฏิบัติการ EMS / Refer ปลวกแดง พร้อม Audit Trail ติดตามผู้ใช้งานและค่าใช้จ่ายแบบ Real-time
            </p>
          </div>
        </div>

        {/* Tab Toggle Switcher */}
        <div className="flex items-center gap-1.5 bg-ems-inset p-1.5 rounded-2xl border border-ems-border">
          <button
            onClick={() => setActiveTab('expenses')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'expenses'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-ems-muted hover:text-ems-ink'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>บันทึกค่าใช้จ่าย ({expenses.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'audit'
                ? 'bg-sky-600 text-white shadow-md'
                : 'text-ems-muted hover:text-ems-ink'
            }`}
          >
            <History className="w-4 h-4" />
            <span>ประวัติและ Audit Log ({auditLogs.length})</span>
          </button>
        </div>
      </div>

      {activeTab === 'expenses' ? (
        <>
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {/* Total */}
            <div className="col-span-2 md:col-span-1 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border-2 border-emerald-500/40 p-4 rounded-2xl shadow-sm">
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400">
                ยอดค่าใช้จ่ายรวมทั้งหมด
              </span>
              <div className="text-2xl md:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                ฿{Number(summary.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[11px] text-ems-muted">{summary.total_count || 0} รายการ</span>
            </div>

            {/* Fuel */}
            <div className="bg-ems-surface border border-ems-border p-4 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between text-xs font-bold text-amber-700 dark:text-amber-400">
                <span>ค่าน้ำมันเชื้อเพลิง</span>
                <Fuel className="w-4 h-4" />
              </div>
              <div className="text-xl md:text-2xl font-black text-ems-ink mt-1">
                ฿{Number(summary.fuel_total || 0).toLocaleString()}
              </div>
              <span className="text-[11px] text-ems-muted">ดีเซล B7 / เบนซิน</span>
            </div>

            {/* Maintenance */}
            <div className="bg-ems-surface border border-ems-border p-4 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between text-xs font-bold text-blue-700 dark:text-blue-400">
                <span>ค่าซ่อมบำรุง/อะไหล่</span>
                <Wrench className="w-4 h-4" />
              </div>
              <div className="text-xl md:text-2xl font-black text-ems-ink mt-1">
                ฿{Number(summary.maintenance_total || 0).toLocaleString()}
              </div>
              <span className="text-[11px] text-ems-muted">ตรวจสภาพ / เปลี่ยนถ่ายน้ำมัน</span>
            </div>

            {/* Medical Supplies */}
            <div className="bg-ems-surface border border-ems-border p-4 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-700 dark:text-emerald-400">
                <span>เวชภัณฑ์/ออกซิเจน</span>
                <Package className="w-4 h-4" />
              </div>
              <div className="text-xl md:text-2xl font-black text-ems-ink mt-1">
                ฿{Number(summary.supplies_total || 0).toLocaleString()}
              </div>
              <span className="text-[11px] text-ems-muted">อุปกรณ์กู้ชีพฉุกเฉิน</span>
            </div>

            {/* Allowance / OT */}
            <div className="bg-ems-surface border border-ems-border p-4 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between text-xs font-bold text-indigo-700 dark:text-indigo-400">
                <span>ค่าตอบแทนเวร / OT</span>
                <Clock className="w-4 h-4" />
              </div>
              <div className="text-xl md:text-2xl font-black text-ems-ink mt-1">
                ฿{Number(summary.allowance_total || 0).toLocaleString()}
              </div>
              <span className="text-[11px] text-ems-muted">ทีมส่งต่อและพลขับ</span>
            </div>
          </div>

          {/* Search, Filter & New Expense Button */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-ems-surface border border-ems-border p-3.5 rounded-2xl shadow-sm">
            <div className="flex items-center gap-2 flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-ems-muted shrink-0" />
              <input
                type="text"
                placeholder="ค้นหารายการค่าใช้จ่าย, รหัส EXP, เลขที่ใบเสร็จ, ทะเบียนรถ..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-ems-inset border border-ems-border rounded-xl px-3 py-1.5 text-xs text-ems-ink focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2">
              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-ems-inset border border-ems-border text-xs font-bold text-ems-ink px-3 py-1.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ALL">หมวดหมู่ทั้งหมด</option>
                {Object.entries(CATEGORY_MAP).map(([key, item]) => (
                  <option key={key} value={key}>
                    {item.label}
                  </option>
                ))}
              </select>

              {/* Vehicle Filter */}
              <select
                value={selectedVehicle}
                onChange={(e) => setSelectedVehicle(e.target.value)}
                className="bg-ems-inset border border-ems-border text-xs font-bold text-ems-ink px-3 py-1.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ALL">รถพยาบาลทั้งหมด</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.vehicle_code} ({v.registration_no})
                  </option>
                ))}
              </select>

              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 flex items-center gap-1.5 transition-transform active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>+ บันทึกค่าใช้จ่ายใหม่</span>
              </button>
            </div>
          </div>

          {/* Expenses Table */}
          <div className="bg-ems-surface border border-ems-border rounded-3xl shadow-sm overflow-hidden flex-1 flex flex-col">
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-ems-inset/80 border-b border-ems-border text-ems-muted font-bold">
                    <th className="py-3 px-4">รหัสรายการ</th>
                    <th className="py-3 px-4">วันที่จ่าย</th>
                    <th className="py-3 px-4">หมวดหมู่</th>
                    <th className="py-3 px-4">รายละเอียดรายการค่าใช้จ่าย</th>
                    <th className="py-3 px-4">รถ/ภารกิจ</th>
                    <th className="py-3 px-4">เลขที่ใบเสร็จ</th>
                    <th className="py-3 px-4 text-right">จำนวนเงิน (บาท)</th>
                    <th className="py-3 px-4">ผู้บันทึก</th>
                    <th className="py-3 px-4 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ems-border/60">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-ems-muted">
                        กำลังโหลดข้อมูลค่าใช้จ่าย…
                      </td>
                    </tr>
                  ) : filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-ems-muted">
                        ไม่พบรายการค่าใช้จ่ายตามเงื่อนไข
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map((exp) => {
                      const catInfo = CATEGORY_MAP[exp.category] || CATEGORY_MAP.OTHER;
                      const CatIcon = catInfo.icon;

                      return (
                        <tr key={exp.id} className="hover:bg-ems-inset/40 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {exp.expense_no}
                          </td>
                          <td className="py-3 px-4 text-ems-muted font-mono">{exp.expense_date}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border ${catInfo.color}`}
                            >
                              <CatIcon className="w-3 h-3" />
                              <span>{catInfo.label}</span>
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-ems-ink text-sm">{exp.title}</div>
                            {exp.notes && (
                              <div className="text-[11px] text-ems-muted line-clamp-1">{exp.notes}</div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {exp.vehicle_code ? (
                              <span className="inline-flex items-center gap-1 font-bold text-sky-700 bg-sky-50 dark:bg-sky-950 px-2 py-0.5 rounded border border-sky-200 text-[10px]">
                                <Ambulance className="w-3 h-3" />
                                <span>{exp.vehicle_code}</span>
                              </span>
                            ) : (
                              <span className="text-ems-muted">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-ems-muted">
                            {exp.invoice_no || '-'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-black text-sm text-emerald-600 dark:text-emerald-400">
                            ฿{Number(exp.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-[11px] text-ems-muted">{exp.creator_name || 'Admin'}</span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => handleDeleteExpense(exp)}
                              className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-600 transition-colors"
                              title="ลบรายการนี้"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* View 2: Audit Logs */
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-ems-surface border border-ems-border p-3.5 rounded-2xl shadow-sm">
            <div className="flex items-center gap-2 flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-ems-muted shrink-0" />
              <input
                type="text"
                placeholder="ค้นหา Action, ผู้ใช้, รายละเอียด, IP..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                className="w-full bg-ems-inset border border-ems-border rounded-xl px-3 py-1.5 text-xs text-ems-ink focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={auditEntity}
                onChange={(e) => setAuditEntity(e.target.value)}
                className="bg-ems-inset border border-ems-border text-xs font-bold text-ems-ink px-3 py-1.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="ALL">ทุกหมวดหมู่ (All Entities)</option>
                <option value="system_expenses">ค่าใช้จ่าย (system_expenses)</option>
                <option value="users">ผู้ใช้งานและรหัสผ่าน (users)</option>
              </select>
            </div>
          </div>

          <div className="bg-ems-surface border border-ems-border rounded-3xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-ems-inset/80 border-b border-ems-border text-ems-muted font-bold">
                    <th className="py-3 px-4">วันและเวลา (Timestamp)</th>
                    <th className="py-3 px-4">ผู้ดำเนินการ (User)</th>
                    <th className="py-3 px-4">การกระทำ (Action)</th>
                    <th className="py-3 px-4">ข้อมูล / Entity</th>
                    <th className="py-3 px-4">รายละเอียด (Audit Details)</th>
                    <th className="py-3 px-4">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ems-border/60">
                  {filteredAuditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-ems-muted">
                        ไม่พบประวัติ Audit Log ตามเงื่อนไข
                      </td>
                    </tr>
                  ) : (
                    filteredAuditLogs.map((log) => {
                      let parsedDetails: any = null;
                      try {
                        parsedDetails = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;
                      } catch {
                        parsedDetails = log.details;
                      }

                      return (
                        <tr key={log.id} className="hover:bg-ems-inset/40 transition-colors">
                          <td className="py-3 px-4 font-mono text-ems-muted whitespace-nowrap">
                            {new Date(log.created_at).toLocaleString('th-TH')}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-ems-ink">{log.user_name || 'SYSTEM'}</span>
                            {log.user_id && (
                              <span className="block text-[10px] text-ems-muted">ID: {log.user_id}</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                log.action.includes('CREATE')
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                                  : log.action.includes('DELETE')
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-400'
                                  : log.action.includes('LOGIN')
                                  ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-400'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400'
                              }`}
                            >
                              {log.action}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-sky-700">
                            {log.entity} {log.entity_id ? `(#${log.entity_id})` : ''}
                          </td>
                          <td className="py-3 px-4 max-w-xs md:max-w-md">
                            {parsedDetails ? (
                              <div className="bg-ems-inset p-2 rounded-xl border border-ems-border font-mono text-[11px] overflow-x-auto text-slate-700 dark:text-slate-300">
                                {typeof parsedDetails === 'object' ? (
                                  <div className="space-y-0.5">
                                    {Object.entries(parsedDetails).map(([k, v]) => (
                                      <div key={k} className="flex gap-1.5">
                                        <span className="text-slate-400 font-semibold">{k}:</span>
                                        <span className="font-bold text-ems-ink truncate">{String(v)}</span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  String(parsedDetails)
                                )}
                              </div>
                            ) : (
                              <span className="text-ems-muted">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-ems-muted">{log.ip_address || '-'}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Expense */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 md:p-7 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 rounded-xl">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    บันทึกค่าใช้จ่ายใหม่ (Record Expense)
                  </h3>
                  <p className="text-[11px] text-slate-500">ข้อมูลจะถูกบันทึกประวัติลงใน Audit Log โดยอัตโนมัติ</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-3.5 text-xs">
              {/* Category */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                  หมวดหมู่ค่าใช้จ่าย <span className="text-rose-500">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {Object.entries(CATEGORY_MAP).map(([key, item]) => (
                    <option key={key} value={key}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Title / Description */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                  รายการค่าใช้จ่าย <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ค่าน้ำมันดีเซล B7 รถ EMS-01 (ภารกิจส่งต่อ รพ.ระยอง)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Amount & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                    จำนวนเงิน (บาท) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-bold text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                    วันที่ตามใบเสร็จ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Vehicle & Invoice No */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                    ผูกกับรถพยาบาล (ถ้ามี)
                  </label>
                  <select
                    value={vehicleId}
                    onChange={(e) => setVehicleId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="">-- ไม่ระบุ --</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.vehicle_code} ({v.registration_no})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                    เลขที่ใบเสร็จ/ใบกำกับภาษี
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น INV-PTT-44012"
                    value={invoiceNo}
                    onChange={(e) => setInvoiceNo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">หมายเหตุเพิ่มเติม</label>
                <textarea
                  rows={2}
                  placeholder="รายละเอียดเพิ่มเติม หรือเหตุผลความจำเป็น"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/30 flex items-center gap-1.5"
                >
                  {submitting ? 'กำลังบันทึก…' : 'บันทึกและสร้าง Audit Log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
