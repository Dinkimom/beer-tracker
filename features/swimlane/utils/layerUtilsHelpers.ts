import type { TaskPosition } from '@/types';

import { getPositionSegmentRanges } from '@/lib/planner-timeline';

function rangesIntersectCells(
  a: { endCell: number; startCell: number },
  b: { endCell: number; startCell: number }
): boolean {
  return a.startCell < b.endCell && a.endCell > b.startCell;
}

function envelopeOfRanges(
  ranges: Array<{ endCell: number; startCell: number }>
): { endCell: number; startCell: number } {
  return {
    startCell: Math.min(...ranges.map((r) => r.startCell)),
    endCell: Math.max(...ranges.map((r) => r.endCell)),
  };
}

/**
 * Конфликт по времени для раскладки по слоям свимлейна.
 * Прямое пересечение сегментов — всегда конфликт; у задачи с несколькими
 * сегментами занят весь диапазон от первого до последнего (включая промежутки).
 */
export function taskPositionsIntersectInTime(a: TaskPosition, b: TaskPosition): boolean {
  const ra = getPositionSegmentRanges(a);
  const rb = getPositionSegmentRanges(b);
  if (ra.some((ia) => rb.some((ib) => rangesIntersectCells(ia, ib)))) {
    return true;
  }
  if (ra.length <= 1 && rb.length <= 1) {
    return false;
  }
  return rangesIntersectCells(envelopeOfRanges(ra), envelopeOfRanges(rb));
}

function intervalToCellRange(interval: { end: number; start: number }): {
  endCell: number;
  startCell: number;
} {
  return { startCell: interval.start, endCell: interval.end };
}

function positionRangesConflictWithInterval(
  position: TaskPosition,
  interval: { endCell: number; startCell: number }
): boolean {
  const ranges = getPositionSegmentRanges(position);
  if (ranges.some((r) => rangesIntersectCells(r, interval))) {
    return true;
  }
  if (ranges.length > 1) {
    return rangesIntersectCells(envelopeOfRanges(ranges), interval);
  }
  return false;
}

export function taskPositionConflictsWithBaseline(
  position: TaskPosition,
  baseline: { end: number; start: number }
): boolean {
  return positionRangesConflictWithInterval(position, intervalToCellRange(baseline));
}

export function swimlaneLayerItemsConflict(
  a: { baseline: { end: number; start: number } | null; position: TaskPosition },
  b: { baseline: { end: number; start: number } | null; position: TaskPosition }
): boolean {
  if (taskPositionsIntersectInTime(a.position, b.position)) {
    return true;
  }
  if (a.baseline && taskPositionConflictsWithBaseline(b.position, a.baseline)) {
    return true;
  }
  if (b.baseline && taskPositionConflictsWithBaseline(a.position, b.baseline)) {
    return true;
  }
  if (a.baseline && b.baseline && intersects(a.baseline, b.baseline)) {
    return true;
  }
  return false;
}

interface LayerInterval {
  end: number;
  id: string;
  start: number;
}

interface Interval {
  end: number;
  start: number;
}

function intersects(a: Interval, b: Interval): boolean {
  return a.start < b.end && a.end > b.start;
}

function findOpenLayerIndex<T>(
  item: T,
  layers: T[][],
  hasConflict: (item: T, other: T) => boolean
): number {
  return layers.findIndex((layer) => !layer.some((other) => hasConflict(item, other)));
}

function placeItemInLayers<T>(
  item: T,
  layers: T[][],
  hasConflict: (item: T, other: T) => boolean
): T[][] {
  const layerIndex = findOpenLayerIndex(item, layers, hasConflict);
  if (layerIndex < 0) {
    return [...layers, [item]];
  }
  return layers.map((layer, index) => (index === layerIndex ? [...layer, item] : layer));
}

function verticalLayerRangesOverlap(
  aStart: number,
  aSpan: number,
  aLayerShiftUp: number,
  bStart: number,
  bSpan: number,
  bLayerShiftUp: number
): boolean {
  const a = resolveEffectiveLayerRange(aStart, aSpan, aLayerShiftUp);
  const b = resolveEffectiveLayerRange(bStart, bSpan, bLayerShiftUp);
  return a.start < b.endExclusive && b.start < a.endExclusive;
}

function resolveEffectiveLayerRange(
  layer: number,
  span: number,
  layerShiftUp = 0
): { endExclusive: number; start: number } {
  const start = layer - layerShiftUp;
  return { start, endExclusive: start + Math.max(1, span) };
}

function spannedItemConflictsAtLayer<T>(
  item: T,
  span: number,
  layer: number,
  layerShiftUp: number,
  placed: Array<{ item: T; layer: number; layerShiftUp: number; span: number }>,
  hasTimeConflict: (item: T, other: T) => boolean
): boolean {
  return placed.some(
    (other) =>
      hasTimeConflict(item, other.item) &&
      verticalLayerRangesOverlap(
        layer,
        span,
        layerShiftUp,
        other.layer,
        other.span,
        other.layerShiftUp
      )
  );
}

/** Раскладка с вертикальным span: фото на n таймслотов занимает n слоёв. */
export function placeSpannedLayerItems<T extends { layerShiftUp?: number; span: number }>(
  items: T[],
  hasTimeConflict: (item: T, other: T) => boolean
): Array<{ item: T; layer: number }> {
  const placed: Array<{ item: T; layer: number; layerShiftUp: number; span: number }> = [];
  for (const item of items) {
    const span = Math.max(1, item.span);
    const layerShiftUp = Math.max(0, item.layerShiftUp ?? 0);
    let layer = 0;
    while (
      spannedItemConflictsAtLayer(item, span, layer, layerShiftUp, placed, hasTimeConflict)
    ) {
      layer += 1;
    }
    placed.push({ item, layer, layerShiftUp, span });
  }
  return placed.map(({ item, layer }) => ({ item, layer }));
}

export function distributeIntervalsToLayers(
  intervals: LayerInterval[]
): LayerInterval[][] {
  return intervals.reduce<LayerInterval[][]>((layers, interval) => {
    return placeItemInLayers(interval, layers, (item, other) =>
      intersects(
        { start: item.start, end: item.end },
        { start: other.start, end: other.end }
      )
    );
  }, []);
}
