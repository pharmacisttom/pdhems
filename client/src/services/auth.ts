export interface SessionUser { id: number; username: string; full_name: string; role: string; navigation: string[]; employee_code?: string; status: string; must_change_password: boolean; }
let generation = 0;
export function clearIdentity() {
  generation++;
  for (const key of ['token', 'user', 'pdh_ems_gps_queue']) localStorage.removeItem(key);
  sessionStorage.clear();
  window.dispatchEvent(new Event('auth-cleared'));
}
export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const started = generation;
  const headers = new Headers(init.headers);
  headers.delete('Authorization');
  headers.set('X-PDH-Request', '1');
  const response = await globalThis.fetch(input, { ...init, headers, credentials: 'same-origin', cache: 'no-store' });
  if (started !== generation) throw new Error('Session changed');
  if (response.status === 401 && !String(input).endsWith('/auth/login')) {
    clearIdentity();
    window.dispatchEvent(new Event('auth-expired'));
  }
  return response;
}
