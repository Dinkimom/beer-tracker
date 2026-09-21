'use client';

import type { Task, TaskPosition } from '@/types';

import { getCombinedPhaseCellRange } from '@/features/sprint/utils/occupancyUtils';

import { PHASE_PLAN_ROW_INSET_PX } from '../occupancyPhaseBarConstants';

interface OccupancyPhaseHoverZoneProps {
  phaseBarHeightPx: number;
  phaseBarTopOffsetPx: number;
  position?: TaskPosition;
  qaPosition?: TaskPosition;
  qaTask?: Task;
  taskId: string;
  totalParts: number;
  setHoveredPhaseTaskId?: (taskId: string | null) => void;
}

export function OccupancyPhaseHoverZone({
  phaseBarHeightPx,
  phaseBarTopOffsetPx,
  position,
  qaPosition,
  qaTask,
  setHoveredPhaseTaskId,
  taskId,
  totalParts,
}: OccupancyPhaseHoverZoneProps) {
  const combinedRange = getCombinedPhaseCellRange(position, qaPosition, qaTask);
  if (!combinedRange || totalParts <= 0 || !setHoveredPhaseTaskId) return null;

  const combinedLeftPercent = (combinedRange.startCell / totalParts) * 100;
  const combinedRightPercent = (combinedRange.endCell / totalParts) * 100;
  const phaseInsetPx = PHASE_PLAN_ROW_INSET_PX;

  return (
    <div
      aria-hidden
      className="absolute rounded-lg pointer-events-auto z-0"
      style={{
        left: `calc(${combinedLeftPercent}% + ${phaseInsetPx}px)`,
        right: `calc(${100 - combinedRightPercent}% + ${phaseInsetPx}px)`,
        top: phaseBarTopOffsetPx,
        height: phaseBarHeightPx,
      }}
      onMouseEnter={() => setHoveredPhaseTaskId(taskId)}
      onMouseLeave={() => setHoveredPhaseTaskId(null)}
    />
  );
}
