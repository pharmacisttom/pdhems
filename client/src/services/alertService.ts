import Swal, { SweetAlertIcon, SweetAlertOptions } from 'sweetalert2';

/**
 * PDH SMART EMS — Central Standardized Alert & Confirmation Service (SweetAlert2)
 * Ensures: Touch-friendly, Mobile-first, Dark-mode harmonious, Accessible & Safe.
 */

// Custom Dark Mode Theme Configuration using Swal.mixin
const darkSwal = Swal.mixin({
  background: '#0f172a', // slate-900
  color: '#f8fafc', // slate-50
  customClass: {
    popup: 'border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-md p-6 max-w-sm sm:max-w-md w-11/12',
    title: 'text-lg font-bold text-white tracking-tight',
    htmlContainer: 'text-sm text-slate-300 leading-relaxed',
    confirmButton: 'px-5 py-2.5 bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-sky-600/30 transition-all min-h-[44px] min-w-[100px] flex items-center justify-center cursor-pointer m-1',
    cancelButton: 'px-5 py-2.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-300 font-semibold text-sm rounded-xl border border-slate-700 transition-all min-h-[44px] min-w-[100px] flex items-center justify-center cursor-pointer m-1',
    actions: 'flex gap-2 flex-wrap justify-center mt-4',
  },
  buttonsStyling: false,
});

// 1. Success Alert (Modal)
export async function showSuccess(title: string, text?: string): Promise<void> {
  await darkSwal.fire({
    icon: 'success',
    iconColor: '#10b981', // emerald-500
    title,
    text,
    confirmButtonText: 'ตกลง',
  });
}

// 2. Error Alert (User-friendly message, hides technical SQL/stack trace)
export async function showError(title: string, rawError?: any): Promise<void> {
  let userMessage = 'กรุณาลองใหม่อีกครั้ง หรือติดต่อผู้ดูแลระบบ';

  if (typeof rawError === 'string') {
    // Sanitize technical traces
    if (!rawError.includes('SQLSTATE') && !rawError.includes('Error: ') && !rawError.includes('at ')) {
      userMessage = rawError;
    }
  } else if (rawError?.message && typeof rawError.message === 'string') {
    if (!rawError.message.includes('SQLSTATE') && !rawError.message.includes('ECONNREFUSED')) {
      userMessage = rawError.message;
    }
  }

  console.error('[PDH Alert Service] Logged Technical Error:', rawError);

  await darkSwal.fire({
    icon: 'error',
    iconColor: '#ef4444', // rose-500
    title,
    text: userMessage,
    confirmButtonText: 'รับทราบ',
  });
}

// 3. Warning Alert
export async function showWarning(title: string, text?: string): Promise<void> {
  await darkSwal.fire({
    icon: 'warning',
    iconColor: '#f59e0b', // amber-500
    title,
    text,
    confirmButtonText: 'ตกลง',
  });
}

// 4. Info Alert
export async function showInfo(title: string, text?: string): Promise<void> {
  await darkSwal.fire({
    icon: 'info',
    iconColor: '#38bdf8', // sky-400
    title,
    text,
    confirmButtonText: 'ตกลง',
  });
}

// 5. Non-blocking Toast Notification (Top Right / Mobile Top, Auto-dismiss, Minimal touch)
export function showToast(
  title: string,
  icon: SweetAlertIcon = 'success',
  timer = 3000
): void {
  const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer,
    timerProgressBar: true,
    background: '#1e293b', // slate-800
    color: '#f8fafc',
    customClass: {
      popup: 'border border-slate-700/80 rounded-xl shadow-xl p-3 flex items-center gap-2 max-w-xs',
      title: 'text-xs font-semibold text-white',
    },
    didOpen: (toast) => {
      toast.addEventListener('mouseenter', Swal.stopTimer);
      toast.addEventListener('mouseleave', Swal.resumeTimer);
    },
  });

  Toast.fire({
    icon,
    title,
  });
}

// 6. Generic Confirmation Dialog
export async function confirmAction(options: {
  title: string;
  text?: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
  icon?: SweetAlertIcon;
}): Promise<boolean> {
  const result = await darkSwal.fire({
    icon: options.icon || 'question',
    iconColor: '#38bdf8',
    title: options.title,
    text: options.text,
    showCancelButton: true,
    confirmButtonText: options.confirmButtonText || 'ยืนยัน',
    cancelButtonText: options.cancelButtonText || 'ยกเลิก',
    reverseButtons: true,
    focusCancel: true,
  });

  return result.isConfirmed;
}

