/**
 * Tracker API: пользователи организации (только сервер).
 */

import type { AxiosInstance } from 'axios';

import { createHash } from 'node:crypto';

import { apiCache, cacheKeys } from '@/lib/cache';

import { TRACKER_V3_BASE } from './constants';

const TRACKER_USERS_LIST_TTL_SEC = 60;
const YANDEX_USER_SEARCH_LIMIT = 30;

interface TrackerUserItem {
  avatarUrl?: string | null;
  displayName: string;
  email?: string | null;
  login?: string | null;
  /** uid Трекера — строка для совместимости с trackerId в приложении */
  trackerId: string;
}

interface TrackerUserRaw {
  dismissed?: boolean;
  display?: string;
  email?: string | null;
  firstName?: string;
  hasLicense?: boolean;
  lastName?: string;
  login?: string;
  trackerUid?: number;
  uid?: number;
}

function mapRawUser(raw: unknown): TrackerUserItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as TrackerUserRaw;
  const uid = o.trackerUid ?? o.uid;
  if (!uid) return null;
  if (o.dismissed) return null;

  const displayName =
    o.display?.trim() ||
    [o.firstName, o.lastName].filter(Boolean).join(' ') ||
    o.login ||
    String(uid);

  return {
    avatarUrl: null,
    displayName,
    email: o.email?.trim() || null,
    login: o.login?.trim() || null,
    trackerId: String(uid),
  };
}

/**
 * Загрузить всех пользователей организации из Яндекс Трекера (постранично).
 * Лимит Tracker API — 10 000 пользователей.
 */
function appendUsersFromPage(result: TrackerUserItem[], items: unknown[]): boolean {
  for (const raw of items) {
    const mapped = mapRawUser(raw);
    if (mapped) {
      result.push(mapped);
    }
  }
  return items.length > 0;
}

async function fetchTrackerUsersPaginate(
  api: AxiosInstance,
  maxPages = 20
): Promise<TrackerUserItem[]> {
  const result: TrackerUserItem[] = [];
  const perPage = 100;

  for (let page = 1; page <= maxPages; page++) {
    const res = await api.get<unknown[]>(`${TRACKER_V3_BASE}/users`, {
      params: { perPage, page },
    });
    const items = Array.isArray(res.data) ? res.data : [];
    appendUsersFromPage(result, items);
    if (items.length < perPage) break;
  }

  return result;
}

function trackerUsersListCacheKey(api: AxiosInstance): string {
  const auth = String(
    (api.defaults.headers as { Authorization?: string } | undefined)?.Authorization ?? ''
  );
  const base = String(api.defaults.baseURL ?? '');
  const fingerprint = createHash('sha256').update(`${auth}\0${base}`).digest('hex').slice(0, 16);
  return cacheKeys.trackerUsersList(fingerprint);
}

function getCachedTrackerUsers(api: AxiosInstance): TrackerUserItem[] | null {
  return apiCache.get<TrackerUserItem[]>(trackerUsersListCacheKey(api));
}

async function fetchTrackerUsersPaginateCached(
  api: AxiosInstance
): Promise<TrackerUserItem[]> {
  const cached = getCachedTrackerUsers(api);
  if (cached) return cached;
  const users = await fetchTrackerUsersPaginate(api);
  apiCache.set(trackerUsersListCacheKey(api), users, TRACKER_USERS_LIST_TTL_SEC);
  return users;
}

async function fetchTrackerUserById(
  api: AxiosInstance,
  id: string
): Promise<TrackerUserItem | null> {
  try {
    const res = await api.get<unknown>(`${TRACKER_V3_BASE}/users/${encodeURIComponent(id)}`);
    return mapRawUser(res.data);
  } catch {
    return null;
  }
}

/** Логин, uid или email без пробелов — можно спросить у Трекера напрямую. */
export function isDirectTrackerUserQuery(query: string): boolean {
  const q = query.trim();
  return q.length >= 2 && !/\s/.test(q) && !q.startsWith('@');
}

function userMatchesQuery(user: TrackerUserItem, q: string): boolean {
  return (
    user.displayName.toLowerCase().includes(q) ||
    (user.email ?? '').toLowerCase().includes(q) ||
    (user.login ?? '').toLowerCase().includes(q) ||
    user.trackerId.toLowerCase().includes(q)
  );
}

/**
 * Поиск пользователей по строке запроса (фильтрация на сервере).
 * Если в запросе есть `@`, сначала ищем точное и частичное совпадение email.
 */
export function filterTrackerUsers(users: TrackerUserItem[], query: string): TrackerUserItem[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  if (q.includes('@')) {
    const exact = users.filter((u) => (u.email ?? '').toLowerCase() === q);
    if (exact.length > 0) {
      return exact;
    }
    return users.filter((u) => (u.email ?? '').toLowerCase().includes(q));
  }
  return users.filter((u) => userMatchesQuery(u, q));
}

async function searchYandexTrackerUsersUncached(
  api: AxiosInstance,
  q: string
): Promise<TrackerUserItem[]> {
  if (isDirectTrackerUserQuery(q)) {
    const direct = await fetchTrackerUserById(api, q);
    if (direct) {
      return [direct];
    }
  }
  const all = await fetchTrackerUsersPaginateCached(api);
  return filterTrackerUsers(all, q).slice(0, YANDEX_USER_SEARCH_LIMIT);
}

/**
 * Поиск в Яндекс Трекере: прямой GET по логину/uid, иначе список с коротким кэшем.
 * Раньше каждый ввод скачивал всех пользователей и поиск в админке «зависал».
 */
export async function searchYandexTrackerUsers(
  api: AxiosInstance,
  query: string
): Promise<TrackerUserItem[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const cached = getCachedTrackerUsers(api);
  if (!cached) {
    return await searchYandexTrackerUsersUncached(api, q);
  }

  const filtered = filterTrackerUsers(cached, q);
  if (filtered.length > 0 || !isDirectTrackerUserQuery(q)) {
    return filtered.slice(0, YANDEX_USER_SEARCH_LIMIT);
  }
  const direct = await fetchTrackerUserById(api, q);
  return direct ? [direct] : [];
}
