import { REALTIME_CLIENT_ID_HEADER, REALTIME_CLIENT_ID_STORAGE_KEY } from './sprintRealtimeConstants';

const MAX_REALTIME_CLIENT_ID_LENGTH = 80;

let browserRealtimeClientIdFallback: string | null = null;

export function parseRealtimeClientId(raw: string | null | undefined): string | null {
  const value = raw?.trim() ?? '';
  if (!value || value.length > MAX_REALTIME_CLIENT_ID_LENGTH) {
    return null;
  }
  return value;
}

export function getRealtimeClientIdFromRequest(request: Request): string | null {
  return parseRealtimeClientId(request.headers.get(REALTIME_CLIENT_ID_HEADER));
}

function createBrowserRealtimeClientId(): string {
  const created = crypto.randomUUID();
  browserRealtimeClientIdFallback = created;
  try {
    sessionStorage.setItem(REALTIME_CLIENT_ID_STORAGE_KEY, created);
  } catch {
    /* sessionStorage недоступен — держим id в памяти вкладки */
  }
  return created;
}

export function getBrowserRealtimeClientId(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  try {
    const existing = sessionStorage.getItem(REALTIME_CLIENT_ID_STORAGE_KEY)?.trim();
    if (existing && existing.length <= MAX_REALTIME_CLIENT_ID_LENGTH) {
      browserRealtimeClientIdFallback = existing;
      return existing;
    }
  } catch {
    /* fall through to in-memory id */
  }
  if (browserRealtimeClientIdFallback) {
    return browserRealtimeClientIdFallback;
  }
  return createBrowserRealtimeClientId();
}

/** Сброс in-memory id (только тесты). */
export function resetBrowserRealtimeClientIdForTests(): void {
  browserRealtimeClientIdFallback = null;
}
