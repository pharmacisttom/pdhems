/**
 * Screen WakeLock Service
 * Keeps device screen illuminated while driving in ambulance
 */

class WakeLockService {
  private wakeLock: any = null;
  private isRequested: boolean = false;

  public async requestLock(): Promise<boolean> {
    this.isRequested = true;
    if (typeof window === 'undefined' || !('wakeLock' in navigator)) {
      return false;
    }

    try {
      this.wakeLock = await (navigator as any).wakeLock.request('screen');
      this.wakeLock.addEventListener('release', () => {
        this.wakeLock = null;
        if (this.isRequested && document.visibilityState === 'visible') {
          this.requestLock();
        }
      });
      return true;
    } catch (err) {
      console.warn('WakeLock request failed:', err);
      return false;
    }
  }

  public async releaseLock(): Promise<void> {
    this.isRequested = false;
    if (this.wakeLock) {
      try {
        await this.wakeLock.release();
      } catch (err) {
        // ignore
      }
      this.wakeLock = null;
    }
  }

  public isLocked(): boolean {
    return !!this.wakeLock;
  }
}

export const wakeLockService = new WakeLockService();
