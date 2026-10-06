import type { PhaseSegment, Task, TaskPosition } from '@/types';

import { parseSwimlaneCommentTaskId } from '@/features/comments/utils/swimlaneCommentTaskBridge';

export interface PlanAnchorGeometry {
  duration: number;
  segments: PhaseSegment[] | null;
  startDay: number;
  startPart: number;
}

function segmentEndCell(segment: PhaseSegment, partsPerDay: number): number {
  return segment.startDay * partsPerDay + segment.startPart + segment.duration;
}

function geometrySegments(geometry: PlanAnchorGeometry): PhaseSegment[] {
  if (geometry.segments && geometry.segments.length > 0) return geometry.segments;
  return [
    {
      duration: geometry.duration,
      startDay: geometry.startDay,
      startPart: geometry.startPart,
    },
  ];
}

function planEndCell(geometry: PlanAnchorGeometry, partsPerDay: number): number {
  return geometrySegments(geometry).reduce(
    (end, segment) => Math.max(end, segmentEndCell(segment, partsPerDay)),
    0
  );
}

/** Пунктир якоря, если конец плана уехал хотя бы на один рабочий день. */
export function planAnchorGhostStrips(
  anchor: PlanAnchorGeometry,
  position: Pick<TaskPosition, 'duration' | 'segments' | 'startDay' | 'startPart'>,
  partsPerDay: number
): Array<{ start: number; width: number }> | null {
  if (partsPerDay <= 0) return null;
  const currentEnd = planEndCell(
    {
      duration: position.duration,
      segments: position.segments ?? null,
      startDay: position.startDay,
      startPart: position.startPart,
    },
    partsPerDay
  );
  const anchorEnd = planEndCell(anchor, partsPerDay);
  if (Math.abs(anchorEnd - currentEnd) < partsPerDay) return null;
  return geometrySegments(anchor).map((segment) => ({
    start: segmentEndCell(segment, partsPerDay) - segment.duration,
    width: segment.duration,
  }));
}

export function isPlanAnchorGhostTask(
  task: Pick<Task, 'id' | 'isLocalTask' | 'localDraftKind'>
): boolean {
  if (task.isLocalTask || task.localDraftKind) return false;
  return parseSwimlaneCommentTaskId(task.id) == null;
}
