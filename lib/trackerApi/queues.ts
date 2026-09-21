/**
 * Tracker API: очереди (только сервер).
 */

import type { AxiosInstance } from 'axios';

import { apiCache, cacheKeys } from '../cache';
import { requireTrackerAxiosForApiRoute } from '../trackerAxiosFactory';

import { TRACKER_V3_BASE, WORKFLOW_CACHE_TTL } from './constants';
import { mapRawQueue } from './queueMappingHelpers';

interface TrackerQueueListItem {
  id?: number;
  key: string;
  name: string;
}

/** Ответ списка очередей: массив или обёртка (на случай смены формата API). */
function extractQueueRows(data: unknown): unknown[] {
  if (Array.isArray(data)) {
    return data;
  }
  if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>;
    if (Array.isArray(o.values)) {
      return o.values;
    }
  }
  return [];
}

/**
 * Список очередей: официальный `GET /v3/queues/?perPage=…` (массив в теле).
 * Эндпоинт `queues/_paginate` в облачном Tracker отдаёт 404 — используется для досок, не для очередей.
 */
export async function fetchTrackerQueuesPaginate(
  axiosInstance?: AxiosInstance
): Promise<TrackerQueueListItem[]> {
  const api = requireTrackerAxiosForApiRoute(axiosInstance);
  const perPage = 500;
  const { data } = await api.get<unknown>(`${TRACKER_V3_BASE}/queues/`, {
    params: { perPage },
  });
  const rows = extractQueueRows(data);
  const out: TrackerQueueListItem[] = [];
  for (const row of rows) {
    const item = mapRawQueue(row);
    if (item) {
      out.push(item);
    }
  }
  return out;
}

/** Одна очередь: GET /v3/queues/{key}. */
export async function fetchTrackerQueueByKey(
  queueKey: string,
  axiosInstance?: AxiosInstance
): Promise<TrackerQueueListItem | null> {
  const key = queueKey.trim();
  if (!key) {
    return null;
  }
  const cacheKey = cacheKeys.queueByKey(key);
  const cached = apiCache.get<TrackerQueueListItem>(cacheKey);
  if (cached) {
    return cached;
  }
  const api = requireTrackerAxiosForApiRoute(axiosInstance);
  try {
    const { data } = await api.get<unknown>(
      `${TRACKER_V3_BASE}/queues/${encodeURIComponent(key)}`
    );
    const mapped = mapRawQueue(data);
    if (mapped) {
      apiCache.set(cacheKey, mapped, WORKFLOW_CACHE_TTL);
    }
    return mapped;
  } catch {
    return null;
  }
}

const QUEUE_SEARCH_MAX_RESULTS = 30;

/**
 * Поиск очередей организации: точное совпадение по ключу + подстрока в ключе/названии в полном списке.
 */
function queueMatchesNeedle(item: TrackerQueueListItem, needle: string): boolean {
  return item.key.toLowerCase().includes(needle) || item.name.toLowerCase().includes(needle);
}

function appendUniqueQueue(
  out: TrackerQueueListItem[],
  seen: Set<string>,
  item: TrackerQueueListItem | null
): void {
  if (!item || seen.has(item.key)) {
    return;
  }
  seen.add(item.key);
  out.push(item);
}

function collectSubstringQueueMatches(
  all: TrackerQueueListItem[],
  needle: string,
  out: TrackerQueueListItem[],
  seen: Set<string>,
  maxResults: number
): void {
  for (const item of all) {
    if (out.length >= maxResults) {
      break;
    }
    if (queueMatchesNeedle(item, needle)) {
      appendUniqueQueue(out, seen, item);
    }
  }
}

export async function searchTrackerQueues(
  query: string,
  axiosInstance?: AxiosInstance
): Promise<TrackerQueueListItem[]> {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }
  const api = requireTrackerAxiosForApiRoute(axiosInstance);
  const needle = trimmed.toLowerCase();
  const seen = new Set<string>();
  const out: TrackerQueueListItem[] = [];

  appendUniqueQueue(out, seen, await fetchTrackerQueueByKey(trimmed, api));
  if (trimmed !== trimmed.toUpperCase()) {
    appendUniqueQueue(out, seen, await fetchTrackerQueueByKey(trimmed.toUpperCase(), api));
  }

  collectSubstringQueueMatches(
    await fetchTrackerQueuesPaginate(api),
    needle,
    out,
    seen,
    QUEUE_SEARCH_MAX_RESULTS
  );

  return out.slice(0, QUEUE_SEARCH_MAX_RESULTS);
}
