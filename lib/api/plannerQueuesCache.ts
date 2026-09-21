import type { QueueIssueTypeOption } from '@/lib/planner/queueIssueTypes';

/** Как на сервере для workflow: метаданные очередей и типы задач редко меняются. */
const PLANNER_QUEUES_CACHE_TTL_MS = 60 * 60 * 1000;

interface CacheEntry<T> {
  expiresAt: number;
  value: T;
}

function normalizeQueueKey(queueKey: string): string {
  return queueKey.trim().toUpperCase();
}

function readEntry<T>(map: Map<string, CacheEntry<T>>, key: string): T | undefined {
  const entry = map.get(key);
  if (!entry) {
    return undefined;
  }
  if (Date.now() > entry.expiresAt) {
    map.delete(key);
    return undefined;
  }
  return entry.value;
}

function writeEntry<T>(map: Map<string, CacheEntry<T>>, key: string, value: T): void {
  map.set(key, { value, expiresAt: Date.now() + PLANNER_QUEUES_CACHE_TTL_MS });
}

const queueMetaByKey = new Map<string, CacheEntry<{ key: string; name: string } | null>>();
const issueTypesByQueueKey = new Map<string, CacheEntry<QueueIssueTypeOption[]>>();
const queueMetaInflight = new Map<string, Promise<{ key: string; name: string } | null>>();
const issueTypesInflight = new Map<string, Promise<QueueIssueTypeOption[]>>();

export function peekCachedQueueByKey(
  queueKey: string
): { key: string; name: string } | null | undefined {
  return readEntry(queueMetaByKey, normalizeQueueKey(queueKey));
}

export function setCachedQueueByKey(
  queueKey: string,
  value: { key: string; name: string } | null
): void {
  writeEntry(queueMetaByKey, normalizeQueueKey(queueKey), value);
}

export function peekCachedQueueIssueTypes(queueKey: string): QueueIssueTypeOption[] | undefined {
  return readEntry(issueTypesByQueueKey, normalizeQueueKey(queueKey));
}

function setCachedQueueIssueTypes(queueKey: string, types: QueueIssueTypeOption[]): void {
  writeEntry(issueTypesByQueueKey, normalizeQueueKey(queueKey), types);
}

export function runCachedQueueByKeyFetch(
  queueKey: string,
  fetcher: () => Promise<{ key: string; name: string } | null>
): Promise<{ key: string; name: string } | null> {
  const cached = peekCachedQueueByKey(queueKey);
  if (cached !== undefined) {
    return Promise.resolve(cached);
  }

  const key = normalizeQueueKey(queueKey);
  const inflight = queueMetaInflight.get(key);
  if (inflight) {
    return inflight;
  }

  const promise = fetcher()
    .then((result) => {
      setCachedQueueByKey(queueKey, result);
      return result;
    })
    .finally(() => {
      queueMetaInflight.delete(key);
    });
  queueMetaInflight.set(key, promise);
  return promise;
}

export function runCachedQueueIssueTypesFetch(
  queueKey: string,
  fetcher: () => Promise<QueueIssueTypeOption[]>
): Promise<QueueIssueTypeOption[]> {
  const cached = peekCachedQueueIssueTypes(queueKey);
  if (cached !== undefined) {
    return Promise.resolve(cached);
  }

  const key = normalizeQueueKey(queueKey);
  const inflight = issueTypesInflight.get(key);
  if (inflight) {
    return inflight;
  }

  const promise = fetcher()
    .then((types) => {
      setCachedQueueIssueTypes(queueKey, types);
      return types;
    })
    .finally(() => {
      issueTypesInflight.delete(key);
    });
  issueTypesInflight.set(key, promise);
  return promise;
}

/** Только для unit-тестов. */
export function clearPlannerQueuesClientCache(): void {
  queueMetaByKey.clear();
  issueTypesByQueueKey.clear();
  queueMetaInflight.clear();
  issueTypesInflight.clear();
}
