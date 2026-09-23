import type { TaskPosition } from '@/types';

import { getPositionSegmentRanges } from '@/lib/planner-timeline';

const EMPTY_OCCUPIED_LAYERS: ReadonlySet<number> = new Set();

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

function addCellRangeLayer(
  occupiedLayersByCell: Map<number, Set<number>>,
  startCell: number,
  endCell: number,
  layer: number
): void {
  for (let cell = startCell; cell < endCell; cell++) {
    const layers = occupiedLayersByCell.get(cell);
    if (layers) {
      layers.add(layer);
      continue;
    }
    occupiedLayersByCell.set(cell, new Set([layer]));
  }
}

function addCellRangeLayerSpan(
  occupiedLayersByCell: Map<number, Set<number>>,
  startCell: number,
  endCell: number,
  layer: number,
  span: number
): void {
  const lastLayer = layer + Math.max(1, span);
  for (let occupiedLayer = layer; occupiedLayer < lastLayer; occupiedLayer++) {
    addCellRangeLayer(occupiedLayersByCell, startCell, endCell, occupiedLayer);
  }
}

function occupyTaskLayerCells(
  occupiedLayersByCell: Map<number, Set<number>>,
  taskId: string,
  startCell: number,
  endCell: number,
  taskLayerMap: Map<string, number>,
  taskVerticalLayoutById?: Map<string, { layerShiftUp: number; span: number }>,
  taskLayerSpanById?: Map<string, number>
): void {
  const layer = taskLayerMap.get(taskId) ?? 0;
  const layout = taskVerticalLayoutById?.get(taskId);
  const span = Math.max(1, layout?.span ?? taskLayerSpanById?.get(taskId) ?? 1);
  const layerShiftUp = Math.max(0, layout?.layerShiftUp ?? 0);
  const startLayer = layer - layerShiftUp;
  addCellRangeLayerSpan(occupiedLayersByCell, startCell, endCell, startLayer, span);
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

/** Слои карточек и overdue-бейзлайнов в каждой ячейке (day * getPartsPerDay() + part). */
export function buildSwimlaneOccupiedLayersByCell(
  positions: Iterable<TaskPosition>,
  taskLayerMap: Map<string, number>,
  taskLayerSpanById?: Map<string, number>,
  baselines?: Iterable<{ end: number; start: number; taskId: string }>,
  taskVerticalLayoutById?: Map<string, { layerShiftUp: number; span: number }>
): Map<number, Set<number>> {
  const occupiedLayersByCell = new Map<number, Set<number>>();
  for (const position of positions) {
    for (const { startCell, endCell } of getPositionSegmentRanges(position)) {
      occupyTaskLayerCells(
        occupiedLayersByCell,
        position.taskId,
        startCell,
        endCell,
        taskLayerMap,
        taskVerticalLayoutById,
        taskLayerSpanById
      );
    }
  }
  for (const baseline of baselines ?? []) {
    occupyTaskLayerCells(
      occupiedLayersByCell,
      baseline.taskId,
      baseline.start,
      baseline.end,
      taskLayerMap,
      taskVerticalLayoutById,
      taskLayerSpanById
    );
  }
  return occupiedLayersByCell;
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
 * Свободный вертикальный слот под кнопку «+».
 * Высота слота = span карточки (фото — две строки). Если текущие слои заняты — null.
 * Старт может быть на любом уже видимом слое; span может уйти ниже строки — она вырастет.
 */
export function resolveSwimlaneQuickAddLayerBand(
  occupiedLayers: ReadonlySet<number> | undefined,
  maxTaskLayers: number,
  span = 1
): { layer: number; span: number } | null {
  const needed = Math.max(1, span);
  const occupied = occupiedLayers ?? EMPTY_OCCUPIED_LAYERS;
  const lastStart = Math.max(0, maxTaskLayers - 1);
  for (let layer = 0; layer <= lastStart; layer++) {
    if (isLayerRangeFree(occupied, layer, needed)) {
      return { layer, span: needed };
    }
  }
  return null;
}

function isLayerRangeFree(
  occupied: ReadonlySet<number>,
  startLayer: number,
  span: number
): boolean {
  for (let offset = 0; offset < span; offset++) {
    if (occupied.has(startLayer + offset)) {
      return false;
    }
  }
  return true;
}

/** Объединяет занятые слои на ширине постановки (фото занимает две клетки). */
export function collectOccupiedLayersForCellRange(
  occupiedLayersByCell: Map<number, Set<number>> | undefined,
  startCell: number,
  durationCells: number
): Set<number> {
  const union = new Set<number>();
  const lastCell = startCell + Math.max(1, durationCells);
  for (let cell = startCell; cell < lastCell; cell++) {
    const layers = occupiedLayersByCell?.get(cell);
    if (!layers) {
      continue;
    }
    for (const layer of layers) {
      union.add(layer);
    }
  }
  return union;
}
