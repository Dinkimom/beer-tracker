import type { PositionPreview } from '../components/task-row/plan/occupancyPhaseBar.types';
import type { Developer, Task, TaskPosition } from '@/types';

import { PARTS_PER_DAY } from '@/constants';
import { getCombinedPhaseCellRange } from '@/features/sprint/utils/occupancyUtils';

import { cellToPosition } from '../components/task-row/plan/occupancyPhaseBarConstants';

const DAYS_PER_WEEK = 5;

export function toOccupancyTaskRowWeekPosition(
  pos: TaskPosition,
  displayAsWeeks: boolean,
  cellsPerDay: 1 | 3
): TaskPosition {
  if (!displayAsWeeks) return pos;
  const durationInDays = cellsPerDay === 1 ? pos.duration : pos.duration / PARTS_PER_DAY;
  return {
    ...pos,
    startDay: Math.floor(pos.startDay / DAYS_PER_WEEK),
    startPart: 0,
    duration: Math.max(1, Math.ceil(durationInDays / DAYS_PER_WEEK)),
  };
}

export function fromOccupancyTaskRowWeekPosition(
  pos: TaskPosition,
  displayAsWeeks: boolean,
  cellsPerDay: 1 | 3
): TaskPosition {
  if (!displayAsWeeks) return pos;
  return {
    ...pos,
    startDay: pos.startDay * DAYS_PER_WEEK,
    startPart: 0,
    duration: pos.duration * DAYS_PER_WEEK * (cellsPerDay === 1 ? 1 : PARTS_PER_DAY),
  };
}

export function computeLinkedQaPreviewStart(
  qaPosition: TaskPosition | undefined,
  preview: PositionPreview,
  totalParts: number
): number | null {
  if (!qaPosition) return null;
  const qaOriginalStart = qaPosition.startDay * PARTS_PER_DAY + qaPosition.startPart;
  const newDevEndCell = preview.startDay * PARTS_PER_DAY + preview.startPart + preview.duration;
  if (newDevEndCell <= qaOriginalStart) return null;
  return Math.max(0, Math.min(totalParts - qaPosition.duration, newDevEndCell));
}

export async function syncQaPositionAfterDevSave(
  devPosition: TaskPosition,
  qaPosition: TaskPosition | undefined,
  qaTask: Task | undefined,
  totalParts: number,
  onPositionSave?: (position: TaskPosition, isQa: boolean, devTaskKey?: string) => Promise<void> | void
): Promise<void> {
  if (!qaPosition || !qaTask) return;
  const qaOriginalStart = qaPosition.startDay * PARTS_PER_DAY + qaPosition.startPart;
  const newDevEndCell = devPosition.startDay * PARTS_PER_DAY + devPosition.startPart + devPosition.duration;
  if (newDevEndCell <= qaOriginalStart) return;
  const newQaStartCell = Math.max(0, Math.min(totalParts - qaPosition.duration, newDevEndCell));
  const { startDay: qaNewStartDay, startPart: qaNewStartPart } = cellToPosition(newQaStartCell);
  await onPositionSave?.(
    {
      ...qaPosition,
      startDay: qaNewStartDay,
      startPart: qaNewStartPart,
      plannedStartDay: qaNewStartDay,
      plannedStartPart: qaNewStartPart,
      plannedDuration: qaPosition.plannedDuration,
    },
    true,
    qaTask.originalTaskId
  );
}

export function computeLinkAlreadyExistsFromSource(
  linkingFromTaskId: string | null,
  sourceRowPhaseIds: Set<string> | null,
  taskLinks: Array<{ fromTaskId: string; toTaskId: string }>,
  taskId: string,
  qaTaskId: string | undefined
): boolean {
  return (
    linkingFromTaskId != null &&
    sourceRowPhaseIds != null &&
    taskLinks.some(
      (l) =>
        sourceRowPhaseIds.has(l.fromTaskId) &&
        (l.toTaskId === taskId || (qaTaskId != null && l.toTaskId === qaTaskId))
    )
  );
}

export function filterAssigneeOtherPositions(
  assignee: Developer | undefined,
  assigneeIdToTaskPositions: Map<string, Array<{ taskId: string; position: TaskPosition }>> | undefined,
  excludeTaskIds: string[]
): TaskPosition[] {
  if (!assignee || !assigneeIdToTaskPositions) return [];
  return (assigneeIdToTaskPositions.get(assignee.id) ?? [])
    .filter((e) => !excludeTaskIds.includes(e.taskId))
    .map((e) => e.position);
}

export function computeValidTargetByTime(
  position: TaskPosition | undefined,
  qaPosition: TaskPosition | undefined,
  qaTask: Task | undefined,
  sourceRowEndCell: number | null
): boolean {
  const combinedPhaseRange =
    position || qaPosition ? getCombinedPhaseCellRange(position, qaPosition, qaTask) : null;
  const thisRowMinStartCell = combinedPhaseRange?.startCell ?? Infinity;
  return sourceRowEndCell == null || thisRowMinStartCell >= sourceRowEndCell;
}
