import type { PlacedSpannedLayerItem } from '@/features/swimlane/utils/layerUtilsHelpers';
import type { StickyNoteCardRowLayout } from '@/features/task/utils/stickyNoteCardRowResizeHelpers';
import type { Task, TaskPosition } from '@/types';

import { getPartsPerDay } from '@/constants';
import {
  distributeIntervalsToLayers,
  findSpannedLayerForItem,
  placeSpannedLayerItems,
  swimlaneLayerItemsConflict,
} from '@/features/swimlane/utils/layerUtilsHelpers';
import { getOrderedPlanSegments } from '@/features/swimlane/utils/positionUtils';
import { resolveStickyNoteEffectiveCardRowLayout } from '@/features/task/utils/stickyNoteCardRowResizeHelpers';
import {
  DEFAULT_PLANNER_COMMENT_CARD_ROW_HEIGHT,
  plannerCommentCardRowHeightFromDurationParts,
} from '@/lib/comments/plannerCommentCardRow';
import { positionToStartCell } from '@/lib/planner-timeline';
import {
  isPlannerNonTrackerCard,
  isSavedPlannerAnnotation,
  resolvePlannerCardKind,
} from '@/lib/planner/plannerCardKind';

interface TaskWithPosition {
  position: TaskPosition;
  task: Task;
}

interface SwimlaneTaskVerticalLayout {
  layerShiftUp: number;
  span: number;
}

function isQuickAddDraftTask(task: Task): boolean {
  return task.isLocalTask === true && !isSavedPlannerAnnotation(task);
}

/**
 * Вертикальный span карточки в упаковке слоёв.
 * - схема: 1:1 с длительностью, но не выше лимита строк, как при сохранении
 *   (`plannerCommentCardRowHeightFromDurationParts`, max 10);
 * - фото: ручной layout из карты, иначе дефолтная высота новой карточки;
 * - заметка и виджет: ручной layout из карты (у виджета — сохранённый `height`);
 * - задача: одна строка.
 */
function resolveSwimlaneTaskVerticalLayout(
  task: Pick<Task, 'id' | 'localDraftKind'>,
  position: Pick<TaskPosition, 'duration'>,
  stickyNoteCardRowById?: ReadonlyMap<string, StickyNoteCardRowLayout>
): SwimlaneTaskVerticalLayout {
  switch (resolvePlannerCardKind(task)) {
    case 'diagram':
      return { span: plannerCommentCardRowHeightFromDurationParts(position.duration), layerShiftUp: 0 };
    case 'image': {
      const override = stickyNoteCardRowById?.get(task.id);
      if (override) {
        return resolveStickyNoteEffectiveCardRowLayout(override);
      }
      return { span: DEFAULT_PLANNER_COMMENT_CARD_ROW_HEIGHT, layerShiftUp: 0 };
    }
    case 'note':
    case 'widget':
      return resolveStickyNoteEffectiveCardRowLayout(stickyNoteCardRowById?.get(task.id));
    default:
      return { span: 1, layerShiftUp: 0 };
  }
}

export function resolveSwimlaneCardLayerSpan(
  task: Pick<Task, 'id' | 'localDraftKind'>,
  position: Pick<TaskPosition, 'duration'>,
  stickyNoteCardRowById?: ReadonlyMap<string, StickyNoteCardRowLayout>
): number {
  return resolveSwimlaneTaskVerticalLayout(task, position, stickyNoteCardRowById).span;
}

export function buildSwimlaneTaskVerticalLayoutById(
  tasksWithPositions: TaskWithPosition[],
  stickyNoteCardRowById?: ReadonlyMap<string, StickyNoteCardRowLayout>
): Map<string, SwimlaneTaskVerticalLayout> {
  const layoutById = new Map<string, SwimlaneTaskVerticalLayout>();
  for (const { task, position } of tasksWithPositions) {
    layoutById.set(
      task.id,
      resolveSwimlaneTaskVerticalLayout(task, position, stickyNoteCardRowById)
    );
  }
  return layoutById;
}

export function buildSwimlaneTaskLayerSpanById(
  tasksWithPositions: TaskWithPosition[],
  stickyNoteCardRowById?: ReadonlyMap<string, StickyNoteCardRowLayout>
): Map<string, number> {
  const spanById = new Map<string, number>();
  for (const { task, position } of tasksWithPositions) {
    spanById.set(task.id, resolveSwimlaneCardLayerSpan(task, position, stickyNoteCardRowById));
  }
  return spanById;
}

/**
 * Распределяет задачи по слоям для избежания визуального пересечения
 * (учитывает несколько отрезков занятости у одной задачи).
 * Порядок укладки — по стартовой ячейке, при равном старте черновик quick-add последним.
 */