// 7. Dangerous / Irreversible Action Confirmation
export async function confirmDanger(options: {
  title: string;
  text?: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
}): Promise<boolean> {
  const result = await darkSwal.fire({
    icon: 'warning',
    iconColor: '#ef4444',
    title: options.title,
    text: options.text,
    showCancelButton: true,
    confirmButtonText: options.confirmButtonText || 'ยืนยันดำเนินการ',
    cancelButtonText: options.cancelButtonText || 'ยกเลิก',
    customClass: {
      popup: 'border border-rose-900/60 rounded-2xl shadow-2xl backdrop-blur-md p-6 max-w-sm sm:max-w-md w-11/12 bg-slate-900',
      title: 'text-lg font-bold text-white tracking-tight',
      htmlContainer: 'text-sm text-slate-300 leading-relaxed',
      confirmButton:
        'px-5 py-2.5 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-rose-600/30 transition-all min-h-[44px] min-w-[100px] flex items-center justify-center cursor-pointer m-1',
      cancelButton:
        'px-5 py-2.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-300 font-semibold text-sm rounded-xl border border-slate-700 transition-all min-h-[44px] min-w-[100px] flex items-center justify-center cursor-pointer m-1',
      actions: 'flex gap-2 flex-wrap justify-center mt-4',
    },
    reverseButtons: true,
    focusCancel: true,
  });

  return result.isConfirmed;
}

// 8. Departure Confirmation Dialog (Section 22)
export async function confirmDeparture(details: {
  vehicleCode: string;
  driverName: string;
  crewCount: number;
  destination: string;
}): Promise<boolean> {
  const htmlContent = `
    <div class="text-left text-xs space-y-2 mt-2 bg-slate-950/70 p-3 rounded-xl border border-slate-800">
      <div class="flex justify-between"><span class="text-slate-400">ยานพาหนะ:</span> <span class="font-bold text-white">🚑 ${details.vehicleCode}</span></div>
      <div class="flex justify-between"><span class="text-slate-400">พนักงานขับรถ:</span> <span class="font-semibold text-slate-200">👤 ${details.driverName}</span></div>
      <div class="flex justify-between"><span class="text-slate-400">ทีมผู้ปฏิบัติการ:</span> <span class="font-semibold text-sky-400">👥 ${details.crewCount} คน</span></div>
      <div class="flex justify-between"><span class="text-slate-400">ปลายทาง:</span> <span class="font-semibold text-amber-400 truncate max-w-[180px]">${details.destination}</span></div>
    </div>
    <div class="mt-3 text-xs text-emerald-400 flex items-center justify-center gap-1">
      <span>✓</span> ตรวจสอบความพร้อมก่อนออกปฏิบัติการ
    </div>
  `;

  const result = await darkSwal.fire({
    icon: 'question',
    iconColor: '#38bdf8',
    title: 'ยืนยันพร้อมออกเดินทาง?',
    html: htmlContent,
    showCancelButton: true,
    confirmButtonText: '🚀 ล้อหมุนออกเดินทาง',
    cancelButtonText: 'ตรวจสอบอีกครั้ง',
    reverseButtons: true,
  });

  return result.isConfirmed;
}

