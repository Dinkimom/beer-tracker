import type { PositionHistoryOptions } from '@/lib/layers/application/mobx/stores/taskPositionsStore';
import type { Task, TaskPosition } from '@/types';

import { getTaskPoints } from '@/features/task/utils/taskUtils';
import { addIssueToSprint } from '@/lib/beerTrackerApi';
import { storyPointsToTimeslots } from '@/lib/pointsUtils';
import { DELAYS } from '@/utils/constants';

export function buildBacklogDropPosition(
  taskId: string,
  assigneeId: string,
  day: number,
  part: number,
  sidebarTask: Task
): TaskPosition {
  const calculatedDuration = Math.max(1, storyPointsToTimeslots(getTaskPoints(sidebarTask)));
  return {
    taskId,
    assignee: assigneeId,
    startDay: day,
    startPart: part,
    duration: calculatedDuration,
    plannedStartDay: day,
    plannedStartPart: part,
    plannedDuration: calculatedDuration,
  };
}

export function finalizeBacklogTaskDrop(input: {
  backlogTaskRef: React.MutableRefObject<{ getTask: (id: string) => Task | undefined; removeTask: (id: string) => void } | null>;
  debouncedUpdateXarrow: () => void;
  selectedSprintId: number;
  taskId: string;
}): void {
  if (input.backlogTaskRef.current?.getTask(input.taskId)) {
    input.backlogTaskRef.current.removeTask(input.taskId);
  }
  setTimeout(() => input.debouncedUpdateXarrow(), DELAYS.IMMEDIATE);
  addIssueToSprint(input.taskId, input.selectedSprintId).catch((error) => {
    console.error('Error adding backlog task to sprint:', error);
  });
}

export function applyBacklogTaskDropToState(input: {
  assigneeId: string;
  buildBacklogDropPosition: (
    taskId: string,
    assigneeId: string,
    day: number,
    part: number,
    sidebarTask: Task
  ) => TaskPosition;
  day: number;
  historyOptions?: PositionHistoryOptions;
  part: number;
  savePosition: (
    position: TaskPosition & { __source: string },
    isQa: boolean,
    devTaskKey?: string
  ) => Promise<void>;
  setTaskPositions: (
    updater: (prev: Map<string, TaskPosition>) => Map<string, TaskPosition>,
    options?: PositionHistoryOptions
  ) => void;
  setTasks: (updater: (prev: Task[]) => Task[]) => void;
  sidebarTask: Task;
  taskId: string;
}): void {
  input.setTasks((prev) => (prev.find((t) => t.id === input.taskId) ? prev : [...prev, input.sidebarTask]));

  const isQa = input.sidebarTask.team === 'QA';
  const position = input.buildBacklogDropPosition(
    input.taskId,
    input.assigneeId,
    input.day,
    input.part,
    input.sidebarTask
  );
  input.setTaskPositions((prev) => {
    const newPositions = new Map(prev);
    newPositions.set(input.taskId, position);
    return newPositions;
  }, { recordHistory: true, ...input.historyOptions });

  const positionWithSource: TaskPosition & { __source: string } = {
    ...position,
    __source: 'useSprintPlannerTaskHandlers.handleBacklogTaskDrop',
  };
  input.savePosition(
    positionWithSource,
    isQa,
    isQa ? input.sidebarTask.originalTaskId : undefined
  ).catch((error) => {
    console.error('Error saving position:', error);
  });
}
