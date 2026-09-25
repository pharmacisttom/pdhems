import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authFetch, clearIdentity } from '../services/auth';

describe('Cookie authentication client isolation',()=>{
  beforeEach(()=>{
    vi.stubGlobal('localStorage',{removeItem:vi.fn()});
    vi.stubGlobal('sessionStorage',{clear:vi.fn()});
    vi.stubGlobal('window',{dispatchEvent:vi.fn()});
  });
  it('sends same-origin cookies and CSRF header, never bearer credentials',async()=>{
    const fetch=vi.fn().mockResolvedValue(new Response('{}')); vi.stubGlobal('fetch',fetch);
    await authFetch('/api/missions',{headers:{Authorization:'Bearer stale'}});
    const options=fetch.mock.calls[0][1]; expect(options.credentials).toBe('same-origin'); expect(options.cache).toBe('no-store');
    expect(options.headers.get('Authorization')).toBeNull(); expect(options.headers.get('X-PDH-Request')).toBe('1');
  });
  it('clears identity and signals expiry without automatic administrator login',async()=>{
    const fetch=vi.fn().mockResolvedValue(new Response('{}',{status:401})); vi.stubGlobal('fetch',fetch);
    await authFetch('/api/missions'); expect(fetch).toHaveBeenCalledTimes(1);
    expect(localStorage.removeItem).toHaveBeenCalledWith('token'); expect(localStorage.removeItem).toHaveBeenCalledWith('pdh_ems_gps_queue');
    expect(sessionStorage.clear).toHaveBeenCalled(); expect(window.dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({type:'auth-expired'}));
  });
  it('rejects in-flight responses from a previous identity',async()=>{
    let resolve!: (r:Response)=>void;
    vi.stubGlobal('fetch',vi.fn(()=>new Promise<Response>(r=>{resolve=r;})));
    const pending=authFetch('/api/missions'); clearIdentity(); resolve(new Response('{}'));
    await expect(pending).rejects.toThrow('Session changed');
  });
  it('network failure does not silently clear identity or replay a write',async()=>{
    const fetch=vi.fn().mockRejectedValue(new Error('offline'));vi.stubGlobal('fetch',fetch);
    await expect(authFetch('/api/missions',{method:'POST'})).rejects.toThrow('offline');
    expect(fetch).toHaveBeenCalledTimes(1); expect(window.dispatchEvent).not.toHaveBeenCalled();
  });
});
