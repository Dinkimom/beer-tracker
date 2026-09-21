'use client';

import type { Developer, Task, TaskPosition } from '@/types';

import { Avatar } from '@/components/Avatar';
import { usePhaseCardColorScheme } from '@/components/PhaseCardColorSchemeContext';
import { PARTS_PER_DAY, ZIndex } from '@/constants';

import { PHASE_PLAN_ROW_INSET_PX } from '../occupancyPhaseBarConstants';

import { buildOccupancyAddPhaseGhostLayout } from './occupancyAddPhaseGhostHelpers';
import { resolveOccupancyAddPhaseHoverSlotKind } from './occupancyAddPhaseGhostSlotHelpers';

export { resolveOccupancyAddPhaseHoverSlotKind };

interface OccupancyAddPhaseGhostProps {
  assignee?: Developer;
  hoveredCell: { taskId: string; dayIndex: number; partIndex: number } | null;
  isDraggingDev?: boolean;
  isLinking?: boolean;
  phaseBarHeightPx: number;
  phaseBarTopOffsetPx: number;
  position?: TaskPosition;
  qaAssignee?: Developer;
  qaPosition?: TaskPosition;
  qaTask?: Task;
  task: Task;
  totalParts: number;
}

export function OccupancyAddPhaseGhost({
  assignee,
  hoveredCell,
  isDraggingDev = false,
  isLinking = false,
  phaseBarHeightPx,
  phaseBarTopOffsetPx,
  position,
  qaAssignee,
  qaPosition,
  qaTask,
  task,
  totalParts,
}: OccupancyAddPhaseGhostProps) {
  const phaseCardColorScheme = usePhaseCardColorScheme();
  if (isLinking) return null;
  const slotKind = resolveOccupancyAddPhaseHoverSlotKind(
    hoveredCell,
    task,
    totalParts,
    position,
    qaTask,
    qaPosition,
    isDraggingDev
  );
  if (!slotKind || !hoveredCell) return null;
  const targetTask = slotKind === 'qa' && qaTask ? qaTask : task;
  const isTargetQa = slotKind === 'qa';
  const startCell = hoveredCell.dayIndex * PARTS_PER_DAY + hoveredCell.partIndex;
  const {
    badgeClass,
    cardStyles,
    initials,
    leftPercent,
    rightPercent,
    targetAvatarUrl,
  } = buildOccupancyAddPhaseGhostLayout({
    assignee,
    isTargetQa,
    phaseCardColorScheme,
    qaAssignee,
    startCell,
    targetTask,
    task,
    totalParts,
  });

  return (
    <div
      aria-hidden
      className="absolute inset-0 pointer-events-none opacity-50"
      style={{ zIndex: ZIndex.contentInteractive }}
    >
      <div
        className={`absolute flex items-center justify-center rounded-lg border-2 ${cardStyles.teamColor} ${cardStyles.teamBorder}`}
        style={{
          left: `calc(${leftPercent}% + ${PHASE_PLAN_ROW_INSET_PX}px)`,
          right: `calc(${rightPercent}% + ${PHASE_PLAN_ROW_INSET_PX}px)`,
          height: phaseBarHeightPx,
          top: phaseBarTopOffsetPx,
        }}
      >
        <Avatar
          avatarUrl={targetAvatarUrl}
          initials={initials}
          initialsClassName={badgeClass ?? 'bg-gray-500 dark:bg-gray-600 text-white border-gray-600 dark:border-gray-700'}
          size="xs"
        />
      </div>
    </div>
  );
}
