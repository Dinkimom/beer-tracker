import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  parseStoredSelectedId,
  readSelectedId,
  writeSelectedId,
} from './selectedIdStorage';

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    key(index: number) {
      return [...map.keys()][index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
  };
}

describe('selectedIdStorage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('parseStoredSelectedId accepts JSON string, JSON number, and raw digits', () => {
    expect(parseStoredSelectedId('"42"')).toBe(42);
    expect(parseStoredSelectedId('42')).toBe(42);
    expect(parseStoredSelectedId('"7"')).toBe(7);
    expect(parseStoredSelectedId(null)).toBeNull();
    expect(parseStoredSelectedId('')).toBeNull();
    expect(parseStoredSelectedId('"x"')).toBeNull();
  });

  function stubWindow(session: Storage, local: Storage) {
    vi.stubGlobal('window', { localStorage: local, sessionStorage: session });
  }

  it('readSelectedId prefers sessionStorage over localStorage', () => {
    const session = memoryStorage();
    const local = memoryStorage();
    session.setItem('k', JSON.stringify('10'));
    local.setItem('k', JSON.stringify('20'));
    stubWindow(session, local);

    expect(readSelectedId('k')).toBe(10);
  });

  it('readSelectedId falls back to localStorage when session is empty', () => {
    const session = memoryStorage();
    const local = memoryStorage();
    local.setItem('k', JSON.stringify('20'));
    stubWindow(session, local);

    expect(readSelectedId('k')).toBe(20);
  });

  it('writeSelectedId mirrors into session and local; clear removes both', () => {
    const session = memoryStorage();
    const local = memoryStorage();
    stubWindow(session, local);

    writeSelectedId('k', 33);
    expect(session.getItem('k')).toBe(JSON.stringify('33'));
    expect(local.getItem('k')).toBe(JSON.stringify('33'));

    writeSelectedId('k', null);
    expect(session.getItem('k')).toBeNull();
    expect(local.getItem('k')).toBeNull();
  });

  it('two tab-like sessions stay independent when only local is shared', () => {
    const local = memoryStorage();
    const sessionA = memoryStorage();
    const sessionB = memoryStorage();

    stubWindow(sessionA, local);
    writeSelectedId('sprint', 100);

    stubWindow(sessionB, local);
    writeSelectedId('sprint', 200);

    stubWindow(sessionA, local);
    expect(readSelectedId('sprint')).toBe(100);

    stubWindow(sessionB, local);
    expect(readSelectedId('sprint')).toBe(200);

    // local holds last write (seed for a brand-new tab only)
    expect(parseStoredSelectedId(local.getItem('sprint'))).toBe(200);
  });
});
