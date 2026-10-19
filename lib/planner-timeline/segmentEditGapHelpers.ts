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
