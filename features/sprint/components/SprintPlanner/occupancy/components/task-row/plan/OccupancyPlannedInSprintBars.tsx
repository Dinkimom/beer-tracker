'use client';

import type { Task, TaskPosition } from '@/types';
import type React from 'react';

import { getPlannedInSprintStackIndices } from '@/features/quarterly-planning-v2/hooks/usePlannedInSprintPositions';
import { getTeamTagClasses } from '@/utils/teamColors';

import { OccupancyPhaseBar } from './OccupancyPhaseBar';

const SPRINT_BAR_GAP_PX = 2;
const SPRINT_BAR_HEIGHT = 18;

interface OccupancyPlannedInSprintBarsProps {
  cellsPerDay: 1 | 3;
  contextMenuBlurOtherCards?: boolean;
  contextMenuTaskId?: string | null;
  displayAsWeeks: boolean;
  effectivelyQa: boolean;
  plannedInSprintList: TaskPosition[];
  sprintBarTop: number;
  task: Task;
  teamBorder: string;
  teamColor: string;
  totalParts: number;
  toWeekPosition: (pos: TaskPosition) => TaskPosition;
}

export function OccupancyPlannedInSprintBars({
  cellsPerDay,
  contextMenuBlurOtherCards = false,
  contextMenuTaskId = null,
  displayAsWeeks,
  effectivelyQa,
  plannedInSprintList,
  sprintBarTop,
  task,
  teamBorder,
  teamColor,
  toWeekPosition,
  totalParts,
}: OccupancyPlannedInSprintBarsProps) {
  if (plannedInSprintList.length === 0) return null;

  const sortedByStart = [...plannedInSprintList].sort((a, b) => a.startDay - b.startDay);
  const stackIndices = getPlannedInSprintStackIndices(sortedByStart);
  const bars: React.ReactNode[] = sortedByStart.map((pos, i) => {
    const stackIndex = stackIndices[i] ?? 0;
    const barTop = sprintBarTop + stackIndex * (SPRINT_BAR_HEIGHT + SPRINT_BAR_GAP_PX);
    return (
      <OccupancyPhaseBar
        key={`planned-in-sprint-${pos.sourceTaskId ?? i}-${pos.startDay}-${pos.duration}`}
        assigneeDisplayName={undefined}
        avatarUrl={undefined}
        badgeClass={effectivelyQa ? getTeamTagClasses('QA') : getTeamTagClasses(task.team)}
        barHeight={SPRINT_BAR_HEIGHT}
        barTopOffset={barTop}
        cellsPerDay={cellsPerDay}
        contextMenuBlurOtherCards={contextMenuBlurOtherCards}
        contextMenuTaskId={contextMenuTaskId}
        disableDragAndResize
        hideExtraDuration
        hideLinkRing
        initials=""
        isQa={false}
        originalStatus={pos.originalStatus}
        plannedInSprintVariant
        position={displayAsWeeks ? toWeekPosition(pos) : pos}
        readonly
        showToolsEmoji={false}
        task={task}
        taskId={task.id}
        teamBorder={teamBorder}
        teamColor={teamColor}
        totalParts={totalParts}
      />
    );
  });

  if (bars.length === 0) return null;
  if (bars.length === 1) return bars[0];
  return bars as React.ReactNode;
}
