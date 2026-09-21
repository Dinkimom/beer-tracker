/**
 * Геометрия свимлейна: перевод координат мыши / левого края карточки в ячейку сетки (day, part).
 * Не зависит от features/ — используется DnD и остальной UI свимлейна.
 */

import { PARTS_PER_DAY, WORKING_DAYS } from '@/constants';

function cellFromRelativeX(
  relativeX: number,
  totalWidth: number,
  workingDaysCount: number
): { day: number; part: number } | null {
  const maxDays = Math.max(1, workingDaysCount);
  const totalCells = maxDays * PARTS_PER_DAY;
  if (totalWidth <= 0 || totalCells <= 0) return null;
  const cellWidth = totalWidth / totalCells;
  const rawIndex = Math.floor(relativeX / cellWidth);
  const cellIndex = Math.max(0, Math.min(totalCells - 1, rawIndex));
  const day = Math.floor(cellIndex / PARTS_PER_DAY);
  const part = cellIndex % PARTS_PER_DAY;
  return { day, part };
}

/**
 * Вычисляет позицию ячейки из координат мыши (clientX в координатах viewport).
 * @param taskDuration зарезервировано под будущую логику (сейчас не используется); передаётся из DnD для стабильности API.
 */
export function calculateCellFromMouse(
  mouseX: number,
  swimlaneRect: DOMRect,
  _taskDuration: number,
  _swimlaneElement?: HTMLElement | null,
  workingDaysCount: number = WORKING_DAYS
): { day: number; part: number } | null {
  const relativeX = mouseX - swimlaneRect.left;
  return cellFromRelativeX(relativeX, swimlaneRect.width, workingDaysCount);
}

/**
 * Вычисляет позицию ячейки из левого края карточки относительно свимлейна.
 */
export function calculateCellFromElement(
  cardRect: DOMRect,
  swimlaneRect: DOMRect,
  _swimlaneElement?: HTMLElement | null,
  workingDaysCount: number = WORKING_DAYS
): { day: number; part: number } | null {
  const cardLeftX = cardRect.left - swimlaneRect.left;
  return cellFromRelativeX(cardLeftX, swimlaneRect.width, workingDaysCount);
}
