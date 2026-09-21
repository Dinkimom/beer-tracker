/**
 * Преобразует StatusDuration в позиции ячеек спринта (для отображения фаз факта)
 */


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

import {
  buildSprintTimelineBounds,
  durationToStatusPhaseCell,
  resolveStatusTimelineCap,
} from './statusToCellsHelpers';

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
