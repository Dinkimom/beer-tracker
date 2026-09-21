type SprintBoardListKind = 'comments' | 'links';

interface PrefetchEntry<T> {
  data: T[];
}

const settledCache = new Map<string, PrefetchEntry<unknown>>();
const inflightCache = new Map<string, Promise<unknown[]>>();

function cacheKey(sprintId: number, kind: SprintBoardListKind): string {
  return `${sprintId}:${kind}`;
}

export function takePrefetchedSprintBoardList<T>(
  sprintId: number,
  kind: SprintBoardListKind
): T[] | undefined {
  const key = cacheKey(sprintId, kind);
  const entry = settledCache.get(key);
  if (!entry) {
    return undefined;
  }
  settledCache.delete(key);
  return entry.data as T[];
}

export function getInflightSprintBoardList<T>(
  sprintId: number,
  kind: SprintBoardListKind
): Promise<T[]> | undefined {
  return inflightCache.get(cacheKey(sprintId, kind)) as Promise<T[]> | undefined;
}

export function isSprintBoardListPrefetchSettled(
  sprintId: number,
  kind: SprintBoardListKind
): boolean {
  return settledCache.has(cacheKey(sprintId, kind));
}

export function prefetchSprintBoardList<T>(
  sprintId: number,
  kind: SprintBoardListKind,
  fetchFn: (id: number) => Promise<T[]>
): Promise<T[]> {
  const key = cacheKey(sprintId, kind);
  const settled = settledCache.get(key);
  if (settled) {
    return Promise.resolve(settled.data as T[]);
  }

  const inflight = inflightCache.get(key);
  if (inflight) {
    return inflight as Promise<T[]>;
  }

  const promise = fetchFn(sprintId)
    .then((data) => {
      settledCache.set(key, { data });
      inflightCache.delete(key);
      return data;
    })
    .catch((error) => {
      inflightCache.delete(key);
      throw error;
    });

  inflightCache.set(key, promise);
  return promise;
}

export function clearSprintBoardListPrefetchForTests(): void {
  settledCache.clear();
  inflightCache.clear();
}
