/**
 * Список сущностей спринта с отложенным сохранением на сервер: связи, заметки.
 *
 * Правки видны сразу, запись — после паузы (`debounceDelay`), несколько правок — одним пакетом.
 * Ожидающие правки и удаления не теряются при снимке из realtime. MobX-класс заменяет хук
 * `useDebouncedApiSync`: побочные эффекты здесь не внутри `setState`, и один экземпляр живёт на спринт.
 */

import { action, makeObservable, observable } from 'mobx';

import { isValidSprintId } from '@/lib/layers/data/mappers/taskPositionToApi';
import { applyPendingDeletesToRemote, mergeRemoteItemsWithPending } from '@/lib/realtime/mergeRemoteItemsWithPending';
import { DELAYS } from '@/utils/constants';

export interface SyncedListConfig<T, TId, TApiData> {
  debounceDelay?: number;
  batchSaveFn?: (sprintId: number, items: TApiData[]) => Promise<{ success: boolean; count: number }>;
  compareItems?: (a: T, b: T) => boolean;
  deleteFn: (sprintId: number, id: TId) => Promise<boolean | void>;
  fetchFn: (sprintId: number) => Promise<T[]>;
  getId: (item: T) => TId;
  /** Снимок с префетча до монтирования планера (см. sprintBoardListPrefetch). */
  getInitialItems?: (sprintId: number) => T[] | undefined;
  /**
   * Общий префетч списка (см. sprintBoardListPrefetch): присоединиться к in-flight или начать его.
   * Иначе гейт доски грузит тот же список вторым запросом и оставляет снимок, который никто не забрал;
   * при возврате на спринт планер взял бы этот устаревший снимок.
   */
  loadSharedItems?: (sprintId: number) => Promise<T[]>;
  /** Снимок с сервера при pending: подмешать поля, которые правит другой клиент (например reactions). */
  mergeRemotePendingItem?: (pending: T, remote: T) => T;
  /** После сохранения, если API вернул объект с другим id, слить поля клиента (например clientInstanceId). */
  mergeSavedItem?: (previous: T, saved: T) => T;
  /** При создании может вернуть созданный элемент с id с бэка (для подстановки в список). */
  saveFn: (sprintId: number, data: TApiData, isUpdate?: boolean) => Promise<T | boolean | void>;
  toApiFormat: (item: T, isUpdate?: boolean) => TApiData;
}

