import {
  Activity,
  UserRound,
  LogOut,
  KeyRound,
  ShieldCheck,
  X,
  ChevronDown,
  ArrowRight,
  ShieldAlert,
  IdCard,
  Phone,
  Clock,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { authFetch, clearIdentity, SessionUser } from '../services/auth';
import { verifyFirstLogin } from '../services/api';
import { gpsTrackingEngine } from '../services/gpsTrackingEngine';

export function AuthBoundary({ children }: { children: (user: SessionUser) => React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [accountOpen, setAccountOpen] = useState(false);

  // First Login & 90-day verification form states
  const [firstLoginCid, setFirstLoginCid] = useState('');
  const [firstLoginPhone, setFirstLoginPhone] = useState('');
  const [firstLoginCurrentPass, setFirstLoginCurrentPass] = useState('');
  const [firstLoginNewPass, setFirstLoginNewPass] = useState('');
  const [firstLoginConfirmPass, setFirstLoginConfirmPass] = useState('');

  useEffect(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('pdh_ems_gps_queue');
    const cleared = () => {
      gpsTrackingEngine.stopTracking();
      gpsTrackingEngine.setMissionContext(null, null);
      setUser(null);
    };
    const expired = () => {
      setMessage('เซสชันสิ้นสุด กรุณาเข้าสู่ระบบอีกครั้ง ระหว่างภารกิจให้ติดต่อศูนย์สั่งการผ่านวิทยุหรือโทรศัพท์');
      history.replaceState(null, '', '/login');
    };
    const check = async () => {
      try {
        const res = await authFetch('/api/auth/me');
        if (res.ok) {
          const body = await res.json();
          setUser(body.user);
        } else {
          cleared();
          if (res.status !== 401) setMessage('ระบบไม่พร้อม กรุณาลองอีกครั้งหรือติดต่อศูนย์สั่งการ');
        }
      } catch {
        cleared();
        setMessage('ไม่สามารถเชื่อมต่อระบบได้ กรุณาลองอีกครั้ง');
      } finally {
        setLoading(false);
      }
    };
    const pageshow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        clearIdentity();
        void check();
      }
    };
    const visibility = () => {
      if (document.visibilityState === 'visible') void check();
    };
    const storage = (e: StorageEvent) => {
      if (e.key === 'pdh_logout' || e.key === 'pdh_identity') {
        clearIdentity();
        expired();
      }
    };
    window.addEventListener('auth-cleared', cleared);
    window.addEventListener('auth-expired', expired);
    window.addEventListener('pageshow', pageshow);
    window.addEventListener('storage', storage);
    document.addEventListener('visibilitychange', visibility);
    void check();
    return () => {
      window.removeEventListener('auth-cleared', cleared);
      window.removeEventListener('auth-expired', expired);
      window.removeEventListener('pageshow', pageshow);
      window.removeEventListener('storage', storage);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, []);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const data = new FormData(e.currentTarget);
    try {
      clearIdentity();
      const res = await authFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: data.get('username'),
          password: data.get('password'),
          remember: data.get('remember') === 'on',
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || 'เข้าสู่ระบบไม่สำเร็จ');
      setUser(body.user);
      localStorage.setItem('pdh_identity', String(Date.now()));
      setMessage('');
      history.replaceState(null, '', '/');
    } catch (e) {
      await Swal.fire({ icon: 'error', title: 'เข้าสู่ระบบไม่สำเร็จ', text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function logout(all = false) {
    const answer = await Swal.fire({
      icon: 'question',
      title: all ? 'ออกจากระบบทุกอุปกรณ์?' : 'ออกจากระบบ?',
      text: 'หากอยู่ระหว่างภารกิจ ให้ประสานศูนย์สั่งการก่อนออกจากระบบ',
      showCancelButton: true,
      confirmButtonText: 'ออกจากระบบ',
      cancelButtonText: 'ยกเลิก',
    });
    if (!answer.isConfirmed) return;
    setBusy(true);
    try {
      const res = await authFetch(all ? '/api/auth/logout-all' : '/api/auth/logout', { method: 'POST' });
      if (!res.ok && res.status !== 401) throw new Error('ออกจากระบบไม่สำเร็จ กรุณาลองอีกครั้ง');
      clearIdentity();
      localStorage.setItem('pdh_logout', String(Date.now()));
      history.replaceState(null, '', '/login');
    } catch (e) {
      await Swal.fire({ icon: 'error', text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  // Handle First-Login & 90-day Password Expiration Verification
  async function handleFirstLoginVerification(e: React.FormEvent) {
    e.preventDefault();
    if (!firstLoginCid || !firstLoginPhone || !firstLoginCurrentPass || !firstLoginNewPass) {
      await Swal.fire({
        icon: 'warning',
        title: 'ข้อมูลไม่ครบถ้วน',
        text: 'กรุณากรอกเลขบัตรประชาชน 13 หลัก, เบอร์โทรศัพท์, รหัสผ่านปัจจุบัน และรหัสผ่านใหม่',
      });
      return;
    }

    if (firstLoginNewPass !== firstLoginConfirmPass) {
      await Swal.fire({ icon: 'error', title: 'รหัสผ่านไม่ตรงกัน', text: 'รหัสผ่านใหม่และยืนยันรหัสผ่านใหม่ไม่ตรงกัน' });
      return;
    }

    if (firstLoginNewPass.length < 8) {
      await Swal.fire({ icon: 'warning', title: 'รหัสผ่านสั้นเกินไป', text: 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 8 ตัวอักษร' });
      return;
    }

    setBusy(true);
    try {
      const res = await verifyFirstLogin({
        citizen_id: firstLoginCid,
        phone: firstLoginPhone,
        currentPassword: firstLoginCurrentPass,
        newPassword: firstLoginNewPass,
      });

      if (!res.success) {
        throw new Error(res.message || 'การยืนยันตัวตนล้มเหลว');
      }

      await Swal.fire({
        icon: 'success',
        title: 'ยืนยันตัวตนสำเร็จ!',
        text: 'ตั้งรหัสผ่านใหม่เรียบร้อยแล้ว ระบบเปิดให้เข้าใช้งานได้ทันที (รหัสผ่านนี้มีอายุ 90 วันตามนโยบายความปลอดภัย)',
        confirmButtonText: 'เข้าสู่ระบบทำงาน',
      });

      // Refresh user profile
      const meRes = await authFetch('/api/auth/me');
      if (meRes.ok) {
        const meBody = await meRes.json();
        setUser(meBody.user);
      }
    } catch (err: any) {
      await Swal.fire({
        icon: 'error',
        title: 'ยืนยันตัวตนไม่สำเร็จ',
        text: err.message,
      });
    } finally {
      setBusy(false);
    }
  }

  async function changePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    if (data.get('newPassword') !== data.get('confirmPassword')) {
      await Swal.fire({ icon: 'error', text: 'รหัสผ่านใหม่ไม่ตรงกัน' });
      return;
    }
    setBusy(true);
    try {
      const res = await authFetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: data.get('currentPassword'),
          newPassword: data.get('newPassword'),
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message);
      clearIdentity();
      localStorage.setItem('pdh_logout', String(Date.now()));
      history.replaceState(null, '', '/login');
      setMessage('เปลี่ยนรหัสผ่านแล้ว กรุณาเข้าสู่ระบบอีกครั้ง');
    } catch (e) {
      await Swal.fire({ icon: 'error', text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  if (loading)
    return (
      <main className="min-h-screen grid place-items-center bg-ems-canvas text-ems-ink" role="status">
        <div className="flex items-center gap-3">
          <Activity className="animate-pulse text-sky-700" />
          กำลังตรวจสอบการเข้าสู่ระบบ…
        </div>
      </main>
    );

  if (!user)
    return (
      <main className="ems-login">
        <aside className="ems-login-story">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden shadow-md bg-white border border-white/20 grid place-items-center flex-shrink-0">
              <img src="/logo.png" alt="PDH EMS Logo" className="w-full h-full object-cover rounded-full" />
            </div>
            <span className="font-bold tracking-wider">PDH SMART EMS</span>
          </div>
          <div className="my-auto py-16">
            <span className="ems-login-tag">EMS COMMAND &amp; REFER</span>
            <h1>
              เชื่อมต่อทุกภารกิจ
              <br />
              ดูแลทุกการส่งต่อ
            </h1>
            <p>
              ระบบประสานงานการแพทย์ฉุกเฉินและส่งต่อผู้ป่วย
              <br />
              โรงพยาบาลปลวกแดง · มูลนิธิกู้ภัยอำเภอปลวกแดง · รพ.กรุงเทพปลวกแดง
            </p>
            <div className="ems-pulse-line" aria-hidden="true">
              <Activity size={100} strokeWidth={1} />
            </div>
          </div>
          <p className="text-sm opacity-80 flex items-center gap-2">
            <ShieldCheck size={18} />
            สำหรับบุคลากรที่ได้รับอนุญาต
          </p>
        </aside>
        <div className="ems-login-form-wrap">
          <form onSubmit={submit} className="ems-login-form">
            <div className="w-16 h-16 rounded-full overflow-hidden shadow-sm border border-sky-100 bg-white grid place-items-center mb-2">
              <img src="/logo.png" alt="โลโก้ระบบการแพทย์ฉุกเฉิน โรงพยาบาลปลวกแดง" className="w-full h-full object-cover rounded-full" />
            </div>
            <p className="ems-eyebrow mt-4">ยินดีต้อนรับสู่ PDH SMART EMS</p>
            <h2 className="text-3xl font-bold text-ems-ink mt-2">เข้าสู่ระบบ</h2>
            <p className="text-ems-muted mt-2 mb-7">ลงชื่อเข้าใช้เพื่อเริ่มปฏิบัติงาน</p>
            {message && (
              <p role="alert" className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-amber-800 mb-5 text-sm">
                {message}
              </p>
            )}
            <label className="ems-field">
              รหัสผู้ใช้งาน / รหัสบุคลากร
              <input required name="username" autoComplete="username" placeholder="กรอกรหัสผู้ใช้งาน (เช่น admin, drv_1234)" maxLength={50} />
            </label>
            <label className="ems-field">
              รหัสผ่าน
              <input required name="password" type="password" autoComplete="current-password" placeholder="กรอกรหัสผ่าน" maxLength={72} />
            </label>
            <label className="flex gap-3 items-start text-sm text-ems-muted my-5">
              <input type="checkbox" name="remember" className="mt-1 accent-sky-700" />
              <span>
                จดจำการเข้าสู่ระบบ
                <br />
                <span className="text-xs">เฉพาะอุปกรณ์ส่วนตัว</span>
              </span>
            </label>
            <button disabled={busy} className="ems-primary-button w-full justify-center">
              {busy ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}
              <ArrowRight size={18} />
            </button>
            <div className="mt-5 p-3 rounded-xl bg-sky-50/80 border border-sky-200 text-xs text-sky-800">
              💡 <b>นโยบายความปลอดภัย:</b> ผู้ใช้งานใหม่จะได้รับรหัสผ่านชั่วคราวจากระบบ และต้องยืนยันตัวตนด้วยเลขบัตรประชาชน 13 หลักและเบอร์โทรศัพท์ในการเข้าสู่ระบบครั้งแรก พร้อมทั้งเปลี่ยนรหัสผ่านใหม่ทุก 3 เดือน
            </div>
            <p className="text-xs text-ems-muted text-center mt-4">พบปัญหาการใช้งาน กรุณาติดต่อผู้ดูแลระบบ รพ.ปลวกแดง</p>
          </form>
          <p className="text-xs text-ems-muted mt-8">PDH Smart EMS · เครือข่ายการแพทย์ฉุกเฉินอำเภอปลวกแดง</p>
        </div>
      </main>
    );

  // If user must change password (First Login or 90-day Expiration)
  if (user.must_change_password) {
    const isExpired = user.password_expired;
    return (
      <main className="min-h-screen bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl space-y-5">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-700 pb-4">
            <div className={`p-3 rounded-2xl ${isExpired ? 'bg-amber-100 text-amber-600' : 'bg-sky-100 text-sky-600'}`}>
              {isExpired ? <ShieldAlert className="w-8 h-8" /> : <ShieldCheck className="w-8 h-8" />}
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 dark:text-white">
                {isExpired ? 'รหัสผ่านหมดอายุ 90 วัน (ครบ 3 เดือน)' : 'ยืนยันตัวตนและตั้งรหัสผ่านครั้งแรก'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isExpired
                  ? 'ตามนโยบายความปลอดภัย ผู้ใช้งานต้องเปลี่ยนรหัสผ่านทุก 3 เดือน'
                  : 'กรุณายืนยันตัวตนด้วยเลขบัตรประชาชน 13 หลักและเบอร์โทรศัพท์'}
              </p>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-700/50 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-600 text-xs text-slate-600 dark:text-slate-300 space-y-1">
            <div className="flex items-center justify-between">
              <span>ผู้ใช้งาน: <b>{user.full_name}</b> ({user.username})</span>
              <span className="px-2 py-0.5 rounded bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300 font-bold">
                {user.role}
              </span>
            </div>
            {isExpired ? (
              <div className="text-amber-600 font-bold flex items-center gap-1 pt-1">
                <Clock className="w-3.5 h-3.5" />
                <span>รหัสผ่านเดิมมีอายุเกิน 90 วันแล้ว กรุณาตั้งรหัสผ่านใหม่เพื่อความปลอดภัย</span>
              </div>
            ) : (
              <div className="text-sky-600 font-medium pt-1">
                ℹ️ บัญชีนี้ถูกสร้างขึ้นด้วยรหัสผ่านชั่วคราว กรุณายืนยันข้อมูลอัตลักษณ์เพื่อเปิดใช้งาน
              </div>
            )}
          </div>

          <form onSubmit={handleFirstLoginVerification} className="space-y-3.5">
            {/* Citizen ID 13 digits */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1 flex items-center gap-1.5">
                <IdCard className="w-4 h-4 text-sky-600" />
                <span>เลขประจำตัวประชาชน 13 หลัก</span>
                <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={13}
                placeholder="กรอกเลขบัตรประชาชน 13 หลัก (เช่น 1219900123456)"
                value={firstLoginCid}
                onChange={(e) => setFirstLoginCid(e.target.value.replace(/\D/g, ''))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-sm tracking-wider focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1 flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-sky-600" />
                <span>เบอร์โทรศัพท์ที่ลงทะเบียนไว้</span>
                <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                required
                placeholder="กรอกเบอร์โทรศัพท์ (เช่น 081-111-2222)"
                value={firstLoginPhone}
                onChange={(e) => setFirstLoginPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            {/* Current / Temporary Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-slate-500" />
                <span>รหัสผ่านเดิม / รหัสผ่านชั่วคราวที่ได้รับ</span>
                <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                required
                placeholder="กรอกรหัสผ่านชั่วคราวที่ใช้ล็อกอิน"
                value={firstLoginCurrentPass}
                onChange={(e) => setFirstLoginCurrentPass(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            {/* New Password */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                  รหัสผ่านใหม่ (อย่างน้อย 8 ตัว)<span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="ตั้งรหัสผ่านใหม่"
                  value={firstLoginNewPass}
                  onChange={(e) => setFirstLoginNewPass(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                  ยืนยันรหัสผ่านใหม่<span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="พิมพ์รหัสผ่านใหม่อีกครั้ง"
                  value={firstLoginConfirmPass}
                  onChange={(e) => setFirstLoginConfirmPass(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={busy}
                className="w-full py-3 bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-500 hover:to-teal-500 text-white font-bold text-sm rounded-2xl shadow-lg transition-transform active:scale-98 flex items-center justify-center gap-2"
              >
                {busy ? <Activity className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>บันทึกการยืนยันตัวตนและเริ่มใช้งาน</span>
              </button>
            </div>
          </form>

          <div className="text-center pt-2">
            <button
              onClick={() => logout(false)}
              className="text-xs text-rose-600 hover:underline flex items-center justify-center gap-1 mx-auto"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>ยกเลิก / ออกจากระบบ</span>
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <>
      <section className="ems-account-bar" aria-label="บัญชีผู้ใช้งาน">
        <span className="ems-account-context">
          <ShieldCheck size={14} />
          <span>ระบบบริหารงานการแพทย์ฉุกเฉิน รพ.ปลวกแดง</span>
        </span>
        <div className="flex items-center gap-2 min-w-0">
          {/* Password Expiration Notice pill */}
          {user.password_days_remaining !== undefined && (
            <div
              className={`hidden sm:flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full font-bold border ${
                user.password_days_remaining <= 15
                  ? 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}
              title="รหัสผ่านมีกำหนดอัปเดตทุก 3 เดือน (90 วัน)"
            >
              <Clock size={12} />
              <span>รหัสผ่านหมดอายุในอีก {user.password_days_remaining} วัน</span>
            </div>
          )}

          <button
            className="ems-account-trigger"
            onClick={() => setAccountOpen(!accountOpen)}
            aria-expanded={accountOpen}
            aria-controls="account-panel"
          >
            <UserRound size={16} />
            <span className="truncate max-w-[150px] sm:max-w-[260px]">{user.full_name}</span>
            <ChevronDown size={14} />
          </button>
          <button disabled={busy} onClick={() => logout()} className="ems-logout-button">
            <LogOut size={14} />
            <span>ออกจากระบบ</span>
          </button>
        </div>

        {accountOpen && (
          <div className="ems-account-panel" id="account-panel">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold text-ems-ink">บัญชีผู้ใช้งาน</p>
                <p className="text-sm text-ems-muted mt-0.5">{user.full_name}</p>
                <p className="text-xs text-sky-700 font-semibold">{user.agency_affiliation || 'โรงพยาบาลปลวกแดง'}</p>
              </div>
              <button aria-label="ปิดข้อมูลบัญชี" onClick={() => setAccountOpen(false)} className="p-2 rounded-lg hover:bg-ems-inset">
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-wrap gap-2 my-3 text-xs">
              <span className="bg-sky-50 text-sky-800 px-2 py-1 rounded-md font-bold">{user.role}</span>
              <span className="bg-ems-inset px-2 py-1 rounded-md font-mono">{user.employee_code || user.username}</span>
              <span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md">{user.status}</span>
            </div>

            <div className="bg-ems-inset p-2.5 rounded-xl border border-ems-border text-xs space-y-1 mb-3">
              <div className="flex justify-between">
                <span className="text-ems-muted">เลขอัตลักษณ์:</span>
                <span className="font-mono font-bold">
                  {user.citizen_id
                    ? `${user.citizen_id.slice(0, 1)}-${user.citizen_id.slice(1, 5)}-XXXXX-${user.citizen_id.slice(10, 12)}-${user.citizen_id.slice(12)}`
                    : 'ยังไม่ได้ระบุ'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ems-muted">เบอร์โทรศัพท์:</span>
                <span className="font-medium">{user.phone || 'ยังไม่ได้ระบุ'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ems-muted">นโยบายรหัสผ่าน:</span>
                <span className="text-emerald-700 font-semibold">อัปเดตทุก 90 วัน (3 เดือน)</span>
              </div>
            </div>

            <details className="border-t border-ems-border pt-3">
              <summary className="font-semibold text-sm text-ems-ink cursor-pointer py-1.5 flex items-center justify-between">
                <span>เปลี่ยนรหัสผ่านส่วนตัว</span>
                <KeyRound size={14} className="text-ems-muted" />
              </summary>
              <form onSubmit={changePassword} className="space-y-2.5 pt-2">
                {[
                  ['currentPassword', 'รหัสผ่านปัจจุบัน'],
                  ['newPassword', 'รหัสผ่านใหม่ (อย่างน้อย 8 ตัว)'],
                  ['confirmPassword', 'ยืนยันรหัสผ่านใหม่'],
                ].map(([name, label]) => (
                  <label key={name} className="ems-field">
                    {label}
                    <input
                      name={name}
                      type="password"
                      required
                      minLength={name !== 'currentPassword' ? 8 : 1}
                      autoComplete={name === 'currentPassword' ? 'current-password' : 'new-password'}
                    />
                  </label>
                ))}
                <button disabled={busy} className="ems-primary-button w-full justify-center">
                  <KeyRound size={16} />
                  บันทึกรหัสผ่านใหม่
                </button>
              </form>
            </details>

            <button
              disabled={busy}
              onClick={() => logout(true)}
              className="mt-4 pt-3 border-t border-ems-border w-full flex items-center gap-2 text-sm text-rose-700 hover:text-rose-800"
            >
              <LogOut size={16} />
              ออกจากระบบทุกอุปกรณ์
            </button>
          </div>
        )}
      </section>
      {!user.must_change_password && <React.Fragment key={`${user.id}:${user.role}`}>{children(user)}</React.Fragment>}
    </>
  );
}
