import type { PlacedSwimlaneLayerItem, SwimlaneLayerPackingItem } from '@/features/swimlane/utils/layerUtils';
import type { SwimlaneCardLayerWrite } from '@/lib/swimlane/swimlaneCardLayers';
import type { TaskPosition } from '@/types';

import { insertSwimlaneLayerItemInLane } from '@/features/swimlane/utils/layerUtils';
import { positionToStartCell } from '@/lib/planner-timeline';

/**
 * Последняя раскладка каждой отрисованной строки (laneId = `data-swimlane`).
 * Нужна вне React: drag-end считает итоговый слой по той же раскладке, что и превью дропа.
 */
interface RegisteredLane {
  placed: readonly PlacedSwimlaneLayerItem[];
  /** Автосортировка строки без ручных слоёв (для фиксации при выключении), считается по запросу. */
  computeAuto: () => readonly PlacedSwimlaneLayerItem[];
  /** Карточка на новой позиции в этой строке (бейзлайн, высота) — как её разложит строка. */
  packItem?: (cardId: string, position: TaskPosition) => SwimlaneLayerPackingItem | null;
}

const lanes = new Map<string, RegisteredLane>();

export function registerSwimlaneLaneLayout(laneId: string, lane: RegisteredLane): () => void {
  lanes.set(laneId, lane);
  return () => {
    if (lanes.get(laneId) === lane) {
      lanes.delete(laneId);
    }
  };
}

function findPlacedCard(cardId: string): PlacedSwimlaneLayerItem | undefined {
  for (const { placed } of lanes.values()) {
    const entry = placed.find(({ item }) => item.id === cardId);
    if (entry) {
      return entry;
    }
  }
  return undefined;
}

/**
 * Дроп карточки в строку: она встаёт на слой под верхним краем, мешающие ей соседи
 * сдвигаются вниз, пустые подстроки схлопываются. Возвращает её слой и слои всей строки.
 */
export function resolveSwimlaneCardDropInLane(input: {
  cardId: string;
  /** Карточка на новой позиции, как её разложит строка (с бейзлайном); иначе — по старому месту. */
  item?: SwimlaneLayerPackingItem | null;
  placed: readonly PlacedSwimlaneLayerItem[];
  position: TaskPosition;
  /** Слой верхнего края карточки под курсором. */
  targetTopLayer: number;
}): { layer: number; writes: SwimlaneCardLayerWrite[] } {
  const others = input.placed.filter(({ item }) => item.id !== input.cardId);
  const source = input.placed.find(({ item }) => item.id === input.cardId)?.item ?? findPlacedCard(input.cardId)?.item;
  const item: SwimlaneLayerPackingItem = input.item ?? {
    baseline: null,
    id: input.cardId,
    isQuickAddDraft: source?.isQuickAddDraft ?? false,
    layerShiftUp: source?.layerShiftUp ?? 0,
    position: input.position,
    span: source?.span ?? 1,
    startCell: positionToStartCell(input.position),
  };
  const { layer, placed } = insertSwimlaneLayerItemInLane(
    others,
    item,
    Math.max(0, input.targetTopLayer) + item.layerShiftUp
  );
  return { layer, writes: placed.map((entry) => ({ cardId: entry.item.id, layer: entry.layer })) };
}

export function resolveRegisteredSwimlaneCardDrop(input: {
  cardId: string;
  laneId: string;
  position: TaskPosition;
  targetTopLayer: number;
}): { layer: number; writes: SwimlaneCardLayerWrite[] } {
  const lane = lanes.get(input.laneId);
  return resolveSwimlaneCardDropInLane({
    ...input,
    item: lane?.packItem?.(input.cardId, input.position),
    placed: lane?.placed ?? [],
  });
}

/**
 * Слои карточек, которые сейчас стоят автоматически. Их фиксируют при первой ручной правке:
 * иначе освободившееся место заняла бы соседняя авто-карточка и доска «поехала» бы сама.
 */
export function collectSwimlaneAutoLayerWrites(
  manualLayers: { has: (cardId: string) => boolean }
): SwimlaneCardLayerWrite[] {
  const writes: SwimlaneCardLayerWrite[] = [];
  for (const { placed } of lanes.values()) {
    for (const { item, layer } of placed) {
      if (!manualLayers.has(item.id) && !item.id.startsWith('local-')) {
        writes.push({ cardId: item.id, layer });
      }
    }
  }
  return writes;
}

/** Слои автосортировки для всех карточек отрисованных строк (фиксация при выключении режима). */
export function collectSwimlaneArrangeWrites(): SwimlaneCardLayerWrite[] {
  const writes: SwimlaneCardLayerWrite[] = [];
  for (const { computeAuto } of lanes.values()) {
    for (const { item, layer } of computeAuto()) {
      writes.push({ cardId: item.id, layer });
    }
  }
  return writes;
}
