import type { PlacedSwimlaneLayerItem } from '@/features/swimlane/utils/layerUtils';
import type { TaskPosition } from '@/types';

import { getPartsPerDay } from '@/constants';
import {
  placeSwimlaneLayerItemInAutoLane,
  placeSwimlaneLayerItemInLane,
} from '@/features/swimlane/utils/layerUtils';
import { getPositionSegmentRanges } from '@/lib/planner-timeline';

/** Параметры позиционирования «+» в ячейке (stacked-слои при заранее расширенной строке). */
export function resolveSwimlaneQuickAddBandLayout(params: {
  contentHasTaskOverlaps: boolean;
  maxTaskLayers: number;
  oneCardHeightPx: number;
  singleRowLayerHeight: number;
}): { hasTaskOverlaps: boolean; layerHeight: number } {
  const usesStackedLayers = params.contentHasTaskOverlaps || params.maxTaskLayers > 1;
  return {
    hasTaskOverlaps: usesStackedLayers,
    layerHeight: usesStackedLayers ? params.oneCardHeightPx : params.singleRowLayerHeight,
  };
}

/** Adds half-open cell range [startCell, endCell) into the occupied set. */
function addCellRangeToOccupied(
  occupied: Set<number>,
  startCell: number,
  endCell: number
): void {
  for (let cell = startCell; cell < endCell; cell++) {
    occupied.add(cell);
  }
}

/** Индексы ячеек (day * getPartsPerDay() + part), занятых задачами в строке свимлейна. */
export function buildSwimlaneOccupiedCellIndices(
  positions: Iterable<TaskPosition>
): Set<number> {
  const occupied = new Set<number>();
  for (const position of positions) {
    for (const { startCell, endCell } of getPositionSegmentRanges(position)) {
      addCellRangeToOccupied(occupied, startCell, endCell);
    }
  }
  return occupied;
}

/**
 * Не даёт превью «+» вылезти в соседний свимлейн.
 * Возвращает null, если слот карточки не помещается в строку.
 */
export function clampSwimlaneQuickAddBandBox(
  box: { height?: number | string; top?: number | string },
  clipHeight: number
): { height: string; top: string } | null {
  const top = Number.parseFloat(String(box.top ?? ''));
  const height = Number.parseFloat(String(box.height ?? ''));
  const fits =
    Number.isFinite(top) &&
    Number.isFinite(height) &&
    height > 0 &&
    top >= 0 &&
    top + height <= clipHeight;
  if (fits) {
    return { top: `${top}px`, height: `${height}px` };
  }
  return null;
}

/**
 * Слот под кнопку «+»: тот же слой, который займёт черновик (и потом сохранённая карточка).
 * В ручном режиме — первое свободное место; при автосортировке — место по жадной укладке. Высота слота = span карточки (фото — две строки).
 * Старт может быть на любом уже видимом слое; span может уйти ниже строки — она вырастет.
 * Если подходящий слой выше видимых — null.
 */
export function resolveSwimlaneQuickAddLayerBand(input: {
  /** Автосортировка: слот там, куда жадная укладка поставит черновик (может подвинуть соседей). */
  autoArrange?: boolean;
  durationCells: number;
  lane: readonly PlacedSwimlaneLayerItem[] | undefined;
  maxTaskLayers: number;
  span?: number;
  startCell: number;
}): { layer: number; span: number } | null {
  const span = Math.max(1, input.span ?? 1);
  const partsPerDay = getPartsPerDay();
  const place = input.autoArrange ? placeSwimlaneLayerItemInAutoLane : placeSwimlaneLayerItemInLane;
  const { layer } = place(input.lane ?? [], {
    baseline: null,
    id: '',
    isQuickAddDraft: true,
    layerShiftUp: 0,
    position: {
      assignee: '',
      duration: Math.max(1, input.durationCells),
      startDay: Math.floor(input.startCell / partsPerDay),
      startPart: input.startCell % partsPerDay,
      taskId: '',
    },
    span,
    startCell: input.startCell,
  });
  return layer <= Math.max(0, input.maxTaskLayers - 1) ? { layer, span } : null;
}
