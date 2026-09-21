import type { TaskPosition } from '@/types';

function cloneTaskPositionSegments(
  segments: TaskPosition['segments']
): TaskPosition['segments'] {
  if (!segments || segments.length === 0) return segments;
  return segments.map((s) => ({
    startDay: s.startDay,
    startPart: s.startPart,
    duration: s.duration,
  }));
}

function shouldReplaceTempPosition(
  existing: { pos: TaskPosition; storageSprintIdx: number } | undefined,
  trackerSprintIdx: number | undefined,
  sprintIdx: number
): boolean {
  return !existing || (trackerSprintIdx !== undefined && trackerSprintIdx === sprintIdx);
}

export function applySprintPositionToTempMap(
  pos: TaskPosition,
  sprintIdx: number,
  taskIdFilter: Set<string>,
  taskTrackerSprintIdx: Map<string, number>,
  tempPositions: Map<string, { pos: TaskPosition; storageSprintIdx: number }>
): void {
  if (!taskIdFilter.has(pos.taskId)) return;

  const trackerSprintIdx = taskTrackerSprintIdx.get(pos.taskId);
  const existing = tempPositions.get(pos.taskId);
  if (!shouldReplaceTempPosition(existing, trackerSprintIdx, sprintIdx)) return;

  tempPositions.set(pos.taskId, {
    pos: { ...pos, segments: cloneTaskPositionSegments(pos.segments) },
    storageSprintIdx: sprintIdx,
  });
}
