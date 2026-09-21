'use client';

import type {
  QuarterlySprintInfo,
  QuarterlyStoryEventKind,
  StoryEventsByStory,
  StoryPhasePosition,
  StoryPhasesByStory,
} from '../../types';
import type { QuarterlyWeekColumn } from '@/features/quarterly-planning-v2/utils/quarterlyTimelineHeader';
import type { FlattenedRow } from '@/features/sprint/components/SprintPlanner/occupancy/utils/buildFlattenedRows';
import type { Task, TaskPosition } from '@/types';
import type { ReactNode } from 'react';

import { QuarterlyPlannerTableBody } from './QuarterlyPlannerTableBody';
import { QuarterlyPlannerTableHeader } from './QuarterlyPlannerTableHeader';

interface QuarterlyPlannerTableProps {
  currentSprintIndex: number;
  dateLocale: string;
  dayColumnWidth: number | undefined;
  isEditingPlan: boolean;
  isResizing: boolean;
  plannedInSprintPositions: Map<string, TaskPosition[]>;
  sprintInfos: QuarterlySprintInfo[];
  statusColumnWidth: number;
  storyEventsByStory: StoryEventsByStory;
  storyPhasesByStory: StoryPhasesByStory;
  taskColumnWidth: number;
  visibleRows: FlattenedRow[];
  weekColumns: QuarterlyWeekColumn[];
  weekColumnWidth: number | undefined;
  weekCount: number;
  onRemoveTaskFromPlan?: (task: Task) => void;
  onStoryEventsChange: (
    storyKey: string,
    weekIndex: number,
    kind: QuarterlyStoryEventKind | null
  ) => void;
  onStoryPhasesChange: (storyKey: string, phases: StoryPhasePosition[]) => void;
  renderTaskCells: (ctx: {
    displayKey: string;
    onRemoveFromPlan?: () => void;
    rowHeightPx: number;
    rowSpan: number;
    sizeToContent?: boolean;
    task: Task;
    taskColumnWidth: number;
  }) => ReactNode;
  setIsResizing: (value: boolean) => void;
}

export function QuarterlyPlannerTable({
  currentSprintIndex,
  dateLocale,
  dayColumnWidth,
  isEditingPlan,
  isResizing,
  onStoryEventsChange,
  onStoryPhasesChange,
  onRemoveTaskFromPlan,
  plannedInSprintPositions,
  renderTaskCells,
  setIsResizing,
  sprintInfos,
  statusColumnWidth,
  taskColumnWidth,
  storyEventsByStory,
  storyPhasesByStory,
  visibleRows,
  weekColumnWidth,
  weekColumns,
  weekCount,
}: QuarterlyPlannerTableProps) {
  return (
    <table className="border-collapse table-fixed w-full" data-quarterly-planner-table>
      <colgroup>
        <col style={{ width: taskColumnWidth, minWidth: taskColumnWidth }} />
        <col style={{ width: statusColumnWidth, minWidth: statusColumnWidth }} />
        {Array.from({ length: weekCount }, (_, i) => (
          <col
            key={i}
            style={
              dayColumnWidth != null
                ? { width: dayColumnWidth, minWidth: dayColumnWidth }
                : undefined
            }
          />
        ))}
      </colgroup>
      <QuarterlyPlannerTableHeader
        currentSprintIndex={currentSprintIndex}
        dateLocale={dateLocale}
        dayColumnWidth={dayColumnWidth}
        isResizing={isResizing}
        setIsResizing={setIsResizing}
        sprintInfos={sprintInfos}
        statusColumnWidth={statusColumnWidth}
        taskColumnWidth={taskColumnWidth}
      />
      <QuarterlyPlannerTableBody
        isEditingPlan={isEditingPlan}
        plannedInSprintPositions={plannedInSprintPositions}
        renderTaskCells={renderTaskCells}
        sprintInfos={sprintInfos}
        storyEventsByStory={storyEventsByStory}
        storyPhasesByStory={storyPhasesByStory}
        taskColumnWidth={taskColumnWidth}
        visibleRows={visibleRows}
        weekColumnWidth={weekColumnWidth}
        weekColumns={weekColumns}
        weekCount={weekCount}
        onRemoveTaskFromPlan={onRemoveTaskFromPlan}
        onStoryEventsChange={onStoryEventsChange}
        onStoryPhasesChange={onStoryPhasesChange}
      />
    </table>
  );
}