interface FlushPendingUpdatesOptions<T, TId, TApiData> {
  batchSaveFn?: SyncedListConfig<T, TId, TApiData>['batchSaveFn'];
  existingItems: T[];
  isUpdate?: boolean;
  pendingUpdates: Map<TId, T>;
  saveFn: SyncedListConfig<T, TId, TApiData>['saveFn'];
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

export function collectChangedItems<T, TId>(
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

export function omitPendingDeletedIds<T, TId>(updates: Map<TId, T>, pendingDeletes: Set<TId>): Map<TId, T> {
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

/** Сохранить один элемент; при отказе вернуть его в ожидающие (и бросить, если просили). */
async function saveOneItem<T, TId, TApiData>(
  options: FlushPendingUpdatesOptions<T, TId, TApiData>,
  item: T
): Promise<{ item: T; result: T } | null> {
  const itemIsUpdate = options.isUpdate ?? itemExists(options.existingItems, item, options.getId);
  try {
    const result = await options.saveFn(options.sprintId, options.toApiFormat(item, itemIsUpdate), itemIsUpdate);
    if (result === false) {
      throw new Error('saveFn returned false');
    }
    return toReplacement(item, result, options.mergeSavedItem);
  } catch (error) {
    if (!(error instanceof Error && error.message === 'saveFn returned false')) {
      console.error('Error saving item:', error);
    }
    options.pendingUpdates.set(options.getId(item), item);
    if (options.throwOnError) {
      throw error;
    }
    return null;
  }
}

async function flushSingleUpdates<T, TId, TApiData>(
  options: FlushPendingUpdatesOptions<T, TId, TApiData>
): Promise<Array<{ item: T; result: T }>> {
  const replacements: Array<{ item: T; result: T }> = [];
  for (const item of options.updates.values()) {
    const replacement = await saveOneItem(options, item);
    if (replacement) {
      replacements.push(replacement);
    }
  }
  return replacements;
}

export async function flushPendingUpdates<T, TId, TApiData>(
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

export function applyReplacements<T, TId>(
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

export function applyLatePrefetchIfEmpty<T>(
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

export async function loadSyncedItems<T>(options: {
  fetchFn: (sprintId: number) => Promise<T[]>;
  getInitialItems?: (sprintId: number) => T[] | undefined;
  loadSharedItems?: (sprintId: number) => Promise<T[]>;
  setItems: (items: T[]) => void;
  sprintId: number;
}): Promise<void> {
  const prefetched = options.getInitialItems?.(options.sprintId);
  if (prefetched) {
    options.setItems(prefetched);
    return;
  }

  const shared = options.loadSharedItems?.(options.sprintId);
  if (shared) {
    try {
      const data = await shared;
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


const sameJson = <T, >(a: T, b: T): boolean => JSON.stringify(a) === JSON.stringify(b);

/** Список одного спринта. Методы — стрелки: их можно отдавать как колбэки. */
export class SyncedList<T, TId, TApiData> {
  items: T[] = [];

  private connected = false;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingDeletes = new Set<TId>();
  private readonly pendingUpdates = new Map<TId, T>();

  constructor(
    private readonly sprintId: number | null,
    private readonly config: SyncedListConfig<T, TId, TApiData>
  ) {
    makeObservable<SyncedList<T, TId, TApiData>, 'setItems'>(this, {
      items: observable.ref,
      setItems: action,
    });
  }

  private setItems(items: T[]): void {
    this.items = items;
  }

  private get delay(): number {
    return this.config.debounceDelay ?? DELAYS.DEBOUNCE;
  }

  /** Загрузка при показе доски; повторный вызов только подхватывает префетч, пришедший позже. */
  connect = (): void => {
    const { sprintId } = this;
    if (!isValidSprintId(sprintId)) {
      this.setItems([]);
      return;
    }
    if (this.connected) {
      applyLatePrefetchIfEmpty(this.items, this.config.getInitialItems, sprintId, (items) =>
        this.setItems(items)
      );
      return;
    }
    this.connected = true;
    void loadSyncedItems({
      fetchFn: this.config.fetchFn,
      getInitialItems: this.config.getInitialItems,
      loadSharedItems: this.config.loadSharedItems,
      setItems: (items) => this.setItems(items),
      sprintId,
    });
  };

  private takePendingUpdates(): Map<TId, T> {
    const updates = omitPendingDeletedIds(new Map(this.pendingUpdates), this.pendingDeletes);
    this.pendingUpdates.clear();
    return updates;
  }

  private restartTimer(flush: () => Promise<void>): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      void flush();
    }, this.delay);
  }

  /** Добавить или заменить элемент; запись — после паузы. */
  save = (item: T, isUpdate?: boolean): Promise<void> => {
    const { sprintId } = this;
    if (!isValidSprintId(sprintId)) return Promise.resolve();
    const { getId } = this.config;
    const id = getId(item);
    const exists = this.items.some((existing) => getId(existing) === id);
    this.setItems(
      exists ? this.items.map((existing) => (getId(existing) === id ? item : existing)) : [...this.items, item]
    );
    this.pendingDeletes.delete(id);
    this.pendingUpdates.set(id, item);
    // Как у хука: промис предыдущего вызова, чей таймер перезапущен, не разрешается.
    return new Promise((resolve, reject) => {
      this.restartTimer(async () => {
        try {
          await flushPendingUpdates({
            batchSaveFn: this.config.batchSaveFn,
            existingItems: this.items,
            getId,
            isUpdate,
            pendingUpdates: this.pendingUpdates,
            saveFn: this.config.saveFn,
            sprintId,
            throwOnError: true,
            toApiFormat: this.config.toApiFormat,
            updates: this.takePendingUpdates(),
          });
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  };

  /** Удалить сразу, без паузы. */
  delete = async (id: TId): Promise<void> => {
    const { sprintId } = this;
    if (!isValidSprintId(sprintId)) return;
    this.setItems(this.items.filter((item) => this.config.getId(item) !== id));
    this.pendingUpdates.delete(id);
    this.pendingDeletes.add(id);
    try {
      await this.config.deleteFn(sprintId, id);
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  /** Заменить список целиком; изменившиеся элементы сохраняются после паузы. */
  setWithSave = (next: T[] | ((prev: T[]) => T[])): void => {
    const { sprintId } = this;
    const previous = this.items;
    const updated = typeof next === 'function' ? next(previous) : next;
    const { getId } = this.config;
    const changed = collectChangedItems(previous, updated, getId, this.config.compareItems ?? sameJson);
    this.setItems(updated);
    if (changed.size === 0 || !isValidSprintId(sprintId)) return;
    changed.forEach((item) => this.pendingUpdates.set(getId(item), item));
    this.restartTimer(async () => {
      const replacements = await flushPendingUpdates({
        batchSaveFn: this.config.batchSaveFn,
        existingItems: previous,
        getId,
        mergeSavedItem: this.config.mergeSavedItem,
        pendingUpdates: this.pendingUpdates,
        saveFn: this.config.saveFn,
        sprintId,
        throwOnError: false,
        toApiFormat: this.config.toApiFormat,
        updates: this.takePendingUpdates(),
      });
      if (replacements.length > 0) {
        this.setItems(applyReplacements(this.items, replacements, getId));
      }
    });
  };

  /** Снимок с сервера после события realtime: ожидающие правки и удаления не теряются. */
  reloadFromRemote = async (): Promise<void> => {
    const { sprintId } = this;
    if (!isValidSprintId(sprintId)) return;
    try {
      const data = await this.config.fetchFn(sprintId);
      if (!data || !Array.isArray(data)) return;
      const { getId, mergeRemotePendingItem } = this.config;
      const settled = applyPendingDeletesToRemote(data, this.pendingDeletes, getId);
      this.pendingDeletes = settled.pendingDeletes;
      this.setItems(mergeRemoteItemsWithPending(settled.items, this.pendingUpdates, getId, mergeRemotePendingItem));
    } catch (error) {
      console.error('Error reloading items from realtime:', error);
    }
  };
}
