/**
 * Generic хук для синхронизации **списка** сущностей с API (дебаунс, save/delete по элементу).
 * Обёртки: `useTaskLinksApi`, `useCommentsApi` в useApiStorage.ts.
 * Для одного документа (порядок занятости) — `useOccupancyTaskOrderApi`; см. ARCHITECTURE.md.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

import { isValidSprintId } from '@/lib/layers/data/mappers/taskPositionToApi';
import { applyPendingDeletesToRemote, mergeRemoteItemsWithPending } from '@/lib/realtime/mergeRemoteItemsWithPending';
import { DELAYS } from '@/utils/constants';

/**
 * Опции для хука синхронизации с API
 */
interface UseDebouncedApiSyncOptions<T, TId, TApiData> {
  debounceDelay?: number;
  sprintId: number | null;
  batchSaveFn?: (sprintId: number, items: TApiData[]) => Promise<{ success: boolean; count: number }>;
  compareItems?: (a: T, b: T) => boolean;
  deleteFn: (sprintId: number, id: TId) => Promise<boolean | void>;
  fetchFn: (sprintId: number) => Promise<T[]>;
  getId: (item: T) => TId;
  /** In-flight префетч того же списка (см. sprintBoardListPrefetch), чтобы не уехать в пустой fetch. */
  getInflightItems?: (sprintId: number) => Promise<T[]> | undefined;
  /** Снимок с префетча до монтирования планера (см. sprintBoardListPrefetch). */
  getInitialItems?: (sprintId: number) => T[] | undefined;
  /**
   * Снимок с сервера при pending: подмешать поля, которые правит другой клиент (например reactions).
   */
  mergeRemotePendingItem?: (pending: T, remote: T) => T;
  /**
   * После сохранения, если API вернул объект с другим id, слить поля клиента (например clientInstanceId).
   */
  mergeSavedItem?: (previous: T, saved: T) => T;
  /** При создании может вернуть созданный элемент с id с бэка (для подстановки в state) */
  saveFn: (sprintId: number, data: TApiData, isUpdate?: boolean) => Promise<T | boolean | void>;
  toApiFormat: (item: T, isUpdate?: boolean) => TApiData;
}

interface FlushPendingUpdatesOptions<T, TId, TApiData> {
  batchSaveFn?: UseDebouncedApiSyncOptions<T, TId, TApiData>['batchSaveFn'];
  existingItems: T[];
  isUpdate?: boolean;
  pendingUpdates: Map<TId, T>;
  saveFn: UseDebouncedApiSyncOptions<T, TId, TApiData>['saveFn'];
  sprintId: number;
  throwOnError: boolean;
  updates: Map<TId, T>;
  getId: (item: T) => TId;
  mergeSavedItem?: (previous: T, saved: T) => T;
  toApiFormat: (item: T, isUpdate?: boolean) => TApiData;
}

function itemExists<T, TId>(items: T[], item: T, getId: (item: T) => TId): boolean {
  return items.some((existing) => getId(existing) === getId(item));
}

function collectChangedItems<T, TId>(
  previous: T[],
  updated: T[],
  getId: (item: T) => TId,
  compare: (a: T, b: T) => boolean
): Map<TId, T> {
  const changed = new Map<TId, T>();
  for (const item of updated) {
    const oldItem = previous.find((existing) => getId(existing) === getId(item));
    if (!oldItem || !compare(oldItem, item)) {
      changed.set(getId(item), item);
    }
  }
  return changed;
}

function restorePendingUpdates<T, TId>(
  pendingUpdates: Map<TId, T>,
  updates: Map<TId, T>
): void {
  for (const [id, item] of updates) {
    pendingUpdates.set(id, item);
  }
}

function omitPendingDeletedIds<T, TId>(updates: Map<TId, T>, pendingDeletes: Set<TId>): Map<TId, T> {
  if (pendingDeletes.size === 0) return updates;
  const next = new Map(updates);
  for (const id of pendingDeletes) {
    next.delete(id);
  }
  return next;
}

function toApiItems<T, TId, TApiData>(
  updates: Map<TId, T>,
  options: Pick<FlushPendingUpdatesOptions<T, TId, TApiData>, 'existingItems' | 'getId' | 'isUpdate' | 'toApiFormat'>
): TApiData[] {
  return Array.from(updates.values()).map((item) => {
    const itemIsUpdate = options.isUpdate ?? itemExists(options.existingItems, item, options.getId);
    return options.toApiFormat(item, itemIsUpdate);
  });
}

function toReplacement<T>(
  item: T,
  result: T | boolean | void,
  mergeSavedItem?: (previous: T, saved: T) => T
): { item: T; result: T } | null {
  if (result == null || typeof result !== 'object' || Array.isArray(result) || !('id' in result)) {
    return null;
  }
  const saved = result as T;
  return {
    item,
    result: mergeSavedItem != null ? mergeSavedItem(item, saved) : saved,
  };
}

