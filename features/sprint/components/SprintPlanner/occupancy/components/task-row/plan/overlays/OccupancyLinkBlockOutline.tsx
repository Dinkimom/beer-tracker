'use client';

import type { Task, TaskPosition } from '@/types';

import { getCombinedPhaseCellRange } from '@/features/sprint/utils/occupancyUtils';
import { getPhaseFocusRingClass } from '@/lib/planner-timeline';

import { PHASE_PLAN_ROW_INSET_PX } from '../occupancyPhaseBarConstants';

import {
  buildOccupancyLinkBlockStyle,
  isOccupancyLinkBlockHoveringRow,
  resolveOccupancyLinkBlockRowFlags,
  resolveOccupancyLinkOutlineVisibility,
} from './occupancyLinkBlockOutlineHelpers';

interface OccupancyLinkBlockOutlineProps {
  hoveredPhaseTaskId: string | null;
  linkAlreadyExistsFromSource: boolean;
  linkingFromTaskId: string | null;
  phaseBarHeightPx: number;
  phaseBarTopOffsetPx: number;
  position?: TaskPosition;
  qaPosition?: TaskPosition;
  qaTask?: Task;
  task: Task;
  totalParts: number;
  validTargetByTime: boolean;
}

export function OccupancyLinkBlockOutline({
  hoveredPhaseTaskId,
  linkAlreadyExistsFromSource,
  linkingFromTaskId,
  phaseBarHeightPx,
  phaseBarTopOffsetPx,
  position,
  qaPosition,
  qaTask,
  task,
  totalParts,
  validTargetByTime,
}: OccupancyLinkBlockOutlineProps) {
  if (linkingFromTaskId == null) return null;
  const combinedRange = getCombinedPhaseCellRange(position, qaPosition, qaTask);
  if (!combinedRange || totalParts <= 0) return null;

  const { rowIsLinkSource, rowIsLinkTarget } = resolveOccupancyLinkBlockRowFlags({
    linkAlreadyExistsFromSource,
    linkingFromTaskId,
    qaTask,
    task,
    validTargetByTime,
  });
  const isHoveringThisRowPhase = isOccupancyLinkBlockHoveringRow({
    hoveredPhaseTaskId,
    qaTask,
    task,
  });
  const { showSourceRing, showTargetHover } = resolveOccupancyLinkOutlineVisibility({
    isHoveringThisRowPhase,
    rowIsLinkSource,
    rowIsLinkTarget,
  });
  if (!showSourceRing && !showTargetHover) return null;

  const combinedLeftPercent = (combinedRange.startCell / totalParts) * 100;
  const combinedRightPercent = (combinedRange.endCell / totalParts) * 100;
  const combinedBlockStyle = buildOccupancyLinkBlockStyle({
    combinedLeftPercent,
    combinedRightPercent,
    phaseBarHeightPx,
    phaseBarTopOffsetPx,
    phaseInsetPx: PHASE_PLAN_ROW_INSET_PX,
  });

  return (
    <>
      {showSourceRing ? (
        <div
          className={`absolute rounded-lg pointer-events-none ${getPhaseFocusRingClass(true, 'source')}`}
          style={combinedBlockStyle}
        />
      ) : null}
      {showTargetHover ? (
        <div
          aria-hidden
          className="absolute rounded-lg pointer-events-none bg-blue-400/20 dark:bg-blue-500/25 ring-2 ring-blue-400 dark:ring-blue-400"
          style={combinedBlockStyle}
        />
      ) : null}
    </>
  );
}