export interface SwimlaneLayerPackingItem {
  baseline: { end: number; start: number } | null;
  id: string;
  isQuickAddDraft: boolean;
  layerShiftUp: number;
  position: TaskPosition;
  span: number;
  startCell: number;
}

/** Слой, заданный вручную, и время правки (старшая запись удерживает место при конфликте). */
interface SwimlaneManualLayer {
  layer: number;
  rev: number;
}

function compareSwimlaneLayerPackingOrder(
  a: Pick<SwimlaneLayerPackingItem, 'isQuickAddDraft' | 'startCell'>,
  b: Pick<SwimlaneLayerPackingItem, 'isQuickAddDraft' | 'startCell'>
): number {
  return a.startCell - b.startCell || Number(a.isQuickAddDraft) - Number(b.isQuickAddDraft);
}

/** Элементы раскладки в порядке укладки. */
export function buildSwimlaneLayerPackingItems(
  tasksWithPositions: TaskWithPosition[],
  baselines: Array<{ end: number; start: number; taskId: string }> = [],
  stickyNoteCardRowById?: ReadonlyMap<string, StickyNoteCardRowLayout>
): SwimlaneLayerPackingItem[] {
  const baselineByTaskId = new Map(baselines.map((baseline) => [baseline.taskId, baseline]));
  const items = tasksWithPositions.map(({ task, position }) => {
    const verticalLayout = resolveSwimlaneTaskVerticalLayout(task, position, stickyNoteCardRowById);
    return {
      id: task.id,
      position,
      baseline: baselineByTaskId.get(task.id) ?? null,
      isQuickAddDraft: isQuickAddDraftTask(task),
      layerShiftUp: verticalLayout.layerShiftUp,
      span: verticalLayout.span,
      startCell: positionToStartCell(position),
    };
  });
  items.sort(compareSwimlaneLayerPackingOrder);
  return items;
}

export type PlacedSwimlaneLayerItem = PlacedSpannedLayerItem<SwimlaneLayerPackingItem>;

/**
 * Раскладка строки. Без ручных слоёв — жадная авторасстановка.
 * С ручными: карточки со слоем стоят на своих слоях; последняя правленная остаётся на месте,
 * а мешающие ей соседи сдвигаются вниз. Затем карточки без слоя — жадно в свободные места.
 * `autoOrder` — порядок появления карточек без слоя: новая укладывается последней и занимает
 * свободное место, а не вытесняет соседей.
 */
export function placeSwimlaneLayerItems(
  tasksWithPositions: TaskWithPosition[],
  baselines: Array<{ end: number; start: number; taskId: string }> = [],
  stickyNoteCardRowById?: ReadonlyMap<string, StickyNoteCardRowLayout>,
  manualLayers?: ReadonlyMap<string, SwimlaneManualLayer>,
  autoOrder?: ReadonlyMap<string, number>
): PlacedSwimlaneLayerItem[] {
  const items = buildSwimlaneLayerPackingItems(tasksWithPositions, baselines, stickyNoteCardRowById);
  if (autoOrder) {
    const orderOf = (id: string) => autoOrder.get(id) ?? Number.POSITIVE_INFINITY;
    // sort стабилен: без номера (ещё не виденные) — в порядке укладки в конце.
    items.sort((a, b) => {
      const diff = orderOf(a.id) - orderOf(b.id);
      return Number.isNaN(diff) ? 0 : diff;
    });
  }
  if (!manualLayers || manualLayers.size === 0) {
    return placeSpannedLayerItems(items, swimlaneLayerItemsConflict);
  }
  const manual: Array<{ item: SwimlaneLayerPackingItem; manual: SwimlaneManualLayer }> = [];
  const auto: SwimlaneLayerPackingItem[] = [];
  for (const item of items) {
    const entry = manualLayers.get(item.id);
    if (entry) {
      manual.push({ item, manual: entry });
    } else {
      auto.push(item);
    }
  }
  // sort стабилен: при равном rev остаётся прежний порядок.
  manual.sort((a, b) => a.manual.rev - b.manual.rev);
  // Последнюю правленную карточку (ресайз, перенос по времени) не двигаем: мешающие ей
  // соседи сдвигаются вниз, как при вставке дропом.
  const edited = manual.pop();
  let placed: PlacedSwimlaneLayerItem[] = [];
  for (const { item, manual: entry } of manual) {
    placed.push(findSpannedLayerForItem(item, placed, swimlaneLayerItemsConflict, entry.layer));
  }
  if (edited) {
    placed = insertSwimlaneLayerItemInLane(placed, edited.item, Math.floor(edited.manual.layer)).placed;
  }
  for (const item of auto) {
    placed.push(findSpannedLayerForItem(item, placed, swimlaneLayerItemsConflict));
  }
  return compactSwimlaneLayerRows(placed);
}

