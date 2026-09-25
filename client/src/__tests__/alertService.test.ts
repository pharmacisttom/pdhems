import { describe, it, expect, vi, beforeEach } from 'vitest';
import Swal from 'sweetalert2';
import {
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
} from '../services/alertService';

const { mockFire, mockMixin } = vi.hoisted(() => {
  const mockFire = vi.fn().mockResolvedValue({ isConfirmed: true, value: true });
  const mockMixin = vi.fn(() => ({
    fire: mockFire,
  }));
  return { mockFire, mockMixin };
});

// Mock SweetAlert2 methods
vi.mock('sweetalert2', () => {
  const mockClose = vi.fn();
  const mockShowLoading = vi.fn();

  return {
    default: {
      fire: mockFire,
      close: mockClose,
      showLoading: mockShowLoading,
      mixin: mockMixin,
      stopTimer: vi.fn(),
      resumeTimer: vi.fn(),
    },
  };
});

describe('SweetAlert2 Central Alert Service (alertService)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('showSuccess triggers darkSwal with success icon and title', async () => {
    await showSuccess('สำเร็จ', 'บันทึกข้อมูลเรียบร้อย');
    expect(mockFire).toHaveBeenCalledWith(
      expect.objectContaining({
        icon: 'success',
        title: 'สำเร็จ',
      })
    );
  });

  it('showError sanitizes technical SQL/stack traces for user safety', async () => {
    const rawSqlError = 'Error: SQLSTATE[42000]: Syntax error or access violation at db.ts:40';
    await showError('เกิดข้อผิดพลาด', rawSqlError);
    expect(mockFire).toHaveBeenCalledWith(
      expect.objectContaining({
        icon: 'error',
        text: 'กรุณาลองใหม่อีกครั้ง หรือติดต่อผู้ดูแลระบบ',
      })
    );
  });

  it('showWarning triggers warning alert', async () => {
    await showWarning('แจ้งเตือน', 'กรุณาตรวจสอบข้อมูล');
    expect(mockFire).toHaveBeenCalledWith(
      expect.objectContaining({
        icon: 'warning',
        title: 'แจ้งเตือน',
      })
    );
  });

  it('showInfo triggers info alert', async () => {
    await showInfo('ข้อมูล', 'ระบบอยู่ในโหมดออฟไลน์');
    expect(mockFire).toHaveBeenCalledWith(
      expect.objectContaining({
        icon: 'info',
        title: 'ข้อมูล',
      })
    );
  });

  it('showToast creates a non-blocking toast', () => {
    showToast('บันทึกสำเร็จ', 'success');
    expect(Swal.mixin).toHaveBeenCalled();
  });

  it('confirmAction prompts user for confirmation', async () => {
    const result = await confirmAction({
      title: 'ยืนยัน?',
      text: 'ข้อความยืนยัน',
    });
    expect(result).toBe(true);
  });

  it('confirmDanger prompts with danger theme', async () => {
    const result = await confirmDanger({
      title: 'ยืนยันลบ?',
      text: 'ข้อมูลจะถูกลบถาวร',
    });
    expect(result).toBe(true);
  });

  it('confirmDeparture displays formatted departure checklist summary', async () => {
    const result = await confirmDeparture({
      vehicleCode: 'EMS-01',
      driverName: 'นายสมชาย ดีมาก',
      crewCount: 3,
      destination: 'รพ.ศูนย์ราชบุรี',
    });
    expect(result).toBe(true);
  });
});
