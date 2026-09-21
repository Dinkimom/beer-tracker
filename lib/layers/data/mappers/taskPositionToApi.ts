/**
 * Маппинг доменной позиции задачи в тело запроса к API.
 */

import type { TaskPosition } from '@/types';

import omit from 'lodash-es/omit';

export function isValidSprintId(
  sprintId: number | null | undefined
): sprintId is number {
  return sprintId !== -1 && sprintId !== null && sprintId !== undefined;
}

/**
 * Преобразует TaskPosition в формат для API
 */
export function taskPositionToApi(
  position: TaskPosition,
  isQa: boolean = false,
  devTaskKey?: string
) {
  return {
    taskId: position.taskId,
    assigneeId: position.assignee,
    startDay: position.startDay,
    startPart: position.startPart,
    duration: position.duration,
    plannedStartDay: position.plannedStartDay ?? null,
    plannedStartPart: position.plannedStartPart ?? null,
    plannedDuration: position.plannedDuration ?? null,
    segments:
      position.segments && position.segments.length > 0
        ? position.segments.map((seg) => ({
            startDay: seg.startDay,
            startPart: seg.startPart,
            duration: seg.duration,
          }))
        : position.segments ?? undefined,
    isQa,
    ...(isQa && devTaskKey && { devTaskKey }),
    debugSource: (position as unknown as { __source?: string }).__source,
  };
}

/** Оптимистичное сохранение: убрать служебное поле перед записью в стор. */
export function stripPositionSource(position: TaskPosition): TaskPosition {
  return omit(position as TaskPosition & { __source?: string }, ['__source']) as TaskPosition;
}
