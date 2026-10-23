import type {
  SwimlaneCardLayer,
  SwimlaneCardLayerWrite,
} from '@/lib/swimlane/swimlaneCardLayers';

import { action, makeObservable, observable, runInAction } from 'mobx';

import { saveSprintLaneLayers } from '@/lib/beerTrackerApi';
import { clampSwimlaneCardLayer } from '@/lib/swimlane/swimlaneCardLayers';
import { DELAYS } from '@/utils/constants';

/** Значение слоя в шаге истории: `null` — ручного слоя не было. */
export interface LaneLayerHistoryEntry {
  after: number | null;
  before: number | null;
}

/** Черновики quick-add живут только на клиенте: их слой не пишем на сервер. */
function isLocalOnlyCardId(cardId: string): boolean {
  return cardId.startsWith('local-');
}

/**
 * Ручные слои карточек свимлейна: оптимистичная правка, debounce-запись, история.
 * Слой правится отдельно от позиции, поэтому синк с трекером и upsert позиций его не трогают.
 */
export class SwimlaneLaneLayersStore {
  /** cardId → слой */
  layers = observable.map<string, SwimlaneCardLayer>();

  private pendingWrites = new Map<string, number | null>();

  private flushTimer: ReturnType<typeof setTimeout> | null = null;

  /** Правки слоя, которые ждут ближайшего шага истории (дроп пишет позицию в том же обработчике). */
  private stagedHistory = new Map<string, LaneLayerHistoryEntry>();

  private stagedFlushQueued = false;

  /** Монотонный rev для локальных правок: две правки за одну мс не должны совпасть. */
  private lastLocalRev = 0;

  /** Порядок появления карточек на доске за сессию (не observable: только порядок укладки). */
  private readonly seenOrder = new Map<string, number>();

  constructor(
    private readonly resolveSprintId: () => number | null,
    private readonly recordStandaloneHistory: (entries: Map<string, LaneLayerHistoryEntry>) => void
  ) {
    makeObservable(this, {
      applyHistory: action,
      clear: action,
      layers: observable,
      replaceFromServer: action,
      set: action,
      touch: action,
    });
  }

  get(cardId: string): number | undefined {
    return this.layers.get(cardId)?.layer;
  }

  /**
   * Номера появления для карточек без ручного слоя. Ещё не виденные получают следующие номера
   * в переданном порядке — так новая карточка укладывается после уже стоящих.
   */
  autoOrderFor(cardIds: Iterable<string>): ReadonlyMap<string, number> {
    for (const cardId of cardIds) {
      if (!this.seenOrder.has(cardId)) {
        this.seenOrder.set(cardId, this.seenOrder.size);
      }
    }
    return this.seenOrder;
  }

  clear(): void {
    this.seenOrder.clear();
    this.layers.clear();
    this.pendingWrites.clear();
    this.stagedHistory.clear();
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
  }

  /** Ответ сервера; неотправленные локальные правки остаются поверх. */
  replaceFromServer(layers: readonly SwimlaneCardLayer[]): void {
    const local = new Map<string, SwimlaneCardLayer>();
    for (const [cardId, entry] of this.layers) {
      if (this.pendingWrites.has(cardId) || isLocalOnlyCardId(cardId)) {
        local.set(cardId, entry);
      }
    }
    this.layers.clear();
    for (const layer of layers) {
      this.layers.set(layer.cardId, layer);
    }
    for (const [cardId, entry] of local) {
      if (this.pendingWrites.get(cardId) === null) {
        this.layers.delete(cardId);
      } else {
        this.layers.set(cardId, entry);
      }
    }
  }

  /**
   * Задать или снять слои. С `recordHistory` правка попадает в ближайший шаг истории позиций
   * (дроп) или, если позиция не менялась, в отдельный шаг.
   */
  set(writes: readonly SwimlaneCardLayerWrite[], options?: { recordHistory?: boolean }): void {
    const changed: SwimlaneCardLayerWrite[] = [];
    for (const write of writes) {
      const before = this.get(write.cardId) ?? null;
      const after = write.layer == null ? null : clampSwimlaneCardLayer(write.layer);
      if (before === after) {
        continue;
      }
      changed.push({ cardId: write.cardId, layer: after });
      if (options?.recordHistory) {
        this.stageHistory(write.cardId, before, after);
      }
    }
    this.applyLocal(changed);
  }

  /**
   * Карточку с ручным слоем подвинули по времени: она становится «новее»
   * и при конфликте уступает место соседям, которые не трогали.
   */
  touch(cardId: string): void {
    const layer = this.get(cardId);
    if (layer == null) {
      return;
    }
    this.applyLocal([{ cardId, layer }]);
  }

  /** Забрать правки, ожидающие шага истории (вызывает стор позиций при записи шага). */
  takeStagedHistory(): Map<string, LaneLayerHistoryEntry> | undefined {
    if (this.stagedHistory.size === 0) {
      return undefined;
    }
    const staged = this.stagedHistory;
    this.stagedHistory = new Map();
    return staged;
  }

  applyHistory(
    entries: ReadonlyMap<string, LaneLayerHistoryEntry> | undefined,
    direction: 'after' | 'before'
  ): void {
    if (!entries || entries.size === 0) {
      return;
    }
    const writes: SwimlaneCardLayerWrite[] = [];
    entries.forEach((entry, cardId) => {
      writes.push({ cardId, layer: direction === 'before' ? entry.before : entry.after });
    });
    this.applyLocal(writes);
  }

  private stageHistory(cardId: string, before: number | null, after: number | null): void {
    const existing = this.stagedHistory.get(cardId);
    this.stagedHistory.set(cardId, { before: existing ? existing.before : before, after });
    if (this.stagedFlushQueued) {
      return;
    }
    this.stagedFlushQueued = true;
    queueMicrotask(() => {
      this.stagedFlushQueued = false;
      const staged = this.takeStagedHistory();
      if (staged) {
        // Микротаск вне action: стек истории — observable.
        runInAction(() => this.recordStandaloneHistory(staged));
      }
    });
  }

  private nextLocalRev(): number {
    this.lastLocalRev = Math.max(Date.now(), this.lastLocalRev + 1);
    return this.lastLocalRev;
  }

  private applyLocal(writes: readonly SwimlaneCardLayerWrite[]): void {
    if (writes.length === 0) {
      return;
    }
    runInAction(() => {
      for (const { cardId, layer } of writes) {
        if (layer == null) {
          this.layers.delete(cardId);
        } else {
          this.layers.set(cardId, { cardId, layer, rev: this.nextLocalRev() });
        }
        if (!isLocalOnlyCardId(cardId)) {
          this.pendingWrites.set(cardId, layer);
        }
      }
    });
    this.scheduleFlush();
  }

  private scheduleFlush(): void {
    if (this.pendingWrites.size === 0) {
      return;
    }
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
    }
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      this.flush().catch(() => undefined);
    }, DELAYS.DEBOUNCE);
  }

  private async flush(): Promise<void> {
    const sprintId = this.resolveSprintId();
    if (sprintId == null || sprintId <= 0 || this.pendingWrites.size === 0) {
      this.pendingWrites.clear();
      return;
    }
    const writes = [...this.pendingWrites].map(([cardId, layer]) => ({ cardId, layer }));
    try {
      await saveSprintLaneLayers(sprintId, writes);
      for (const { cardId, layer } of writes) {
        if (this.pendingWrites.get(cardId) === layer) {
          this.pendingWrites.delete(cardId);
        }
      }
    } catch (error) {
      console.error('Error saving swimlane card layers:', error);
    }
  }
}
