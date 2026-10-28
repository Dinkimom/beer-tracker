/**
 * Преобразует StatusDuration в позиции ячеек спринта (для отображения фаз факта)
 */

import { getPartsPerDay } from '@/constants';
import { getWorkingDaysRange, getWorkingHoursBetween } from '@/utils/dateUtils';

import { dateTimeToFractionalCellInRange, getSprintTotalParts } from './sprintCellUtils';

export interface StatusPhaseCell {
  /** Задачи для блока «Задачи» в PhaseTooltip (редко) */
  contributingTaskIds?: string[];
  createdBy?: {
    display?: string;
    id?: string;
  };
  /** Длительность в мс (для отображения) */
  durationMs: number;
  /** Дробная позиция конца (0..TOTAL_PARTS) */
  endCell: number;
  /** Дата/время перехода из статуса (ISO строка или null, если задача ещё в статусе) */
  endTime: string | null;
  /** Дробная позиция начала (0..TOTAL_PARTS) */
  startCell: number;
  /** Дата/время перехода в статус (ISO строка) */
  startTime: string;
  statusKey: string;
  statusName: string;
}

interface StatusDurationLike {
  contributingTaskIds?: string[];
  createdBy?: {
    display?: string;
    id?: string;
  };
  endTime: string | null;
  endTimeMs: number;
  startTime: string;
  startTimeMs: number;
  statusKey: string;
  statusName: string;
}

function buildSprintTimelineBounds(
  sprintStartDate: Date,
  workingDaysCount: number
): { sprintEndMs: number; sprintStartMs: number } {
  const sprintStartMs = new Date(sprintStartDate).setHours(0, 0, 0, 0);
  const workingDays = getWorkingDaysRange(sprintStartDate, workingDaysCount);
  const lastDay = workingDays[workingDays.length - 1];
  const sprintEndDate = lastDay ? new Date(lastDay) : new Date(sprintStartDate);
  sprintEndDate.setHours(23, 59, 59, 999);
  return { sprintEndMs: sprintEndDate.getTime(), sprintStartMs };
}

function durationToStatusPhaseCell(
  duration: StatusDurationLike,
  sprintStartDate: Date,
  cap: number,
  sprintStartMs: number,
  sprintEndMs: number
): StatusPhaseCell | null {
  const startMs = duration.startTimeMs;
  const endMs = duration.endTime ? duration.endTimeMs : Date.now();
  if (endMs < sprintStartMs || startMs > sprintEndMs) {
    return null;
  }

  const startDate = new Date(Math.max(startMs, sprintStartMs));
  const endDate = new Date(Math.min(endMs, sprintEndMs));
  const toCell = (date: Date) => dateTimeToFractionalCellInRange(sprintStartDate, date, cap);
  const startCell = Math.max(0, Math.min(cap, toCell(startDate)));
  const endCell = Math.max(0, Math.min(cap, toCell(endDate)));
  const durationMs = getWorkingHoursBetween(startDate.getTime(), endDate.getTime());

  if (startCell >= endCell || durationMs <= 0) {
    return null;
  }

  return {
    contributingTaskIds: duration.contributingTaskIds,
    createdBy: duration.createdBy,
    durationMs,
    endCell,
    endTime: duration.endTime,
    startCell,
    startTime: duration.startTime,
    statusKey: duration.statusKey,
    statusName: duration.statusName,
  };
}

function resolveStatusTimelineCap(totalParts?: number): {
  cap: number;
  workingDaysCount: number;
} {
  const cap = totalParts ?? getSprintTotalParts();
  return { cap, workingDaysCount: cap / getPartsPerDay() };
}

/**
 * Преобразует статусные фазы в диапазоны ячеек спринта.
 * Обрезает по границам диапазона (0..totalParts).
 * @param totalParts — если задан (например, 240 для 6 спринтов), диапазон — N рабочих дней от sprintStartDate
 */
export function statusDurationsToCells(
  sprintStartDate: Date,
  durations: StatusDurationLike[],
  totalParts?: number
): StatusPhaseCell[] {
  const { cap, workingDaysCount } = resolveStatusTimelineCap(totalParts);
  const { sprintEndMs, sprintStartMs } = buildSprintTimelineBounds(sprintStartDate, workingDaysCount);

  const result: StatusPhaseCell[] = [];
  for (const duration of durations) {
    const cell = durationToStatusPhaseCell(
      duration,
      sprintStartDate,
      cap,
      sprintStartMs,
      sprintEndMs
    );
    if (cell) {
      result.push(cell);
    }
  }
  return result;
}