async function flushSingleUpdates<T, TId, TApiData>(
  options: FlushPendingUpdatesOptions<T, TId, TApiData>
): Promise<Array<{ item: T; result: T }>> {
  const replacements: Array<{ item: T; result: T }> = [];
  for (const item of options.updates.values()) {
    const itemIsUpdate = options.isUpdate ?? itemExists(options.existingItems, item, options.getId);
    const apiData = options.toApiFormat(item, itemIsUpdate);
    try {
      const result = await options.saveFn(options.sprintId, apiData, itemIsUpdate);
      if (result === false) {
        options.pendingUpdates.set(options.getId(item), item);
        if (options.throwOnError) {
          throw new Error('saveFn returned false');
        }
        continue;
      }
      const replacement = toReplacement(item, result, options.mergeSavedItem);
      if (replacement) {
        replacements.push(replacement);
      }
    } catch (error) {
      console.error('Error saving item:', error);
      options.pendingUpdates.set(options.getId(item), item);
      if (options.throwOnError) {
        throw error;
      }
    }
  }
  return replacements;
}

async function flushPendingUpdates<T, TId, TApiData>(
  options: FlushPendingUpdatesOptions<T, TId, TApiData>
): Promise<Array<{ item: T; result: T }>> {
  if (options.batchSaveFn && options.updates.size > 1) {
    try {
      await options.batchSaveFn(options.sprintId, toApiItems(options.updates, options));
    } catch (error) {
      console.error('Error saving batch items:', error);
      restorePendingUpdates(options.pendingUpdates, options.updates);
      if (options.throwOnError) {
        throw error;
      }
    }
    return [];
  }
  return flushSingleUpdates(options);
}

function applyReplacements<T, TId>(
  items: T[],
  replacements: Array<{ item: T; result: T }>,
  getId: (item: T) => TId
): T[] {
  let next = items;
  for (const { item, result } of replacements) {
    next = next.map((existing) => (getId(existing) === getId(item) ? result : existing));
  }
  return next;
}

function applyLatePrefetchIfEmpty<T>(
  items: T[],
  getInitialItems: ((sprintId: number) => T[] | undefined) | undefined,
  sprintId: number,
  setItems: (items: T[]) => void
): void {
  if (items.length > 0) {
    return;
  }
  const latePrefetch = getInitialItems?.(sprintId);
  if (latePrefetch) {
    setItems(latePrefetch);
  }
}

async function loadSyncedItems<T>(options: {
  fetchFn: (sprintId: number) => Promise<T[]>;
  getInflightItems?: (sprintId: number) => Promise<T[]> | undefined;
  getInitialItems?: (sprintId: number) => T[] | undefined;
  setItems: (items: T[]) => void;
  sprintId: number;
}): Promise<void> {
  const prefetched = options.getInitialItems?.(options.sprintId);
  if (prefetched) {
    options.setItems(prefetched);
    return;
  }

  const inflight = options.getInflightItems?.(options.sprintId);
  if (inflight) {
    try {
      const data = await inflight;
      const taken = options.getInitialItems?.(options.sprintId);
      options.setItems(taken ?? data);
      return;
    } catch {
      // Prefetch failed; fall through to a direct fetch.
    }
  }

  try {
    const data = await options.fetchFn(options.sprintId);
    if (data && Array.isArray(data)) {
      options.setItems(data);
    }
  } catch (error) {
    console.error('Error loading items:', error);
  }
}

/**
 * Generic хук для работы с данными через API с дебаунсингом
 *
 * @template T - тип элемента данных
 * @template TId - тип идентификатора элемента
 * @template TApiData - тип данных для API
 */
