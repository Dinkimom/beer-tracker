import type { CellPosition } from './swimlaneDragTypes';

import { WORKING_DAYS, PARTS_PER_DAY } from '@/constants';

/**
 * Валидирует позицию ячейки
 */
export function isValidCell(
  cell: CellPosition | null,
  workingDaysCount: number = WORKING_DAYS
): boolean {
  if (!cell) return false;
  const maxDays = Math.max(1, workingDaysCount);
  return (
    cell.day >= 0 && cell.day < maxDays && cell.part >= 0 && cell.part < PARTS_PER_DAY
  );
}

/** Для превью DnD: не дергать setState, если ячейка не сменилась (сильно снижает ререндеры на dragOver). */
export function areCellPositionsEqual(a: CellPosition | null, b: CellPosition | null): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  return a.assigneeId === b.assigneeId && a.day === b.day && a.part === b.part;
}

/**
 * Извлекает assigneeId из ID элемента
 */
export function extractAssigneeId(overId: string): string | null {
  const cellMatch = overId.match(/^cell-([^-]+(?:-[^-]+)*)-(\d+)-(\d+)$/);
  if (cellMatch) {
    return cellMatch[1];
  }

  const swimlaneMatch = overId.match(/^swimlane-(.+)$/);
  if (swimlaneMatch) {
    return swimlaneMatch[1];
  }

  return null;
}

/**
 * Извлекает позицию ячейки из ID элемента
 */
export function extractCellFromId(overId: string): CellPosition | null {
  const cellMatch = overId.match(/^cell-([^-]+(?:-[^-]+)*)-(\d+)-(\d+)$/);
  if (!cellMatch) {
    return null;
  }

  const [, assigneeId, dayStr, partStr] = cellMatch;
  const day = parseInt(dayStr, 10);
  const part = parseInt(partStr, 10);

  if (isNaN(day) || isNaN(part)) {
    return null;
  }

  return { assigneeId, day, part };
}
