/**
 * Геометрия свимлейна: перевод координат мыши / левого края карточки в ячейку сетки (day, part).
 * Не зависит от features/ — используется DnD и остальной UI свимлейна.
 */

import { WORKING_DAYS, getPartsPerDay } from '@/constants';

import { clampSwimlaneStartCell, swimlaneCellFromStartCell } from './clampSwimlaneStartCell';

function cellFromRelativeX(
  relativeX: number,
  totalWidth: number,
  workingDaysCount: number,
  durationParts: number
): { day: number; part: number } | null {
  const maxDays = Math.max(1, workingDaysCount);
  const partsPerDay = getPartsPerDay();
  const totalCells = maxDays * partsPerDay;
  if (totalWidth <= 0 || totalCells <= 0) return null;
  const cellWidth = totalWidth / totalCells;
  const rawIndex = Math.floor(relativeX / cellWidth);
  const cellIndex = clampSwimlaneStartCell(rawIndex, durationParts, totalCells);
  return swimlaneCellFromStartCell(cellIndex, partsPerDay);
}

/**
 * Ячейка под курсором (clientX): `floor` — превью появляется при наведении на ячейку.
 * `taskDuration` ограничивает старт так, чтобы карточка целиком оставалась в спринте.
 */
export function calculateCellFromMouse(
  mouseX: number,
  swimlaneRect: DOMRect,
  taskDuration: number,
  _swimlaneElement?: HTMLElement | null,
  workingDaysCount: number = WORKING_DAYS
): { day: number; part: number } | null {
  const relativeX = mouseX - swimlaneRect.left;
  return cellFromRelativeX(relativeX, swimlaneRect.width, workingDaysCount, taskDuration);
}

/**
 * Вычисляет позицию ячейки из левого края карточки относительно свимлейна.
 * `taskDuration` — как у мыши: старт не дальше, чем позволяет длина карточки.
 */
export function calculateCellFromElement(
  cardRect: DOMRect,
  swimlaneRect: DOMRect,
  _swimlaneElement?: HTMLElement | null,
  workingDaysCount: number = WORKING_DAYS,
  taskDuration: number = 1
): { day: number; part: number } | null {
  const cardLeftX = cardRect.left - swimlaneRect.left;
  return cellFromRelativeX(cardLeftX, swimlaneRect.width, workingDaysCount, taskDuration);
}
