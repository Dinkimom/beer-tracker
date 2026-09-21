import type { SprintInfo } from '@/features/sprint/components/SprintPlanner/occupancy/OccupancyView';
import type { Developer, Task, TaskLink, TaskPosition } from '@/types';

import { WORKING_DAYS } from '@/constants';
import { createQATasksMap } from '@/features/qa/utils/qaTaskUtils';

import { mapEpicAssigneeUpdate } from './useEpicOccupancyAssigneeHelpers';
import {
  persistEpicOccupancyPosition,
  resolveEpicOccupancySprintIndex,
} from './useEpicOccupancySavePositionHelpers';

function cloneSegmentsWithoutOffset(
  segments: TaskPosition['segments']
): TaskPosition['segments'] {
  if (!segments || segments.length === 0) {
    return segments;
  }
  return segments.map((segment) => ({
    startDay: segment.startDay,
    startPart: segment.startPart,
    duration: segment.duration,
  }));
}

function cloneSegmentsWithOffset(
  segments: TaskPosition['segments'],
  offset: number
): TaskPosition['segments'] {
  if (!segments || segments.length === 0) {
    return segments;
  }
  return segments.map((segment) => ({
    startDay: segment.startDay + offset,
    startPart: segment.startPart,
    duration: segment.duration,
  }));
}

export function findTaskSprintIndex(task: Task, sprintInfos: SprintInfo[]): number | null {
  const sprintRef = task.sprints?.[0];
  const sprintName = sprintRef?.id ?? sprintRef?.display;
  if (!sprintName) {
    return null;
  }
  const index = sprintInfos.findIndex((sprint) => sprint.name === sprintName);
  return index >= 0 ? index : null;
}

export function mergeSyntheticQaTasksIntoMap(tasksMap: Map<string, Task>): void {
  const realQaDevTaskIds = new Set(
    Array.from(tasksMap.values())
      .filter((t) => t.originalTaskId)
      .map((t) => t.originalTaskId!)
  );
  const devTasksWithoutRealQa = Array.from(tasksMap.values()).filter(
    (t) =>
      !t.originalTaskId &&
      t.testPoints != null &&
      t.testPoints > 0 &&
      !realQaDevTaskIds.has(t.id)
  );
  const syntheticQaMap = createQATasksMap(devTasksWithoutRealQa);
  syntheticQaMap.forEach((qaTask) => {
    tasksMap.set(qaTask.id, qaTask);
  });
}

export function collectEpicSprintPositions(input: {
  linksPerSprint: TaskLink[][];
  positionsPerSprint: TaskPosition[][];
  sprintInfos: SprintInfo[];
  taskTrackerSprintIdx: Map<string, number>;
}): {
  linksMap: Map<string, TaskLink>;
  linkSprintMap: Map<string, number>;
  posMap: Map<string, TaskPosition>;
  taskSprintMap: Map<string, { sprintId: number; sprintIdx: number }>;
} {
  const tempPositions = new Map<
    string,
    { pos: TaskPosition; storageSprintId: number; storageSprintIdx: number }
  >();
  const linksMap = new Map<string, TaskLink>();
  const linkSprintMap = new Map<string, number>();

  for (let sprintIdx = 0; sprintIdx < input.sprintInfos.length; sprintIdx++) {
    const sprint = input.sprintInfos[sprintIdx];
    const positions = input.positionsPerSprint[sprintIdx];
    const links = input.linksPerSprint[sprintIdx];

    positions.forEach((pos) => {
      const trackerSprintIdx = input.taskTrackerSprintIdx.get(pos.taskId);
      const existing = tempPositions.get(pos.taskId);
      const shouldUpdate =
        !existing || (trackerSprintIdx !== undefined && trackerSprintIdx === sprintIdx);
      if (shouldUpdate) {
        tempPositions.set(pos.taskId, {
          pos: {
            ...pos,
            segments: cloneSegmentsWithoutOffset(pos.segments),
          },
          storageSprintId: sprint.id as number,
          storageSprintIdx: sprintIdx,
        });
      }
    });

    links.forEach((link) => {
      if (!linksMap.has(link.id)) {
        linksMap.set(link.id, link);
        linkSprintMap.set(link.id, sprint.id as number);
      }
    });
  }

  const posMap = new Map<string, TaskPosition>();
  const taskSprintMap = new Map<string, { sprintId: number; sprintIdx: number }>();
  tempPositions.forEach(({ pos, storageSprintId, storageSprintIdx }, taskId) => {
    const displaySprintIdx = input.taskTrackerSprintIdx.get(taskId) ?? storageSprintIdx;
    const displayOffset = displaySprintIdx * WORKING_DAYS;
    posMap.set(taskId, {
      ...pos,
      startDay: pos.startDay + displayOffset,
      plannedStartDay:
        pos.plannedStartDay != null ? pos.plannedStartDay + displayOffset : undefined,
      segments: cloneSegmentsWithOffset(pos.segments, displayOffset),
    });
    taskSprintMap.set(taskId, { sprintId: storageSprintId, sprintIdx: storageSprintIdx });
  });

  return { posMap, taskSprintMap, linksMap, linkSprintMap };
}

export function applyEpicAssigneeUpdate(
  tasks: Task[],
  task: Task,
  assigneeId: string,
  assigneeName?: string
): Task[] {
  return tasks.map((t) => mapEpicAssigneeUpdate(t, task, assigneeId, assigneeName));
}

export async function saveEpicOccupancyPosition(input: {
  devTaskKey?: string;
  isQa: boolean;
  position: TaskPosition;
  sprintInfos: SprintInfo[];
  taskSprintMap: Map<string, { sprintId: number; sprintIdx: number }>;
}): Promise<{
  newSprintIdx: number;
  sprintId: number;
} | null> {
  const sprintTarget = resolveEpicOccupancySprintIndex(input.position, input.sprintInfos);
  if (!sprintTarget) {
    return null;
  }

  const sprintId = await persistEpicOccupancyPosition({
    devTaskKey: input.devTaskKey,
    isQa: input.isQa,
    newSprint: sprintTarget.newSprint,
    newSprintIdx: sprintTarget.newSprintIdx,
    position: input.position,
    taskSprintMap: input.taskSprintMap,
  });

  return { newSprintIdx: sprintTarget.newSprintIdx, sprintId };
}

export function mergeDevelopersFromMap(developersMap: Map<string, Developer>): Developer[] {
  return Array.from(developersMap.values());
}
