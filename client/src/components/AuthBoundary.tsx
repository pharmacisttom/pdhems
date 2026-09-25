import React, { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { authFetch, clearIdentity, SessionUser } from '../services/auth';
import { gpsTrackingEngine } from '../services/gpsTrackingEngine';

export function AuthBoundary({ children }: { children: (user: SessionUser) => React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('pdh_ems_gps_queue');
    const cleared = () => { gpsTrackingEngine.stopTracking(); gpsTrackingEngine.setMissionContext(null, null); setUser(null); };
    const expired = () => { setMessage('เซสชันสิ้นสุด กรุณาเข้าสู่ระบบอีกครั้ง ระหว่างภารกิจให้ติดต่อศูนย์สั่งการผ่านวิทยุหรือโทรศัพท์'); history.replaceState(null, '', '/login'); };
    const check = async () => {
      try {
        const res = await authFetch('/api/auth/me');
        if (res.ok) { const body = await res.json(); setUser(body.user); }
        else { cleared(); if(res.status !== 401) setMessage('ระบบไม่พร้อม กรุณาลองอีกครั้งหรือติดต่อศูนย์สั่งการ'); }
      } catch { cleared(); setMessage('ไม่สามารถเชื่อมต่อระบบได้ กรุณาลองอีกครั้ง'); }
      finally { setLoading(false); }
    };
    const pageshow = (e: PageTransitionEvent) => { if(e.persisted) { clearIdentity(); void check(); } };
    const visibility = () => { if(document.visibilityState === 'visible') void check(); };
    const storage = (e: StorageEvent) => { if(e.key === 'pdh_logout' || e.key === 'pdh_identity') { clearIdentity(); expired(); } };
    window.addEventListener('auth-cleared', cleared); window.addEventListener('auth-expired', expired);
    window.addEventListener('pageshow', pageshow); window.addEventListener('storage', storage);
    document.addEventListener('visibilitychange', visibility);
    void check();
    return () => { window.removeEventListener('auth-cleared', cleared); window.removeEventListener('auth-expired', expired); window.removeEventListener('pageshow',pageshow); window.removeEventListener('storage',storage); document.removeEventListener('visibilitychange',visibility); };
  }, []);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true);
    const data = new FormData(e.currentTarget);
    try {
      clearIdentity();
      const res=await authFetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:data.get('username'),password:data.get('password'),remember:data.get('remember')==='on'})});
      const body=await res.json();
      if(!res.ok) throw new Error(body.message || 'เข้าสู่ระบบไม่สำเร็จ');
      setUser(body.user); localStorage.setItem('pdh_identity',String(Date.now())); setMessage(''); history.replaceState(null,'','/');
    } catch(e) { await Swal.fire({icon:'error',title:'เข้าสู่ระบบไม่สำเร็จ',text:(e as Error).message}); }
    finally {setBusy(false);}
  }
  async function logout(all=false) {
    const answer=await Swal.fire({icon:'question',title:all?'ออกจากระบบทุกอุปกรณ์?':'ออกจากระบบ?',text:'หากอยู่ระหว่างภารกิจ ให้ประสานศูนย์สั่งการก่อนออกจากระบบ',showCancelButton:true,confirmButtonText:'ออกจากระบบ',cancelButtonText:'ยกเลิก'});
    if(!answer.isConfirmed) return;
    setBusy(true);
    try {
      const res=await authFetch(all?'/api/auth/logout-all':'/api/auth/logout',{method:'POST'});
      if(!res.ok && res.status!==401) throw new Error('ออกจากระบบไม่สำเร็จ กรุณาลองอีกครั้ง');
      clearIdentity(); localStorage.setItem('pdh_logout',String(Date.now())); history.replaceState(null,'','/login');
    } catch(e) { await Swal.fire({icon:'error',text:(e as Error).message}); }
    finally {setBusy(false);}
  }
  async function changePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const data=new FormData(e.currentTarget);
    if(data.get('newPassword')!==data.get('confirmPassword')) { await Swal.fire({icon:'error',text:'รหัสผ่านใหม่ไม่ตรงกัน'}); return; }
    setBusy(true);
    try {
      const res=await authFetch('/api/auth/change-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({currentPassword:data.get('currentPassword'),newPassword:data.get('newPassword')})});
      const body=await res.json(); if(!res.ok) throw new Error(body.message);
      clearIdentity(); localStorage.setItem('pdh_logout',String(Date.now())); history.replaceState(null,'','/login'); setMessage('เปลี่ยนรหัสผ่านแล้ว กรุณาเข้าสู่ระบบอีกครั้ง');
    } catch(e) { await Swal.fire({icon:'error',text:(e as Error).message}); } finally {setBusy(false);}
  }
  if(loading) return <main className="p-8 text-slate-100" role="status">กำลังตรวจสอบการเข้าสู่ระบบ…</main>;
  if(!user) return <main className="min-h-screen bg-slate-950 text-slate-100 grid place-items-center p-4"><form onSubmit={submit} className="w-full max-w-md bg-slate-900 p-6 rounded-2xl space-y-5">
    <h1 className="text-2xl font-bold">PDH SMART EMS</h1><p>ระบบบริหารจัดการ<br/>EMS Command &amp; Refer</p>
    {message && <p role="alert" className="text-amber-300">{message}</p>}
    <label className="block">รหัสผู้ใช้งาน / รหัสบุคลากร<input required name="username" autoComplete="username" maxLength={50} className="block w-full mt-2 p-3 rounded bg-slate-800"/></label>
    <label className="block">รหัสผ่าน<input required name="password" type="password" autoComplete="current-password" maxLength={72} className="block w-full mt-2 p-3 rounded bg-slate-800"/></label>
    <label className="flex gap-3 items-center"><input type="checkbox" name="remember"/>จดจำการเข้าสู่ระบบ เฉพาะอุปกรณ์ส่วนตัว</label>
    <button disabled={busy} className="w-full p-3 rounded bg-sky-600 disabled:opacity-50">{busy?'กำลังเข้าสู่ระบบ…':'เข้าสู่ระบบ'}</button>
  </form></main>;
  return <><section className="bg-slate-900 text-slate-100 p-3 flex flex-wrap gap-3 items-center" aria-label="บัญชีผู้ใช้งาน"><span>{user.full_name} · {user.employee_code || user.username} · {user.role} · {user.status}</span><button disabled={busy} onClick={()=>logout()} className="p-2 border rounded">ออกจากระบบ</button><button disabled={busy} onClick={()=>logout(true)} className="p-2 border rounded">ออกทุกอุปกรณ์</button>
    <details open={!!user.must_change_password} className="w-full"><summary>เปลี่ยนรหัสผ่าน{user.must_change_password?' (จำเป็นก่อนใช้งาน)':''}</summary><form onSubmit={changePassword} className="max-w-md space-y-3 py-3">{[['currentPassword','รหัสผ่านปัจจุบัน'],['newPassword','รหัสผ่านใหม่'],['confirmPassword','ยืนยันรหัสผ่านใหม่']].map(([name,label])=><label key={name} className="block">{label}<input name={name} type="password" required autoComplete={name==='currentPassword'?'current-password':'new-password'} className="block w-full bg-slate-800 p-2 rounded"/></label>)}<button disabled={busy} className="p-3 bg-sky-600 rounded">บันทึกรหัสผ่าน</button></form></details></section>{!user.must_change_password && <React.Fragment key={`${user.id}:${user.role}`}>{children(user)}</React.Fragment>}</>;
}