export function useDebouncedApiSync<T, TId, TApiData>({
  sprintId,
  fetchFn,
  saveFn,
  batchSaveFn,
  deleteFn,
  getId,
  toApiFormat,
  compareItems,
  mergeRemotePendingItem,
  mergeSavedItem,
  getInitialItems,
  getInflightItems,
  debounceDelay = DELAYS.DEBOUNCE,
}: UseDebouncedApiSyncOptions<T, TId, TApiData>) {
  const [items, setItems] = useState<T[]>(() => []);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingUpdatesRef = useRef<Map<TId, T>>(new Map());
  const pendingDeletesRef = useRef<Set<TId>>(new Set());
  const itemsRef = useRef(items);
  const loadedSprintIdRef = useRef<number | null>(null);

  const applySavedReplacements = useCallback(
    (replacements: Array<{ item: T; result: T }>) => {
      setItems((current) => applyReplacements(current, replacements, getId));
    },
    [getId]
  );

  // Синхронизируем ref с состоянием
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // Загрузка данных при изменении спринта (один раз на sprintId; не перезагружать на каждый ре-рендер).
  useEffect(() => {
    if (!isValidSprintId(sprintId)) {
      loadedSprintIdRef.current = null;
      const timeoutId = setTimeout(() => {
        setItems([]);
      }, 0);
      return () => clearTimeout(timeoutId);
    }

    if (loadedSprintIdRef.current === sprintId) {
      applyLatePrefetchIfEmpty(itemsRef.current, getInitialItems, sprintId, setItems);
      return;
    }
    loadedSprintIdRef.current = sprintId;

    loadSyncedItems({
      fetchFn,
      getInflightItems,
      getInitialItems,
      setItems,
      sprintId,
    });
  }, [sprintId, fetchFn, getInitialItems, getInflightItems]);

  // Сохранение одного элемента
  const saveItem = useCallback(
    (item: T, isUpdate?: boolean): Promise<void> => {
      if (!isValidSprintId(sprintId)) return Promise.resolve();

      setItems((prev) => {
        const exists = prev.find((i) => getId(i) === getId(item));
        if (exists) {
          return prev.map((i) => (getId(i) === getId(item) ? item : i));
        }
        return [...prev, item];
      });

      pendingDeletesRef.current.delete(getId(item));
      pendingUpdatesRef.current.set(getId(item), item);

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      return new Promise((resolve, reject) => {
        debounceTimerRef.current = setTimeout(async () => {
          const updates = omitPendingDeletedIds(
            new Map(pendingUpdatesRef.current),
            pendingDeletesRef.current
          );
          pendingUpdatesRef.current.clear();
          try {
            await flushPendingUpdates({
              batchSaveFn,
              existingItems: itemsRef.current,
              getId,
              isUpdate,
              pendingUpdates: pendingUpdatesRef.current,
              saveFn,
              sprintId,
              throwOnError: true,
              toApiFormat,
              updates,
            });
            resolve();
          } catch (error) {
            reject(error);
          }
        }, debounceDelay);
      });
    },
    [sprintId, saveFn, batchSaveFn, getId, toApiFormat, debounceDelay]
  );

  // Удаление элемента
  const deleteItem = useCallback(
    async (id: TId): Promise<void> => {
      if (!isValidSprintId(sprintId)) return;

      setItems((prev) => prev.filter((i) => getId(i) !== id));

      pendingUpdatesRef.current.delete(id);
      pendingDeletesRef.current.add(id);

      try {
        await deleteFn(sprintId!, id);
      } catch (error) {
        console.error('Error deleting item:', error);
        // В случае ошибки можно перезагрузить данные или показать уведомление
      }
    },
    [sprintId, deleteFn, getId]
  );

  // Обертка для setItems, которая также сохраняет изменения
  const setItemsWithSave = useCallback(
    (newItems: T[] | ((prev: T[]) => T[])) => {
      setItems((prev) => {
        const updated = typeof newItems === 'function' ? newItems(prev) : newItems;

        const defaultCompare = (a: T, b: T) => JSON.stringify(a) === JSON.stringify(b);
        const compare = compareItems || defaultCompare;

        const changed = collectChangedItems(prev, updated, getId, compare);

        if (changed.size > 0 && isValidSprintId(sprintId)) {
          if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
          }

          changed.forEach((item) => {
            pendingUpdatesRef.current.set(getId(item), item);
          });

          debounceTimerRef.current = setTimeout(async () => {
            const updates = omitPendingDeletedIds(
              new Map(pendingUpdatesRef.current),
              pendingDeletesRef.current
            );
            pendingUpdatesRef.current.clear();
            const replacements = await flushPendingUpdates({
              batchSaveFn,
              existingItems: prev,
              getId,
              mergeSavedItem,
              pendingUpdates: pendingUpdatesRef.current,
              saveFn,
              sprintId,
              throwOnError: false,
              toApiFormat,
              updates,
            });
            if (replacements.length > 0) {
              applySavedReplacements(replacements);
            }
          }, debounceDelay);
        }

        return updated;
      });
    },
    [sprintId, saveFn, batchSaveFn, getId, toApiFormat, compareItems, debounceDelay, mergeSavedItem, applySavedReplacements]
  );

  const reloadFromRemote = useCallback(async (): Promise<void> => {
    if (!isValidSprintId(sprintId)) {
      return;
    }
    try {
      const data = await fetchFn(sprintId);
      if (!data || !Array.isArray(data)) {
        return;
      }
      const settled = applyPendingDeletesToRemote(
        data,
        pendingDeletesRef.current,
        getId
      );
      pendingDeletesRef.current = settled.pendingDeletes;
      setItems(
        mergeRemoteItemsWithPending(
          settled.items,
          pendingUpdatesRef.current,
          getId,
          mergeRemotePendingItem
        )
      );
    } catch (error) {
      console.error('Error reloading items from realtime:', error);
    }
  }, [sprintId, fetchFn, getId, mergeRemotePendingItem]);

  return [items, setItemsWithSave, saveItem, deleteItem, reloadFromRemote] as const;
}

