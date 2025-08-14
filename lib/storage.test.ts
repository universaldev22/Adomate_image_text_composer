import { describe, it, expect, beforeEach } from 'vitest';
import { saveToStorage, loadFromStorage, clearStorage, STORAGE_KEY } from './storage';

globalThis.localStorage = {
  _data: new Map<string, string>(),
  getItem(key: string){ return (this._data as Map<string,string>).get(key) ?? null; },
  setItem(key: string, value: string){ (this._data as Map<string,string>).set(key, value); },
  removeItem(key: string){ (this._data as Map<string,string>).delete(key); },
  clear(){ (this._data as Map<string,string>).clear(); },
  key(i: number){ return Array.from((this._data as Map<string,string>).keys())[i] ?? null; },
  get length(){ return (this._data as Map<string,string>).size; },
} as unknown as Storage;

beforeEach(() => { clearStorage(); });

describe('storage helpers', () => {
  it('saves and loads payload', () => {
    const payload = { a: 1 };
    saveToStorage(payload);
    expect(loadFromStorage<typeof payload>()).toEqual(payload);
  });
  it('clears saved data', () => {
    saveToStorage({ b: 2 });
    clearStorage();
    expect(loadFromStorage()).toBeNull();
  });
});
