/**
 * Generic хук для синхронизации **списка** сущностей с API (дебаунс, save/delete по элементу).
 * Обёртки: `useTaskLinksApi`, `useCommentsApi` в useApiStorage.ts.
 * Для одного документа (строки доски «по фичам») — `useFeatureLanesApi`; см. ARCHITECTURE.md.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

import {
  applyLatePrefetchIfEmpty,
  applyReplacements,
  collectChangedItems,
  flushPendingUpdates,
  loadSyncedItems,
  omitPendingDeletedIds,
  type SyncedListConfig,
} from '@/lib/layers/application/mobx/syncedList';
import { isValidSprintId } from '@/lib/layers/data/mappers/taskPositionToApi';
import { applyPendingDeletesToRemote, mergeRemoteItemsWithPending } from '@/lib/realtime/mergeRemoteItemsWithPending';
import { DELAYS } from '@/utils/constants';

type UseDebouncedApiSyncOptions<T, TId, TApiData> = SyncedListConfig<T, TId, TApiData> & { sprintId: number | null };

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
  loadSharedItems,
  debounceDelay = DELAYS.DEBOUNCE,
}: UseDebouncedApiSyncOptions<T, TId, TApiData>) {
  const [items, setItems] = useState<T[]>(() => []);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingUpdatesRef = useRef<Map<TId, T>>(new Map());
  const pendingDeletesRef = useRef<Set<TId>>(new Set());
  const itemsRef = useRef(items);
  const loadedSprintIdRef = useRef<number | null>(null);
  /** Поколение загрузки: ответ ушедшего спринта (A→B→A) не перетирает список текущего. */
  const loadGenerationRef = useRef(0);

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
      loadGenerationRef.current += 1;
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
    loadGenerationRef.current += 1;
    const generation = loadGenerationRef.current;

    loadSyncedItems({
      fetchFn,
      getInitialItems,
      loadSharedItems,
      setItems: (loaded) => {
        if (loadGenerationRef.current === generation) {
          setItems(loaded);
        }
      },
      sprintId,
    });
  }, [sprintId, fetchFn, getInitialItems, loadSharedItems]);

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

