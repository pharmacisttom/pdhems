import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  KeyRound,
  IdCard,
  Phone,
  Search,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Clock,
  Building2,
  Copy,
  Check,
  Eye,
  EyeOff,
  Filter,
  Sparkles,
  Lock,
} from 'lucide-react';
import Swal from 'sweetalert2';
import {
  fetchUsers,
  fetchRoles,
  createUser,
  updateUser,
  resetUserPassword,
  toggleUserStatus,
} from '../services/api';

export const UsersManagementPage: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Create User Modal
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [fullName, setFullName] = useState<string>('');
  const [roleId, setRoleId] = useState<number>(6); // Default DRIVER
  const [agency, setAgency] = useState<string>('โรงพยาบาลปลวกแดง');
  const [citizenId, setCitizenId] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [autoGenCredentials, setAutoGenCredentials] = useState<boolean>(true);
  const [customUsername, setCustomUsername] = useState<string>('');
  const [customPassword, setCustomPassword] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Credential Slip Modal (shown after creation or reset)
  const [credentialSlip, setCredentialSlip] = useState<{
    username: string;
    temporary_password: string;
    full_name?: string;
    citizen_id?: string;
    phone?: string;
    role?: string;
  } | null>(null);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [revealedCid, setRevealedCid] = useState<Record<number, boolean>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [userList, roleList] = await Promise.all([fetchUsers(), fetchRoles()]);
      setUsers(userList);
      setRoles(roleList);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const toggleRevealCid = (userId: number) => {
    setRevealedCid((prev) => ({ ...prev, [userId]: !prev[userId] }));
  };

  // Submit Create User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCid = citizenId.replace(/\D/g, '');
    if (cleanCid.length !== 13) {
      await Swal.fire({
        icon: 'warning',
        title: 'เลขบัตรประชาชนไม่ถูกต้อง',
        text: 'เลขประจำตัวประชาชนต้องเป็นตัวเลข 13 หลัก',
      });
      return;
    }

    const cleanPhone = phoneNumber.replace(/[\s-]/g, '');
    if (!cleanPhone || cleanPhone.length < 9) {
      await Swal.fire({
        icon: 'warning',
        title: 'เบอร์โทรศัพท์ไม่ถูกต้อง',
        text: 'กรุณากรอกเบอร์โทรศัพท์ติดต่อ 9-10 หลัก',
      });
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        full_name: fullName.trim(),
        role_id: Number(roleId),
        agency_affiliation: agency,
        citizen_id: cleanCid,
        phone: cleanPhone,
      };

      if (!autoGenCredentials) {
        if (customUsername.trim()) payload.custom_username = customUsername.trim();
        if (customPassword.trim()) payload.custom_password = customPassword.trim();
      }

      const res = await createUser(payload);
      if (!res.success) {
        throw new Error(res.message || 'สร้างผู้ใช้งานไม่สำเร็จ');
      }

      setShowCreateModal(false);
      // Reset form fields
      setFullName('');
      setCitizenId('');
      setPhoneNumber('');
      setCustomUsername('');
      setCustomPassword('');

      // Show generated credentials slip modal
      setCredentialSlip({
        username: res.data.username,
        temporary_password: res.data.temporary_password,
        full_name: res.data.full_name,
        citizen_id: res.data.citizen_id,
        phone: res.data.phone,
        role: res.data.role,
      });

      await loadData();
    } catch (err: any) {
      await Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  // Reset Password for User
  const handleResetPassword = async (user: any) => {
    const result = await Swal.fire({
      icon: 'question',
      title: `รีเซ็ตรหัสผ่านสำหรับ ${user.full_name}?`,
      text: 'ระบบจะสร้างรหัสผ่านชั่วคราวใหม่ และบังคับให้ผู้ใช้ยืนยันตัวตนด้วยเลขบัตรประชาชน 13 หลัก และตั้งรหัสผ่านใหม่ในการเข้าใช้งานครั้งถัดไป',
      showCancelButton: true,
      confirmButtonText: '🔄 สุ่มรหัสผ่านใหม่',
      cancelButtonText: 'ยกเลิก',
    });

    if (!result.isConfirmed) return;

    try {
      const res = await resetUserPassword(user.id);
      if (!res.success) throw new Error(res.message);

      setCredentialSlip({
        username: res.data.username,
        temporary_password: res.data.temporary_password,
        full_name: user.full_name,
        citizen_id: user.citizen_id,
        phone: user.phone,
        role: user.role_name,
      });

      await loadData();
    } catch (err: any) {
      await Swal.fire({ icon: 'error', text: err.message });
    }
  };

  // Toggle user status
  const handleToggleStatus = async (user: any) => {
    const actionText = user.active ? 'ระงับการใช้งาน' : 'เปิดใช้งาน';
    const confirm = await Swal.fire({
      icon: 'warning',
      title: `ยืนยัน${actionText}ผู้ใช้?`,
      text: `บัญชี ${user.full_name} (${user.username})`,
      showCancelButton: true,
      confirmButtonText: actionText,
      cancelButtonText: 'ยกเลิก',
    });

    if (!confirm.isConfirmed) return;

    try {
      const res = await toggleUserStatus(user.id);
      if (!res.success) throw new Error(res.message);
      await loadData();
    } catch (err: any) {
      await Swal.fire({ icon: 'error', text: err.message });
    }
  };

  // Filtered Users
  const filteredUsers = users.filter((u) => {
    const matchSearch =
      !search ||
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.username?.toLowerCase().includes(search.toLowerCase()) ||
      u.citizen_id?.includes(search) ||
      u.phone?.includes(search) ||
      u.agency_affiliation?.toLowerCase().includes(search.toLowerCase());

    const matchRole = selectedRole === 'ALL' || u.role_name === selectedRole;
    const matchStatus =
      selectedStatus === 'ALL' ||
      (selectedStatus === 'ACTIVE' && u.active === 1) ||
      (selectedStatus === 'INACTIVE' && u.active === 0) ||
      (selectedStatus === 'EXPIRED' && u.is_password_expired);

    return matchSearch && matchRole && matchStatus;
  });

  // KPI counters
  const totalCount = users.length;
  const activeCount = users.filter((u) => u.active === 1).length;
  const expiredPasswordCount = users.filter((u) => u.is_password_expired).length;
  const mustChangeCount = users.filter((u) => u.effective_must_change).length;

  return (
    <div className="flex-1 flex flex-col p-4 md:p-6 bg-ems-canvas space-y-5 overflow-y-auto">
      {/* Page Title & Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-ems-surface border border-ems-border p-5 rounded-3xl shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-sky-100 dark:bg-sky-950/60 rounded-2xl text-sky-700 dark:text-sky-400">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-ems-ink">
                ระบบจัดการผู้ใช้งานและสิทธิ์ (User &amp; Role Management)
              </h1>
              <p className="text-xs text-ems-muted mt-0.5">
                เครือข่าย รพ.ปลวกแดง · กู้ภัยปลวกแดง · รพ.กรุงเทพปลวกแดง | ตรวจสอบอัตลักษณ์ 13 หลัก และนโยบายเปลี่ยนรหัสผ่านทุก 3 เดือน (90 วัน)
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-500 hover:to-teal-500 text-white font-bold text-sm rounded-2xl shadow-lg shadow-sky-600/20 flex items-center justify-center gap-2 transition-transform active:scale-95 shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ เพิ่มผู้ใช้งานใหม่ (Gen User &amp; Password)</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-ems-surface border border-ems-border p-4 rounded-2xl shadow-sm">
          <span className="text-xs font-semibold text-ems-muted">ผู้ใช้งานทั้งหมด</span>
          <div className="text-2xl md:text-3xl font-black text-ems-ink mt-1">{totalCount}</div>
          <span className="text-[11px] text-ems-muted">บัญชีในระบบ</span>
        </div>

        <div className="bg-ems-surface border border-ems-border p-4 rounded-2xl shadow-sm">
          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">กำลังใช้งาน (Active)</span>
          <div className="text-2xl md:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{activeCount}</div>
          <span className="text-[11px] text-ems-muted">พร้อมปฏิบัติหน้าที่</span>
        </div>

        <div className="bg-ems-surface border border-ems-border p-4 rounded-2xl shadow-sm">
          <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">ต้องเปลี่ยนรหัสผ่าน / ครั้งแรก</span>
          <div className="text-2xl md:text-3xl font-black text-amber-600 dark:text-amber-400 mt-1">{mustChangeCount}</div>
          <span className="text-[11px] text-ems-muted">รอการยืนยันตัวตน</span>
        </div>

        <div className="bg-ems-surface border border-ems-border p-4 rounded-2xl shadow-sm">
          <span className="text-xs font-semibold text-rose-700 dark:text-rose-400">ครบกำหนด 90 วัน (3 เดือน)</span>
          <div className="text-2xl md:text-3xl font-black text-rose-600 dark:text-rose-400 mt-1">{expiredPasswordCount}</div>
          <span className="text-[11px] text-ems-muted">นโยบายความปลอดภัย</span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-ems-surface border border-ems-border p-3.5 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-ems-muted shrink-0" />
          <input
            type="text"
            placeholder="ค้นหาชื่อ, username, เลขบัตร 13 หลัก, เบอร์โทร, สังกัด..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-ems-inset border border-ems-border rounded-xl px-3 py-1.5 text-xs text-ems-ink focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Role Filter */}
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="bg-ems-inset border border-ems-border text-xs font-bold text-ems-ink px-3 py-1.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="ALL">สิทธิ์ทั้งหมด (All Roles)</option>
            {roles.map((r) => (
              <option key={r.id} value={r.name}>
                {r.name} ({r.description?.slice(0, 20)}...)
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-ems-inset border border-ems-border text-xs font-bold text-ems-ink px-3 py-1.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="ALL">สถานะทั้งหมด</option>
            <option value="ACTIVE">เปิดใช้งาน (Active)</option>
            <option value="INACTIVE">ระงับการใช้งาน (Inactive)</option>
            <option value="EXPIRED">รหัสผ่านหมดอายุ 90 วัน</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-ems-surface border border-ems-border rounded-3xl shadow-sm overflow-hidden flex-1 flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-ems-inset/80 border-b border-ems-border text-ems-muted font-bold">
                <th className="py-3 px-4">ผู้ใช้งานและสังกัด</th>
                <th className="py-3 px-4">ชื่อผู้ใช้ (Username)</th>
                <th className="py-3 px-4">สิทธิ์การใช้งาน (Role)</th>
                <th className="py-3 px-4">เลขบัตรประชาชน 13 หลัก</th>
                <th className="py-3 px-4">เบอร์โทรศัพท์</th>
                <th className="py-3 px-4">อายุรหัสผ่าน (ทุก 3 เดือน)</th>
                <th className="py-3 px-4">สถานะ</th>
                <th className="py-3 px-4 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ems-border/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-ems-muted">
                    กำลังโหลดข้อมูลผู้ใช้งาน…
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-ems-muted">
                    ไม่พบข้อมูลผู้ใช้งานตามเงื่อนไขที่ค้นหา
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isCidRevealed = revealedCid[u.id];
                  const displayCid = isCidRevealed ? u.raw_citizen_id : u.masked_citizen_id;

                  return (
                    <tr key={u.id} className="hover:bg-ems-inset/40 transition-colors">
                      {/* Name & Agency */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-ems-ink text-sm">{u.full_name}</div>
                        <div className="flex items-center gap-1 text-[11px] text-sky-700 dark:text-sky-400 font-medium">
                          <Building2 className="w-3 h-3" />
                          <span>{u.agency_affiliation || 'โรงพยาบาลปลวกแดง'}</span>
                        </div>
                      </td>

                      {/* Username */}
                      <td className="py-3 px-4 font-mono font-bold text-ems-ink">
                        <span>{u.username}</span>
                        {u.employee_code && (
                          <span className="block text-[10px] text-ems-muted font-normal">{u.employee_code}</span>
                        )}
                      </td>

                      {/* Role */}
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-lg font-bold text-[10px] border ${
                            u.role_name === 'SUPER_ADMIN'
                              ? 'bg-rose-500/10 text-rose-700 border-rose-500/30'
                              : u.role_name === 'DISPATCHER'
                              ? 'bg-purple-500/10 text-purple-700 border-purple-500/30'
                              : u.role_name === 'DRIVER'
                              ? 'bg-sky-500/10 text-sky-700 border-sky-500/30'
                              : 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30'
                          }`}
                        >
                          {u.role_name}
                        </span>
                      </td>

                      {/* 13-digit Citizen ID */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-mono text-xs">
                          <IdCard className="w-3.5 h-3.5 text-ems-muted shrink-0" />
                          <span className="font-bold">{displayCid || 'ยังไม่ระบุ'}</span>
                          {u.raw_citizen_id && (
                            <button
                              onClick={() => toggleRevealCid(u.id)}
                              className="p-1 hover:text-sky-600 transition-colors"
                              title={isCidRevealed ? 'ซ่อนเลขบัตร' : 'ดูเลขบัตรเต็ม'}
                            >
                              {isCidRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="py-3 px-4 font-mono">
                        <div className="flex items-center gap-1 text-xs">
                          <Phone className="w-3 h-3 text-ems-muted" />
                          <span>{u.phone || '-'}</span>
                        </div>
                      </td>

                      {/* Password Expiration Status (90 days policy) */}
                      <td className="py-3 px-4">
                        {u.is_password_expired ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200">
                            <AlertTriangle className="w-3 h-3" />
                            <span>หมดอายุ (เกิน 90 วัน)</span>
                          </span>
                        ) : u.effective_must_change ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200">
                            <Clock className="w-3 h-3" />
                            <span>รหัสชั่วคราว (รอเปลี่ยน)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200">
                            <CheckCircle className="w-3 h-3" />
                            <span>เหลือ {u.days_until_expiration} วัน</span>
                          </span>
                        )}
                      </td>

                      {/* Active Status */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            u.active
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                              : 'bg-slate-500/10 text-slate-500'
                          }`}
                        >
                          {u.active ? 'ใช้งานปกติ' : 'ระงับการใช้งาน'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Reset Password */}
                          <button
                            onClick={() => handleResetPassword(u)}
                            className="p-1.5 rounded-xl hover:bg-sky-50 dark:hover:bg-sky-950 text-sky-600 transition-colors border border-transparent hover:border-sky-200"
                            title="สุ่มรหัสผ่านใหม่ (Reset Password)"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>

                          {/* Toggle Active/Inactive */}
                          <button
                            onClick={() => handleToggleStatus(u)}
                            className={`p-1.5 rounded-xl transition-colors border border-transparent ${
                              u.active
                                ? 'hover:bg-rose-50 text-rose-600 hover:border-rose-200'
                                : 'hover:bg-emerald-50 text-emerald-600 hover:border-emerald-200'
                            }`}
                            title={u.active ? 'ระงับบัญชี' : 'เปิดใช้งานบัญชี'}
                          >
                            {u.active ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create User with Auto Gen & 13-digit Citizen ID */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 md:p-7 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-sky-100 dark:bg-sky-950 text-sky-600 rounded-xl">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    สร้างผู้ใช้งานใหม่ (Gen User &amp; Password)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    ระบบจะสร้าง Username และ รหัสผ่านชั่วคราวให้อัตโนมัติ
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
              {/* Full Name */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                  ชื่อ-นามสกุล บุคลากร <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น นายธนวัฒน์ รักชาติ"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              {/* Role & Agency */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                    สิทธิ์การใช้งาน (Role) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={roleId}
                    onChange={(e) => setRoleId(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} - {r.description?.slice(0, 25)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                    สังกัดหน่วยงาน <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={agency}
                    onChange={(e) => setAgency(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  >
                    <option value="โรงพยาบาลปลวกแดง">โรงพยาบาลปลวกแดง</option>
                    <option value="มูลนิธิกู้ภัยอำเภอปลวกแดง">มูลนิธิกู้ภัยอำเภอปลวกแดง</option>
                    <option value="โรงพยาบาลกรุงเทพปลวกแดง">โรงพยาบาลกรุงเทพปลวกแดง</option>
                    <option value="ศูนย์สั่งการ EMS ปลวกแดง">ศูนย์สั่งการ EMS ปลวกแดง</option>
                    <option value="อบต.มาบยางพร">อบต.มาบยางพร</option>
                  </select>
                </div>
              </div>

              {/* 13-digit Thai Citizen ID */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1 flex items-center justify-between">
                  <span>เลขประจำตัวประชาชน 13 หลัก <span className="text-rose-500">*</span></span>
                  <span className="text-[10px] text-sky-600 font-semibold">ใช้ยืนยันตัวตนครั้งแรก</span>
                </label>
                <div className="relative">
                  <IdCard className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    maxLength={13}
                    placeholder="กรอกตัวเลข 13 หลัก (เช่น 1219900123456)"
                    value={citizenId}
                    onChange={(e) => setCitizenId(e.target.value.replace(/\D/g, ''))}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-sm tracking-wider focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
                {citizenId && citizenId.length !== 13 && (
                  <p className="text-[10px] text-amber-600 mt-1">กรุณากรอกให้ครบ 13 หลัก (ปัจจุบัน {citizenId.length}/13 หลัก)</p>
                )}
              </div>

              {/* Phone number */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1 flex items-center justify-between">
                  <span>เบอร์โทรศัพท์มือถือ <span className="text-rose-500">*</span></span>
                  <span className="text-[10px] text-sky-600 font-semibold">ใช้ยืนยันตัวตนคู่กับเลขบัตร</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="tel"
                    required
                    placeholder="เช่น 081-111-2222"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Auto Gen toggle */}
              <div className="p-3 bg-sky-50 dark:bg-sky-950/40 rounded-2xl border border-sky-200 dark:border-sky-800 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-sky-900 dark:text-sky-300">
                  <input
                    type="checkbox"
                    checked={autoGenCredentials}
                    onChange={(e) => setAutoGenCredentials(e.target.checked)}
                    className="rounded accent-sky-600"
                  />
                  <Sparkles className="w-4 h-4 text-sky-600" />
                  <span>ให้ระบบสุ่มสร้าง Username และ รหัสผ่านชั่วคราวให้อัตโนมัติ (แนะนำ)</span>
                </label>

                {!autoGenCredentials && (
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-sky-200 dark:border-sky-800">
                    <div>
                      <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">กำหนด Username:</span>
                      <input
                        type="text"
                        placeholder="เช่น somchai_d"
                        value={customUsername}
                        onChange={(e) => setCustomUsername(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-xs mt-1"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">กำหนดรหัสผ่านชั่วคราว:</span>
                      <input
                        type="password"
                        placeholder="อย่างน้อย 8 ตัวอักษร"
                        value={customPassword}
                        onChange={(e) => setCustomPassword(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-xs mt-1"
                      />
                    </div>
                  </div>
                )}
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
                  className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-sky-600/30 flex items-center gap-1.5"
                >
                  {submitting ? 'กำลังสร้าง…' : 'สร้างผู้ใช้งานและออกรหัส'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Credential Slip (Print/Copy Slip for New User / Reset Password) */}
      {credentialSlip && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 border-2 border-emerald-500 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-700 pb-3">
              <div className="p-3 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 rounded-2xl">
                <Check className="w-6 h-6 stroke-[3]" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  ข้อมูลการเข้าสู่ระบบเริ่มต้น
                </h3>
                <p className="text-xs text-slate-500">สำหรับส่งมอบให้บุคลากรเข้าใช้งานครั้งแรก</p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <span className="text-slate-500">ชื่อบุคลากร:</span>
                <span className="font-bold text-slate-900 dark:text-white font-sans">{credentialSlip.full_name}</span>
              </div>

              {/* Username */}
              <div className="flex items-center justify-between">
                <span className="text-slate-500">ชื่อผู้ใช้งาน (Username):</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-sky-600 text-sm">{credentialSlip.username}</span>
                  <button
                    onClick={() => handleCopy(credentialSlip.username, 'user')}
                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded"
                    title="คัดลอก"
                  >
                    {copiedKey === 'user' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                  </button>
                </div>
              </div>

              {/* Temporary Password */}
              <div className="flex items-center justify-between">
                <span className="text-slate-500">รหัสผ่านชั่วคราว:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-rose-600 text-sm bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded border border-rose-200">
                    {credentialSlip.temporary_password}
                  </span>
                  <button
                    onClick={() => handleCopy(credentialSlip.temporary_password, 'pass')}
                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded"
                    title="คัดลอกรหัสผ่าน"
                  >
                    {copiedKey === 'pass' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                  </button>
                </div>
              </div>

              {/* Citizen ID for Verification */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
                <span className="text-slate-500">เลขอัตลักษณ์ (13 หลัก):</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{credentialSlip.citizen_id}</span>
              </div>

              {/* Phone Number */}
              <div className="flex items-center justify-between">
                <span className="text-slate-500">เบอร์โทรศัพท์ยืนยัน:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{credentialSlip.phone}</span>
              </div>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl text-[11px] text-amber-900 dark:text-amber-200 space-y-1">
              <div className="font-bold flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                <span>คำแนะนำการเข้าสู่ระบบครั้งแรก:</span>
              </div>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>ผู้ใช้งานต้องใช้ <b>เลขบัตรประชาชน 13 หลัก</b> และ <b>เบอร์โทรศัพท์</b> เพื่อยืนยันตัวตน</li>
                <li>ระบบจะบังคับให้เปลี่ยนรหัสผ่านใหม่ทันทีในครั้งแรก</li>
                <li>รหัสผ่านมีอายุ <b>90 วัน (3 เดือน)</b> และจะต้องเปลี่ยนใหม่เมื่อครบกำหนด</li>
              </ul>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setCredentialSlip(null)}
                className="w-full py-2.5 bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold text-sm rounded-xl hover:opacity-90 transition-opacity"
              >
                เสร็จสิ้น / ปิดหน้าต่างนี้
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
