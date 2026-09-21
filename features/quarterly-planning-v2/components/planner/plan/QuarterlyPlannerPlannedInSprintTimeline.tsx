'use client';

import type { Task, TaskPosition } from '@/types';

import { useMemo } from 'react';

import { usePhaseCardColorScheme } from '@/components/PhaseCardColorSchemeContext';
import {
  dedupePlannedPositions,
  getPlannedInSprintMaxStack,
} from '@/features/quarterly-planning-v2/hooks/usePlannedInSprintPositions';
import { OccupancyPlannedInSprintBars } from '@/features/sprint/components/SprintPlanner/occupancy/components/task-row/plan/OccupancyPlannedInSprintBars';
import { getTaskCardStyles } from '@/features/task/components/TaskCard/components/TaskCardBody';

import { useQuarterlyWeekPositions } from '../../../hooks/useQuarterlyWeekPositions';
import {
  QUARTERLY_PLANNED_SPRINT_BAR_GAP_PX,
  QUARTERLY_PLANNED_SPRINT_BAR_HEIGHT_PX,
  QUARTERLY_PLANNED_SPRINT_ROW_BOTTOM_PX,
  QUARTERLY_PLANNED_SPRINT_ROW_TOP_PX,
  QUARTERLY_TIMELINE_SUBROW_HEIGHT_PX,
} from '../quarterlyPlannerLayout';

import { QuarterlyPlannerTimelineWeekStrip } from './QuarterlyPlannerTimelineWeekStrip';

/** Высота области с полосами по фактическому стеку пересечений. */
export function measurePlannedInSprintContentHeight(positions: TaskPosition[]): number {
  const unique = dedupePlannedPositions(positions);
  if (unique.length === 0) {
    return QUARTERLY_TIMELINE_SUBROW_HEIGHT_PX;
  }
  const stack = Math.max(1, getPlannedInSprintMaxStack(unique));
  const barsHeight =
    stack * QUARTERLY_PLANNED_SPRINT_BAR_HEIGHT_PX +
    (stack - 1) * QUARTERLY_PLANNED_SPRINT_BAR_GAP_PX;
  return QUARTERLY_PLANNED_SPRINT_ROW_TOP_PX + barsHeight + QUARTERLY_PLANNED_SPRINT_ROW_BOTTOM_PX;
}

interface QuarterlyPlannerPlannedInSprintTimelineProps {
  plannedInSprintList: TaskPosition[];
  task: Task;
  weekColumnWidth: number | undefined;
  weekCount: number;
}

export function QuarterlyPlannerPlannedInSprintTimeline({
  plannedInSprintList,
  task,
  weekColumnWidth,
  weekCount,
}: QuarterlyPlannerPlannedInSprintTimelineProps) {
  const { toWeekPosition } = useQuarterlyWeekPositions();
  const phaseCardColorScheme = usePhaseCardColorScheme();
  const cardStyles = getTaskCardStyles(task, 'swimlane', phaseCardColorScheme);

  const uniquePlannedList = useMemo(
    () => dedupePlannedPositions(plannedInSprintList),
    [plannedInSprintList]
  );

  const contentHeightPx = useMemo(
    () => measurePlannedInSprintContentHeight(uniquePlannedList),
    [uniquePlannedList]
  );

  if (uniquePlannedList.length === 0) {
    return null;
  }

  return (
    <div className="relative w-full bg-gray-50/30 dark:bg-gray-800/30" data-quarterly-planned-row>
      <div
        className="relative w-full"
        style={{ height: contentHeightPx, minHeight: contentHeightPx }}
      >
        <QuarterlyPlannerTimelineWeekStrip
          className="absolute inset-0 z-0"
          rowHeightPx={contentHeightPx}
          weekColumnWidth={weekColumnWidth}
          weekCount={weekCount}
        />
        <div className="absolute inset-0 z-10 pointer-events-none">
          <OccupancyPlannedInSprintBars
            cellsPerDay={1}
            displayAsWeeks
            effectivelyQa={false}
            plannedInSprintList={uniquePlannedList}
            sprintBarTop={QUARTERLY_PLANNED_SPRINT_ROW_TOP_PX}
            task={task}
            teamBorder={cardStyles.teamBorder}
            teamColor={cardStyles.teamColor}
            toWeekPosition={toWeekPosition}
            totalParts={weekCount}
          />
        </div>
      </div>
    </div>
  );
}
