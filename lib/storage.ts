export const STORAGE_KEY = 'itc_autosave_v1';

export function saveToStorage(payload: unknown){
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(payload)); } catch(e) { console.warn('Autosave failed', e); }
}
export function loadFromStorage<T=any>(): T | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) as T : null;
  } catch { return null; }
}
export function clearStorage(){
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}