function placedRowStart(entry: PlacedSwimlaneLayerItem): number {
  return entry.layer - entry.layerShiftUp;
}

function isSortedByRowStart(placed: readonly PlacedSwimlaneLayerItem[]): boolean {
  for (let index = 1; index < placed.length; index++) {
    if (placedRowStart(placed[index - 1]!) > placedRowStart(placed[index]!)) {
      return false;
    }
  }
  return true;
}

/** Строка в порядке строк сверху вниз: вставка на каждую ячейку под курсором не сортирует заново. */
export function sortSwimlaneLayerItemsByRow(placed: readonly PlacedSwimlaneLayerItem[]): PlacedSwimlaneLayerItem[] {
  return [...placed].sort((a, b) => placedRowStart(a) - placedRowStart(b));
}

function placedRowsOverlap(a: PlacedSwimlaneLayerItem, b: PlacedSwimlaneLayerItem): boolean {
  const aStart = placedRowStart(a);
  const bStart = placedRowStart(b);
  return aStart < bStart + Math.max(1, b.span) && bStart < aStart + Math.max(1, a.span);
}

/**
 * Схлопывает подстроки, в которых не осталось ни одной карточки: всё, что ниже, поднимается.
 * Карточки по-прежнему не всплывают сами — исчезает только полностью пустой уровень.
 */
function compactSwimlaneLayerRows(placed: readonly PlacedSwimlaneLayerItem[]): PlacedSwimlaneLayerItem[] {
  const occupied = new Set<number>();
  let lastRow = -1;
  for (const entry of placed) {
    const start = placedRowStart(entry);
    const end = start + Math.max(1, entry.span);
    for (let row = Math.max(0, start); row < end; row++) {
      occupied.add(row);
    }
    lastRow = Math.max(lastRow, end - 1);
  }
  const emptyBelow: number[] = [];
  let empty = 0;
  for (let row = 0; row <= lastRow; row++) {
    emptyBelow[row] = empty;
    if (!occupied.has(row)) {
      empty++;
    }
  }
  if (empty === 0) {
    return [...placed];
  }
  return placed.map((entry) => {
    const shift = emptyBelow[placedRowStart(entry)] ?? 0;
    return shift > 0 ? { ...entry, layer: entry.layer - shift } : entry;
  });
}

/**
 * Дроп карточки на ряд под ней (`hoverLayer`: `k` — верхняя половина ряда, `k + 0.5` — нижняя).
 * Свободно в ряду `k` — встаёт туда. Занято — вставляется над соседом (верхняя половина)
 * или под ним (нижняя); мешающие ей по времени карточки сдвигаются вниз каскадом,
 * остальные остаются на месте. Пустые подстроки схлопываются.
 * `placed` — строка без перетаскиваемой карточки.
 */
export function insertSwimlaneLayerItemInLane(
  placed: readonly PlacedSwimlaneLayerItem[],
  item: SwimlaneLayerPackingItem,
  hoverLayer: number
): { layer: number; placed: PlacedSwimlaneLayerItem[]; pushesCards: boolean } {
  const row = Math.max(0, Math.floor(hoverLayer));
  const free = findSpannedLayerForItem(item, placed, swimlaneLayerItemsConflict, row);
  if (free.layer === row) {
    return withCompactedItem([...placed, free], item.id, false);
  }
  const targetLayer = hoverLayer - row >= 0.5 ? row + 1 : row;
  const inserted = findSpannedLayerForItem(item, [], swimlaneLayerItemsConflict, targetLayer);
  const fixed: PlacedSwimlaneLayerItem[] = [inserted];
  // До вставки строка без пересечений: проверять соседа нужно только против сдвинутых.
  const moved: PlacedSwimlaneLayerItem[] = [inserted];
  const byRow = isSortedByRowStart(placed)
    ? placed
    : [...placed].sort((a, b) => placedRowStart(a) - placedRowStart(b));
  for (const entry of byRow) {
    // Сначала дешёвая проверка по строкам, потом конфликт по времени.
    const blocked = moved.some(
      (other) => placedRowsOverlap(entry, other) && swimlaneLayerItemsConflict(entry.item, other.item)
    );
    if (!blocked) {
      fixed.push(entry);
      continue;
    }
    const shifted = findSpannedLayerForItem(entry.item, fixed, swimlaneLayerItemsConflict, entry.layer);
    fixed.push(shifted);
    moved.push(shifted);
  }
  return withCompactedItem(fixed, item.id, moved.length > 1);
}

