import type { Developer, Task, TaskPosition } from '@/types';

import { PARTS_PER_DAY } from '@/constants';
import { calculateOccupiedIntervals, findNextAvailableCell } from '@/features/task/utils/autoAssignTasks/utils/intervalUtils';
import {
  canAutoAddTaskToSwimlane,
  resolveAutoAddAssigneeId,
} from '@/features/task/utils/canAutoAddTaskToSwimlane';
import { getTaskPoints } from '@/features/task/utils/taskUtils';
import { storyPointsToTimeslots } from '@/lib/pointsUtils';
import { DELAYS } from '@/utils/constants';

interface AutoAddToSwimlaneParams {
  developers: Developer[];
  filteredTaskPositions: Map<string, TaskPosition>;
  selectedSprintId: number;
  task: Task;
  debouncedUpdateXarrow: () => void;
  savePosition: (
    position: TaskPosition,
    isQa: boolean,
    devTaskKey?: string,
    immediate?: boolean,
    options?: { recordHistory?: boolean }
  ) => Promise<void>;
  setTaskPositions: (
    updater: (prev: Map<string, TaskPosition>) => Map<string, TaskPosition>,
    options?: { recordHistory?: boolean }
  ) => void;
}

function buildAutoAddPosition(
  task: Task,
  assigneeId: string,
  startDay: number,
  startPart: number,
  duration: number
): TaskPosition {
  return {
    taskId: task.id,
    assignee: assigneeId,
    startDay,
    startPart,
    duration,
    plannedStartDay: startDay,
    plannedStartPart: startPart,
    plannedDuration: duration,
  };
}

export function runAutoAddToSwimlane(params: AutoAddToSwimlaneParams): void {
  const {
    task,
    developers,
    filteredTaskPositions,
    setTaskPositions,
    savePosition,
    debouncedUpdateXarrow,
  } = params;

  const developerIds = developers.map((d) => d.id);
  const estimatedSP = getTaskPoints(task);
  if (!canAutoAddTaskToSwimlane({ developerIds, estimatedSP, task })) return;

  const assigneeId = resolveAutoAddAssigneeId(task);
  if (!assigneeId) return;

  const duration = Math.max(1, storyPointsToTimeslots(estimatedSP));
  const occupiedIntervals = calculateOccupiedIntervals(filteredTaskPositions, developerIds);
  const intervals = occupiedIntervals.get(assigneeId) ?? [];
  const startCell = findNextAvailableCell(intervals, duration, 0);
  if (startCell === null) return;

  const startDay = Math.floor(startCell / PARTS_PER_DAY);
  const startPart = startCell % PARTS_PER_DAY;
  const isQa = task.team === 'QA';
  const position = buildAutoAddPosition(task, assigneeId, startDay, startPart, duration);

  setTaskPositions((prev) => {
    const next = new Map(prev);
    next.set(task.id, position);
    return next;
  }, { recordHistory: true });

  savePosition(position, isQa, isQa ? task.originalTaskId : undefined).catch((err) => {
    console.error('Error saving position:', err);
  });
  setTimeout(() => debouncedUpdateXarrow(), DELAYS.IMMEDIATE);
}
