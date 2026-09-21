import type { SprintInfo } from '@/features/sprint/components/SprintPlanner/occupancy/OccupancyView';
import type { TaskPosition } from '@/types';

import { WORKING_DAYS } from '@/constants';
import { addIssueToSprint } from '@/lib/api/issues';
import { deleteTaskPosition, saveTaskPosition } from '@/lib/beerTrackerApi';

function cloneSegmentsForSprint(
  segments: TaskPosition['segments'],
  offset: number
): TaskPosition['segments'] | undefined {
  if (!segments || segments.length === 0) {
    return undefined;
  }
  return segments.map((segment) => ({
    startDay: segment.startDay - offset,
    startPart: segment.startPart,
    duration: segment.duration,
  }));
}

function resolveSprintIndex(
  startDay: number,
  sprintCount: number
): number {
  return Math.min(Math.max(0, Math.floor(startDay / WORKING_DAYS)), sprintCount - 1);
}

async function deleteOldSprintPositionIfNeeded(
  taskId: string,
  newSprintId: number,
  taskSprintMap: Map<string, { sprintId: number; sprintIdx: number }>
): Promise<void> {
  const oldSprintInfo = taskSprintMap.get(taskId);
  if (oldSprintInfo && oldSprintInfo.sprintId !== newSprintId) {
    await deleteTaskPosition(oldSprintInfo.sprintId, taskId);
  }
}

function scheduleTrackerSprintSync(
  trackerKey: string | undefined,
  newSprintNumericId: number
): void {
  if (!trackerKey || isNaN(newSprintNumericId)) {
    return;
  }
  addIssueToSprint(trackerKey, newSprintNumericId).catch((err) => {
    console.error(
      `[useEpicOccupancyData] Failed to add ${trackerKey} to sprint ${newSprintNumericId}:`,
      err
    );
  });
}

export async function persistEpicOccupancyPosition(input: {
  devTaskKey?: string;
  isQa: boolean;
  newSprint: SprintInfo;
  newSprintIdx: number;
  position: TaskPosition;
  taskSprintMap: Map<string, { sprintId: number; sprintIdx: number }>;
}): Promise<number> {
  const newSprintId = input.newSprint.id as number;
  await deleteOldSprintPositionIfNeeded(
    input.position.taskId,
    newSprintId,
    input.taskSprintMap
  );

  const actualStartDay = input.position.startDay - input.newSprintIdx * WORKING_DAYS;
  const actualPlannedStartDay =
    input.position.plannedStartDay != null
      ? input.position.plannedStartDay - input.newSprintIdx * WORKING_DAYS
      : null;
  const segmentsForSprint = cloneSegmentsForSprint(
    input.position.segments,
    input.newSprintIdx * WORKING_DAYS
  );

  await saveTaskPosition(newSprintId, {
    taskId: input.position.taskId,
    assigneeId: input.position.assignee,
    startDay: actualStartDay,
    startPart: input.position.startPart,
    duration: input.position.duration,
    plannedStartDay: actualPlannedStartDay,
    plannedStartPart: input.position.plannedStartPart ?? null,
    plannedDuration: input.position.plannedDuration ?? null,
    isQa: input.isQa,
    devTaskKey: input.devTaskKey,
    ...(segmentsForSprint ? { segments: segmentsForSprint } : {}),
  });

  const trackerKey = input.isQa ? input.devTaskKey : input.position.taskId;
  scheduleTrackerSprintSync(trackerKey, Number(input.newSprint.id));

  return newSprintId;
}

export function resolveEpicOccupancySprintIndex(
  position: TaskPosition,
  sprintInfos: SprintInfo[]
): { newSprint: SprintInfo; newSprintIdx: number } | null {
  const newSprintIdx = resolveSprintIndex(position.startDay, sprintInfos.length);
  const newSprint = sprintInfos[newSprintIdx];
  if (!newSprint) {
    return null;
  }
  return { newSprint, newSprintIdx };
}
