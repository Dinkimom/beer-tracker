/**
 * Снимок с сервера + локальные ещё не сохранённые правки: pending не затираем.
 */
export function mergeRemoteItemsWithPending<T, TId>(
  remote: T[],
  pending: Map<TId, T>,
  getId: (item: T) => TId,
  mergePendingWithRemote?: (pending: T, remote: T) => T
): T[] {
  if (pending.size === 0) {
    return remote;
  }
  const pendingIds = new Set(pending.keys());
  const remoteById = new Map(remote.map((item) => [getId(item), item] as const));
  const merged = remote.filter((item) => !pendingIds.has(getId(item)));
  for (const item of pending.values()) {
    const remoteItem = remoteById.get(getId(item));
    merged.push(
      remoteItem && mergePendingWithRemote ? mergePendingWithRemote(item, remoteItem) : item
    );
  }
  return merged;
}

/** Локально удалённые id не возвращаем из устаревшего снимка, пока сервер их не подтвердит. */
export function applyPendingDeletesToRemote<T, TId>(
  remote: T[],
  pendingDeletes: ReadonlySet<TId>,
  getId: (item: T) => TId
): { items: T[]; pendingDeletes: Set<TId> } {
  if (pendingDeletes.size === 0) {
    return { items: remote, pendingDeletes: new Set() };
  }
  const remoteIds = new Set(remote.map(getId));
  const stillPending = new Set<TId>();
  for (const id of pendingDeletes) {
    if (remoteIds.has(id)) stillPending.add(id);
  }
  const items =
    stillPending.size === 0 ? remote : remote.filter((item) => !stillPending.has(getId(item)));
  return { items, pendingDeletes: stillPending };
}
