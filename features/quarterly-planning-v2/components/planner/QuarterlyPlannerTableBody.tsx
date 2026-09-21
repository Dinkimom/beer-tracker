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

import { useI18n } from '@/contexts/LanguageContext';

import { getStoryPhaseList } from '../../utils/storyPhasesMap';

import { QuarterlyPlannerPlanFactTimeline } from './plan/QuarterlyPlannerPlanFactTimeline';
import { QuarterlyPlannerPlannedInSprintTimeline } from './plan/QuarterlyPlannerPlannedInSprintTimeline';
import { QUARTERLY_PLAN_ROW_HEIGHT_PX } from './quarterlyPlannerLayout';

const EMPTY_DEVELOPER_MAP = new Map<string, never>();

const TIMELINE_CELL_CLASS =
  'relative border-r border-gray-200 dark:border-gray-600 p-0 align-top';

interface QuarterlyPlannerTableBodyProps {
  isEditingPlan: boolean;
  plannedInSprintPositions: Map<string, TaskPosition[]>;
  sprintInfos: QuarterlySprintInfo[];
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
}

export function QuarterlyPlannerTableBody({
  visibleRows,
  storyPhasesByStory,
  taskColumnWidth,
  weekCount,
  weekColumns,
  sprintInfos,
  weekColumnWidth,
  renderTaskCells,
  onStoryEventsChange,
  onStoryPhasesChange,
  onRemoveTaskFromPlan,
  storyEventsByStory,
  isEditingPlan,
  plannedInSprintPositions,
}: QuarterlyPlannerTableBodyProps) {
  const { t } = useI18n();

  if (visibleRows.length === 0) {
    return (
      <tbody>
        <tr>
          <td
            className="px-3 py-6 text-center text-sm text-gray-500 dark:text-gray-400"
            colSpan={2 + weekCount}
          >
            {t('planning.quarterlyV2.emptyPlanHint')}
          </td>
        </tr>
      </tbody>
    );
  }

  const timelineBg = 'bg-gray-50/50 dark:bg-gray-800/50';

  return (
    <tbody>
      {visibleRows.map((row) => {
        if (row.type !== 'task') return null;

        const { task } = row;
        const phases = getStoryPhaseList(storyPhasesByStory, task.id);
        const displayKey = (task.originalTaskId ?? task.id).toString();
        const plannedInSprintList = plannedInSprintPositions.get(task.id) ?? [];

        return (
          <tr
            key={task.id}
            className="group/quarterly-task-row border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50/50 dark:hover:bg-gray-800/50"
          >
            {renderTaskCells({
              displayKey,
              task,
              taskColumnWidth,
              rowHeightPx: QUARTERLY_PLAN_ROW_HEIGHT_PX,
              rowSpan: 1,
              sizeToContent: true,
              onRemoveFromPlan: onRemoveTaskFromPlan
                ? () => onRemoveTaskFromPlan(task)
                : undefined,
            })}
            <td
              className={`${TIMELINE_CELL_CLASS} ${timelineBg} relative p-0 align-top`}
              colSpan={weekCount}
              style={{ minHeight: QUARTERLY_PLAN_ROW_HEIGHT_PX, height: '100%' }}
            >
              <QuarterlyPlannerPlanFactTimeline
                developerMap={EMPTY_DEVELOPER_MAP}
                isEditingPlan={isEditingPlan}
                phases={phases}
                sprintInfos={sprintInfos}
                storyEventsByStory={storyEventsByStory}
                storyKey={task.id}
                task={task}
                weekColumnWidth={weekColumnWidth}
                weekColumns={weekColumns}
                weekCount={weekCount}
                onPhasesChange={onStoryPhasesChange}
                onStoryEventChange={(weekIndex, kind) =>
                  onStoryEventsChange(task.id, weekIndex, kind)
                }
              />
              <QuarterlyPlannerPlannedInSprintTimeline
                plannedInSprintList={plannedInSprintList}
                task={task}
                weekColumnWidth={weekColumnWidth}
                weekCount={weekCount}
              />
            </td>
          </tr>
        );
      })}
    </tbody>
  );
}
