/**
 * Выбор доски/спринта: per-tab через sessionStorage, seed из localStorage для новой вкладки.
 *
 * Общий localStorage + синхронизация с URL давали гонку: две вкладки с разными спринтами
 * перезаписывали один ключ, а remount/replace снова читал «чужой» id → бесконечный
 * router.replace между спринтами.
 */

function readRaw(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function writeRaw(storage: Storage, key: string, value: string): void {
  try {
    storage.setItem(key, value);
  } catch {
    /* quota / private mode */
  }
}

function removeRaw(storage: Storage, key: string): void {
  try {
    storage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** Парсит id из session/local: JSON-строка (`"123"`) или сырое число. */
export function parseStoredSelectedId(raw: string | null): number | null {
  if (raw == null || raw === '') {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === 'number' && Number.isFinite(parsed)) {
      return parsed;
    }
    if (typeof parsed === 'string') {
      const n = parseInt(parsed, 10);
      return Number.isNaN(n) ? null : n;
    }
  } catch {
    const n = parseInt(raw, 10);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

export function readSelectedId(key: string): number | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const fromSession = parseStoredSelectedId(readRaw(window.sessionStorage, key));
  if (fromSession != null) {
    return fromSession;
  }
  return parseStoredSelectedId(readRaw(window.localStorage, key));
}

export function writeSelectedId(key: string, id: number | null): void {
  if (typeof window === 'undefined') {
    return;
  }
  if (id == null) {
    removeRaw(window.sessionStorage, key);
    removeRaw(window.localStorage, key);
    return;
  }
  const raw = JSON.stringify(id.toString());
  writeRaw(window.sessionStorage, key, raw);
  // seed для новой вкладки (не читается обратно в уже открытых — у них session)
  writeRaw(window.localStorage, key, raw);
}