function withCompactedItem(
  placed: readonly PlacedSwimlaneLayerItem[],
  itemId: string,
  pushesCards: boolean
): { layer: number; placed: PlacedSwimlaneLayerItem[]; pushesCards: boolean } {
  const compacted = compactSwimlaneLayerRows(placed);
  const layer = compacted.find((entry) => entry.item.id === itemId)?.layer ?? 0;
  return { layer, placed: compacted, pushesCards };
}

export function swimlaneLayerMapFromPlaced(placed: readonly PlacedSwimlaneLayerItem[]): Map<string, number> {
  const layerMap = new Map<string, number>();
  for (const { item, layer } of placed) {
    layerMap.set(item.id, layer);
  }
  return layerMap;
}

export function distributeTasksToLayers(
  tasksWithPositions: TaskWithPosition[],
  baselines: Array<{ end: number; start: number; taskId: string }> = [],
  stickyNoteCardRowById?: ReadonlyMap<string, StickyNoteCardRowLayout>,
  manualLayers?: ReadonlyMap<string, SwimlaneManualLayer>,
  autoOrder?: ReadonlyMap<string, number>
): Map<string, number> {
  return swimlaneLayerMapFromPlaced(
    placeSwimlaneLayerItems(tasksWithPositions, baselines, stickyNoteCardRowById, manualLayers, autoOrder)
  );
}

/**
 * Автосортировка: слой новой карточки при вставке в разложенную строку. Жадная укладка
 * не смотрит вперёд, поэтому слой зависит только от карточек раньше в порядке укладки
 * (при равном старте — по `inputOrder`; без него новая последней).
 */
export function placeSwimlaneLayerItemInAutoLane(
  placed: readonly PlacedSwimlaneLayerItem[],
  item: SwimlaneLayerPackingItem,
  /** Порядок карточек в карте позиций: при равном старте раскладка идёт по нему. */
  inputOrder?: ReadonlyMap<string, number>
): PlacedSwimlaneLayerItem {
  const orderOf = (id: string) => inputOrder?.get(id) ?? Number.POSITIVE_INFINITY;
  const firstAfter = placed.findIndex((entry) => {
    const packing = compareSwimlaneLayerPackingOrder(entry.item, item);
    return packing > 0 || (packing === 0 && orderOf(entry.item.id) > orderOf(item.id));
  });
  const before = firstAfter < 0 ? placed : placed.slice(0, firstAfter);
  return findSpannedLayerForItem(item, before, swimlaneLayerItemsConflict);
}

/**
 * Слой новой (или только что перенесённой) карточки в разложенной строке: её правка самая
 * свежая, поэтому она уступает всем — первый свободный слой не выше `minLayer`.
 */
export function placeSwimlaneLayerItemInLane(
  placed: readonly PlacedSwimlaneLayerItem[],
  item: SwimlaneLayerPackingItem,
  minLayer = 0
): PlacedSwimlaneLayerItem {
  return findSpannedLayerForItem(item, placed, swimlaneLayerItemsConflict, minLayer);
}

/**
 * Вычисляет бейзлайны (отклонения от плана) для задач — только от конца последнего сегмента при отставании.
 */
export function calculateBaselines(
  tasksWithPositions: TaskWithPosition[],
  currentCell: number
): Array<{ end: number, start: number; taskId: string; }> {
  const baselines: Array<{ end: number, start: number; taskId: string; }> = [];

  tasksWithPositions.forEach(({ task, position }) => {
    if (isPlannerNonTrackerCard(task)) {
      return;
    }
    if (task.status !== 'in-progress' && task.status !== 'todo') return;
    const segments = getOrderedPlanSegments(position);
    const lastSegment = segments.at(-1);
    if (lastSegment == null) return;

    const startCell = lastSegment.startDay * getPartsPerDay() + lastSegment.startPart;
    const plannedEndCell = startCell + lastSegment.duration;
    if (plannedEndCell < currentCell) {
      baselines.push({
        taskId: task.id,
        start: plannedEndCell,
        end: currentCell,
      });
    }
  });

  return baselines;
}

/**
 * Распределяет бейзлайны по слоям
 */
export function distributeBaselinesToLayers(
  baselines: Array<{ end: number, start: number; taskId: string; }>
): Map<string, number> {
  const intervals = baselines.map((baseline) => ({
    id: baseline.taskId,
    start: baseline.start,
    end: baseline.end,
  }));

  const layers = distributeIntervalsToLayers(intervals);
  const layerMap = new Map<string, number>();

  layers.forEach((layer, layerIndex) => {
    layer.forEach(({ id }) => {
      layerMap.set(id, layerIndex);
    });
  });

  return layerMap;
}

