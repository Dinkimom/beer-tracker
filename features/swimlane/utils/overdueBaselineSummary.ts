import type { PhaseSegment, TaskPosition } from '@/types';

import { getPartsPerDay } from '@/constants';
import { getOrderedPlanSegments } from '@/features/swimlane/utils/positionUtils';

/** От этой длины хвост читается цифрой на полосе, короче — только при наведении на задачу. */
export const STRONG_OVERDUE_DAYS = 2;

export type OverdueKind = 'notStarted' | 'slipping';

export function overdueDayAmount(cells: number, partsPerDay: number): number {
  if (partsPerDay <= 0 || cells <= 0) return 0;
  return Math.round((cells / partsPerDay) * 10) / 10;
}

export function formatOverdueDayAmount(
  cells: number,
  partsPerDay: number,
  decimalSeparator: ',' | '.' = '.'
): string {
  const amount = overdueDayAmount(cells, partsPerDay);
  const text = Number.isInteger(amount) ? String(amount) : amount.toFixed(1);
  return decimalSeparator === ',' ? text.replace('.', ',') : text;
}

export function isStrongOverdue(cells: number, partsPerDay: number): boolean {
  return overdueDayAmount(cells, partsPerDay) >= STRONG_OVERDUE_DAYS;
}

export function resolveOverdueKind(status: string | undefined): OverdueKind {
  return status === 'todo' ? 'notStarted' : 'slipping';
}

/** Продлевает последний отрезок плана до currentCell. null — продлевать нечего. */
export function extendLastPlanSegmentToCell(
  position: TaskPosition,
  currentCell: number
): PhaseSegment[] | null {
  const segments = getOrderedPlanSegments(position);
  const lastIndex = segments.length - 1;
  const last = segments[lastIndex];
  if (last == null) return null;

  const plannedEndCell = last.startDay * getPartsPerDay() + last.startPart + last.duration;
  if (plannedEndCell >= currentCell) return null;

  const extra = currentCell - plannedEndCell;
  return segments.map((segment, index) =>
    index === lastIndex ? { ...segment, duration: segment.duration + extra } : segment
  );
}