// 9. Handover Confirmation Dialog (Section 23)
export async function confirmHandoverPrompt(details: {
  missionNo: string;
  destination: string;
}): Promise<{ confirmed: boolean; receiverName?: string; notes?: string }> {
  const result = await darkSwal.fire({
    icon: 'success',
    iconColor: '#10b981',
    title: 'ยืนยันการส่งมอบภารกิจ',
    html: `
      <div class="text-left text-xs mb-3 text-slate-300">
        <div>ภารกิจ: <span class="font-bold text-white">${details.missionNo}</span></div>
        <div>ปลายทาง: <span class="font-bold text-sky-400">${details.destination}</span></div>
      </div>
      <div class="space-y-3 text-left">
        <div>
          <label class="block text-xs font-medium text-slate-300 mb-1">ชื่อเจ้าหน้าที่ผู้รับมอบ *</label>
          <input id="swal-receiver-name" class="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-emerald-500" placeholder="เช่น พว.สมหญิง / พยาบาลเวรรับส่ง" />
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-300 mb-1">บันทึกเพิ่มเติม (ถ้ามี)</label>
          <input id="swal-handover-notes" class="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-emerald-500" placeholder="เช่น สัญญาณชีพคงที่ ส่งมอบ ER สำเร็จ" />
        </div>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: '✓ บันทึกการส่งมอบ',
    cancelButtonText: 'ยกเลิก',
    customClass: {
      popup: 'border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-md p-6 max-w-sm sm:max-w-md w-11/12 bg-slate-900',
      title: 'text-lg font-bold text-white tracking-tight',
      htmlContainer: 'text-sm text-slate-300 leading-relaxed',
      confirmButton:
        'px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-emerald-600/30 transition-all min-h-[44px] min-w-[100px] flex items-center justify-center cursor-pointer m-1',
      cancelButton:
        'px-5 py-2.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-300 font-semibold text-sm rounded-xl border border-slate-700 transition-all min-h-[44px] min-w-[100px] flex items-center justify-center cursor-pointer m-1',
      actions: 'flex gap-2 flex-wrap justify-center mt-4',
    },
    preConfirm: () => {
      const nameInput = document.getElementById('swal-receiver-name') as HTMLInputElement;
      const notesInput = document.getElementById('swal-handover-notes') as HTMLInputElement;
      if (!nameInput || !nameInput.value.trim()) {
        Swal.showValidationMessage('กรุณาระบุชื่อเจ้าหน้าที่ผู้รับมอบ');
        return false;
      }
      return {
        receiverName: nameInput.value.trim(),
        notes: notesInput ? notesInput.value.trim() : '',
      };
    },
  });

  if (result.isConfirmed && result.value) {
    return {
      confirmed: true,
      receiverName: (result.value as any).receiverName,
      notes: (result.value as any).notes,
    };
  }

  return { confirmed: false };
}

// 10. Emergency Override Confirmation Dialog (Section 25)
export async function confirmEmergencyOverridePrompt(): Promise<{ confirmed: boolean; reason?: string }> {
  const result = await darkSwal.fire({
    icon: 'warning',
    iconColor: '#ef4444',
    title: '⚠️ Emergency Departure Override',
    html: `
      <p class="text-xs text-rose-300 mb-2">
        รายการตรวจเช็ครถยังไม่ครบถ้วน หรือมีเงื่อนไขติดค้าง สำหรับเหตุฉุกเฉินวิกฤตสามารถออกเดินทางทันทีได้
      </p>
      <div class="text-left mt-3">
        <label class="block text-xs font-semibold text-slate-200 mb-1">เหตุผลความจำเป็นเร่งด่วน (Audit Reason) *</label>
        <textarea id="swal-override-reason" rows="2" class="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-rose-500" placeholder="เช่น ผู้ป่วย CPR กลางทาง / ออกเหตุแดงด่วนฉุกเฉิน"></textarea>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: '⚡ ยืนยันออกเหตุฉุกเฉินทันที',
    cancelButtonText: 'กลับไปตรวจเช็ค',
    customClass: {
      popup: 'border border-rose-900/60 rounded-2xl shadow-2xl backdrop-blur-md p-6 max-w-sm sm:max-w-md w-11/12 bg-slate-900',
      title: 'text-lg font-bold text-white tracking-tight',
      htmlContainer: 'text-sm text-slate-300 leading-relaxed',
      confirmButton:
        'px-5 py-2.5 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-rose-600/30 transition-all min-h-[44px] min-w-[100px] flex items-center justify-center cursor-pointer m-1',
      cancelButton:
        'px-5 py-2.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-300 font-semibold text-sm rounded-xl border border-slate-700 transition-all min-h-[44px] min-w-[100px] flex items-center justify-center cursor-pointer m-1',
      actions: 'flex gap-2 flex-wrap justify-center mt-4',
    },
    preConfirm: () => {
      const reasonInput = document.getElementById('swal-override-reason') as HTMLTextAreaElement;
      if (!reasonInput || !reasonInput.value.trim()) {
        Swal.showValidationMessage('กรุณาระบุเหตุผลการ Override เพื่อบันทึกประวัติความปลอดภัย');
        return false;
      }
      return reasonInput.value.trim();
    },
  });

  return {
    confirmed: result.isConfirmed,
    reason: result.isConfirmed ? (result.value as string) : undefined,
  };
}

// 11. Loading Spinner Dialog
export function showLoading(title = 'กำลังประมวลผล...', text?: string): void {
  darkSwal.fire({
    title,
    text,
    allowOutsideClick: false,
    allowEscapeKey: false,
    showConfirmButton: false,
    didOpen: () => {
      Swal.showLoading();
    },
  });
}

// 12. Close Loading Dialog
export function closeLoading(): void {
  Swal.close();
}

export default {
  showSuccess,
  showError,
  showWarning,
  showInfo,
  showToast,
  confirmAction,
  confirmDanger,
  confirmDeparture,
  confirmHandoverPrompt,
  confirmEmergencyOverridePrompt,
  showLoading,
  closeLoading,
};
