import { scanOffCellBlock, scanOnCellBlock } from './occupancyCellHelpers';

function countWorkCells(cells: boolean[]): number {
  return cells.reduce((sum, on) => sum + (on ? 1 : 0), 0);
}

/** Индексы ячеек, после которых можно вставить разрыв (`true|true`). */
export function listSegmentSplitPoints(cells: boolean[]): number[] {
  const points: number[] = [];
  for (let i = 0; i < cells.length - 1; i += 1) {
    if (cells[i] && cells[i + 1]) {
      points.push(i);
    }
  }
  return points;
}

/**
 * Off-блоки внутри диапазона (места разрыва) с индексами в `cells`.
 * Leading/trailing off обычно нет (envelope по ON), но учитываем любые.
 */
export function listSegmentGapBlocks(
  cells: boolean[]
): Array<{ startIndex: number; length: number }> {
  const gaps: Array<{ startIndex: number; length: number }> = [];
  let i = 0;
  while (i < cells.length) {
    if (cells[i]) {
      i = scanOnCellBlock(cells, i).nextIndex;
      continue;
    }
    const block = scanOffCellBlock(cells, i);
    gaps.push({ startIndex: i, length: block.endIndex - i });
    i = block.nextIndex;
  }
  return gaps;
}

/**
 * Вставляет одну пустую ячейку после `afterIndex`, сдвигая хвост вправо.
 * Число рабочих (`true`) ячеек не меняется.
 */
export function insertSegmentGapAfter(
  cells: boolean[],
  afterIndex: number,
  maxLength: number
): boolean[] | null {
  if (afterIndex < 0 || afterIndex >= cells.length - 1) {
    return null;
  }
  if (!cells[afterIndex] || !cells[afterIndex + 1]) {
    return null;
  }
  if (cells.length >= maxLength) {
    return null;
  }
  const next = [...cells];
  next.splice(afterIndex + 1, 0, false);
  return next;
}

/**
 * Схлопывает contiguous off-блок, содержащий `indexInGap`.
 * Число рабочих ячеек не меняется.
 */
export function removeSegmentGapBlock(cells: boolean[], indexInGap: number): boolean[] | null {
  if (indexInGap < 0 || indexInGap >= cells.length || cells[indexInGap]) {
    return null;
  }
  let start = indexInGap;
  while (start > 0 && !cells[start - 1]) {
    start -= 1;
  }
  let end = indexInGap + 1;
  while (end < cells.length && !cells[end]) {
    end += 1;
  }
  const next = [...cells.slice(0, start), ...cells.slice(end)];
  if (next.length === 0 || countWorkCells(next) === 0) {
    return null;
  }
  return next;
}

export function segmentEditWorkCellCount(cells: boolean[]): number {
  return countWorkCells(cells);
}

function countOnRunBackward(cells: boolean[], fromIndex: number): number {
  let count = 0;
  for (let i = fromIndex; i >= 0 && cells[i]; i -= 1) {
    count += 1;
  }
  return count;
}

function countOnRunForward(cells: boolean[], fromIndex: number): number {
  let count = 0;
  for (let i = fromIndex; i < cells.length && cells[i]; i += 1) {
    count += 1;
  }
  return count;
}

function findGapEnd(cells: boolean[], gapStart: number): number {
  let end = gapStart;
  while (end < cells.length && !cells[end]) {
    end += 1;
  }
  return end;
}

function isGapStart(cells: boolean[], gapStart: number): boolean {
  return gapStart > 0 && gapStart < cells.length && !cells[gapStart] && cells[gapStart - 1];
}

/**
 * Меняет длину разрыва, начинающегося в `gapStart`; хвост сдвигается.
 * Длина зажимается в `[minLength, …]` так, чтобы диапазон не превысил `maxLength`.
 * `null` — если разрыва нет или длина не изменилась.
 */
export function resizeSegmentGap(
  cells: boolean[],
  gapStart: number,
  nextLength: number,
  maxLength: number,
  minLength = 1
): boolean[] | null {
  if (!isGapStart(cells, gapStart)) {
    return null;
  }
  const gapEnd = findGapEnd(cells, gapStart);
  const currentLength = gapEnd - gapStart;
  const maxGapLength = currentLength + Math.max(0, maxLength - cells.length);
  const length = Math.min(maxGapLength, Math.max(minLength, Math.round(nextLength)));
  if (length === currentLength) {
    return null;
  }
  return [
    ...cells.slice(0, gapStart),
    ...Array.from({ length }, () => false),
    ...cells.slice(gapEnd),
  ];
}

/**
 * Сдвигает разрыв на `delta` ячеек: рабочие ячейки перетекают между соседними отрезками.
 * Оба соседа сохраняют хотя бы одну ячейку. Длина диапазона не меняется.
 */
export function moveSegmentGap(
  cells: boolean[],
  gapStart: number,
  delta: number
): boolean[] | null {
  if (!isGapStart(cells, gapStart)) {
    return null;
  }
  const gapEnd = findGapEnd(cells, gapStart);
  const maxLeft = countOnRunBackward(cells, gapStart - 1) - 1;
  const maxRight = countOnRunForward(cells, gapEnd) - 1;
  const shift = Math.min(maxRight, Math.max(-maxLeft, Math.round(delta)));
  if (shift === 0) {
    return null;
  }
  const before = cells.slice(0, gapStart);
  const gap = cells.slice(gapStart, gapEnd);
  const after = cells.slice(gapEnd);
  if (shift < 0) {
    return [...before.slice(0, shift), ...gap, ...before.slice(shift), ...after];
  }
  return [...before, ...after.slice(0, shift), ...gap, ...after.slice(shift)];
}

/**
 * Ближайшая к `cellOffset` (дробная позиция в ячейках от начала диапазона) точка разреза
 * не дальше `maxDistance` ячеек. Точка `i` — граница после ячейки `i`, т.е. на смещении `i + 1`.
 */
export function nearestSegmentSplitPoint(
  splitPoints: readonly number[],
  cellOffset: number,
  maxDistance = Number.POSITIVE_INFINITY
): number | null {
  let best: number | null = null;
  let bestDistance = maxDistance;
  for (const point of splitPoints) {
    const distance = Math.abs(point + 1 - cellOffset);
    if (distance <= bestDistance) {
      best = point;
      bestDistance = distance;
    }
  }
  return best;
}
