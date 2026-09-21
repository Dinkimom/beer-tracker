import type { Developer, Task, TaskPosition } from '@/types';

import { getDevelopersForTask } from '@/features/sprint/utils/getDevelopersForTask';
import { getTaskPoints, isQaOnlyTask } from '@/features/task/utils/taskUtils';
import { storyPointsToTimeslots } from '@/lib/pointsUtils';

function isTaskAssigneeInTeam(developers: Developer[], id: string): boolean {
  return developers.some((d) => d.id === id);
}

export function resolveEmptyCellQaFlags(targetTask: Task): {
  effectivelyQa: boolean;
  isSyntheticQa: boolean;
  useQaAssignment: boolean;
} {
  const isSyntheticQa = targetTask.team === 'QA';
  const effectivelyQa = isQaOnlyTask(targetTask);
  return {
    effectivelyQa,
    isSyntheticQa,
    useQaAssignment: isSyntheticQa || effectivelyQa,
  };
}

function resolveQaAssigneeForEmptyCell(
  targetTask: Task,
  taskAssigneeInTeam: (id: string) => boolean
): string | undefined {
  if (targetTask.qaEngineer && taskAssigneeInTeam(targetTask.qaEngineer)) {
    return targetTask.qaEngineer;
  }
  return undefined;
}

function resolveTaskAssigneeForEmptyCell(
  targetTask: Task,
  useQaAssignment: boolean,
  taskAssigneeInTeam: (id: string) => boolean
): string | undefined {
  if (useQaAssignment) {
    return resolveQaAssigneeForEmptyCell(targetTask, taskAssigneeInTeam);
  }
  if (targetTask.assignee && taskAssigneeInTeam(targetTask.assignee)) {
    return targetTask.assignee;
  }
  return undefined;
}

export function resolveEmptyCellDefaultAssignee(
  developers: Developer[],
  targetTask: Task,
  useQaAssignment: boolean
): string {
  const eligible = getDevelopersForTask(developers, targetTask);
  const taskAssigneeInTeam = (id: string) => isTaskAssigneeInTeam(developers, id);
  const fromTask = resolveTaskAssigneeForEmptyCell(targetTask, useQaAssignment, taskAssigneeInTeam);
  if (fromTask) return fromTask;
  return eligible[0]?.id ?? developers[0]?.id ?? '';
}

export function buildEmptyCellTaskPosition(
  targetTask: Task,
  dayIndex: number,
  partIndex: number,
  defaultAssignee: string
): TaskPosition {
  const duration = Math.max(1, storyPointsToTimeslots(getTaskPoints(targetTask)));
  return {
    taskId: targetTask.id,
    assignee: defaultAssignee,
    startDay: dayIndex,
    startPart: partIndex,
    duration,
    plannedStartDay: dayIndex,
    plannedStartPart: partIndex,
    plannedDuration: duration,
  };
}

export function canAutoAssignEmptyCellTask(
  developers: Developer[],
  targetTask: Task,
  useQaAssignment: boolean
): boolean {
  const taskAssigneeInTeam = (id: string) => isTaskAssigneeInTeam(developers, id);
  if (useQaAssignment) {
    return Boolean(targetTask.qaEngineer && taskAssigneeInTeam(targetTask.qaEngineer));
  }
  return Boolean(targetTask.assignee && taskAssigneeInTeam(targetTask.assignee));
}

export function resolveEmptyCellAnchorRect(
  cellElement: HTMLElement,
  getAnchorRect?: (cell: HTMLElement) => DOMRect
): DOMRect {
  return getAnchorRect ? getAnchorRect(cellElement) : cellElement.getBoundingClientRect();
}
