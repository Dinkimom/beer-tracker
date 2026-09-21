'use client';

import type { FlattenedRow } from '../../utils/buildFlattenedRows';
import type { PositionPreview } from '../task-row/plan/OccupancyPhaseBar';
import type { TimelineSettings } from './OccupancyTableHeader';
import type { SprintInfo } from './OccupancyTableHeader';
import type { QuarterlyWeekColumn } from '@/features/sprint/components/SprintPlanner/occupancy/quarterlyTimelineHeader';
import type { AvailabilitySegment } from '@/features/swimlane/utils/availabilitySegments';
import type { StatusDuration } from '@/features/task/components/TaskTimeline/types';
import type { OccupancyRowFieldsVisibility } from '@/hooks/useLocalStorage';
import type { OccupancyTaskOrder } from '@/lib/api/types';
import type { GitLabMergeRequestFact } from '@/lib/gitlab/mergeRequestFactTypes';
import type { Developer, Task, TaskPosition } from '@/types';
import type { ChangelogEntry, IssueComment } from '@/types/tracker';

import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import React from 'react';

import { SingleTooltipGroupProvider } from '@/components/SingleTooltipGroupContext';

import { OccupancyAvailabilitySection } from '../availability/OccupancyAvailabilitySection';
import { OccupancyEmptyState } from '../shared/OccupancyEmptyState';

import {
  computeEffectiveColumns,
  computeOccupancyTableEmptyColSpan,
} from './occupancyTableBodyLayout';
import { OccupancyTableBodyRows } from './OccupancyTableBodyRows';

const OCCUPANCY_DAY_ROW_HEIGHT = 40;

interface OccupancyTableBodyProps {
  assigneeIdToTaskPositions: Map<string, Array<{ taskId: string; position: TaskPosition }>>;
  availabilityDevelopersWithSegments: Array<{
    developer: Developer;
    segments: AvailabilitySegment[];
  }>;
  /** 1 = одна ячейка на день, 3 = три части дня (по умолчанию) */
  cellsPerDay?: 1 | 3;
  collapsedParents: Set<string>;
  contextMenuBlurOtherCards?: boolean;
  contextMenuTaskId?: string | null;
  dayColumnWidth: number | undefined;
  developerMap: Map<string, Developer>;
  /** В компактном режиме — колонки по неделям (2 на спринт) */
  displayAsWeeks?: boolean;
  displayColumnCount?: number;
  factChangelogs: Map<string, ChangelogEntry[]>;
  factComments: Map<string, IssueComment[]>;
  factDurations: Map<string, StatusDuration[]>;
  factVisible: boolean;
  /** GitLab MR fact по ссылке (checks + events), кэш 10 мин */
  gitlabFactByLink?: Record<string, GitLabMergeRequestFact>;
  globalNameFilter: string;
  goalStoryEpicNames: Set<string>;
  /** Высота шапки для позиционирования sticky parent-строк */
  headerHeight?: number;
  /** Индексы дней (0..9), которые являются нерабочими/праздничными */
  holidayDayIndices?: Set<number>;
  hoverConnectedPhaseIds: Set<string> | null;
  hoveredErrorTaskId?: string | null;
  hoveredPhaseTaskId: string | null;
  isReorderMode: boolean;
  legacyCompactLayout?: boolean;
  linkingFromTaskId: string | null;
  occupancyErrorReasons: Map<string, string[]>;
  occupancyErrorTaskIds: Set<string>;
  overlappingTaskIds?: Set<string>;
  parentStatuses?: Map<string, string>;
  parentTypes?: Map<string, string>;
  positionPreviews: Map<string, PositionPreview>;
  /** Режим фаз квартального плана: без доп. оценки, без ошибок, синие фазы и эмодзи инструментов */
  quarterlyPhaseStyle?: boolean;
  /** Отдельные колонки «задача» и «статус» (квартальный планировщик v2) */
  quarterlySplitTaskColumns?: boolean;
  /** Набор полей, отображаемых в строке занятости */
  rowFieldsVisibility?: OccupancyRowFieldsVisibility;
  segmentEditTaskId?: string | null;
  /** Комментарии Трекера в недельных ячейках (квартальный план) */
  showIssueCommentsInWeeks?: boolean;
  sortableRowIds: string[];
  sourceRowEndCell: number | null;
  sourceRowPhaseIds: Set<string> | null;
  sprintInfos?: SprintInfo[];
  sprintStartDate: Date;
  taskColumnWidth: number;
  taskLinks: Array<{ fromTaskId: string; toTaskId: string; id: string }>;
  taskPositions: Map<string, TaskPosition>;
  taskRowHeights: Map<string, number>;
  timelineSettings: TimelineSettings;
  timelineTotalParts?: number;
  totalParts: number;
  visibleRows: FlattenedRow[];
  weekColumns?: QuarterlyWeekColumn[];
  /** Количество рабочих дней в таймлайне (10 для одного спринта, N*10 для мультиспринта) */
  workingDays?: number;
  getRowId: (row: FlattenedRow) => string;
  handleEmptyCellClick: (
    targetTask: Task,
    dayIndex: number,
    partIndex: number,
    cellElement: HTMLElement,
    getAnchorRect?: (cell: HTMLElement) => DOMRect
  ) => void;
  handlePositionPreview: (taskId: string, preview: PositionPreview | null) => void;
  onCancelLinking?: () => void;
  onCompleteLink?: (toTaskId: string) => void;
  onContextMenu?: (e: React.MouseEvent, task: Task, isBacklogTask?: boolean, hideRemoveFromPlan?: boolean) => void;
  /** Создание задачи для родительской строки (стори) */
  onCreateTaskForParent?: (row: { id: string; display: string; key?: string }) => void;
  onPositionSave?: (position: TaskPosition, isQa: boolean, devTaskKey?: string) => Promise<void> | void;
  onSegmentEditCancel?: () => void;
  onSegmentEditSave?: (position: TaskPosition, segments: Array<{ startDay: number; startPart: number; duration: number }>, isQa: boolean) => void;
  onStartLinking?: (taskId: string) => void;
  onTaskClick?: (taskId: string) => void;
  onTaskOrderChange?: (order: OccupancyTaskOrder) => void;
  setHoveredPhaseTaskId: (taskId: string | null) => void;
  setTaskRowRef: (taskId: string) => (el: HTMLDivElement | null) => void;
  toggleParent: (parentId: string) => void;
}

/** Тело таблицы: строки родителей и задач с DnD. */

export function OccupancyTableBody(props: OccupancyTableBodyProps) {
  const {
    displayAsWeeks = false,
    displayColumnCount,
    globalNameFilter,
    quarterlySplitTaskColumns = false,
    sortableRowIds,
    visibleRows,
    availabilityDevelopersWithSegments,
    dayColumnWidth,
    legacyCompactLayout = false,
    taskColumnWidth,
    workingDays = 10,
    headerHeight = OCCUPANCY_DAY_ROW_HEIGHT,
  } = props;

  const effectiveColumns = computeEffectiveColumns({
    displayAsWeeks,
    displayColumnCount,
    workingDays,
  });

  if (visibleRows.length === 0) {
    const emptyColSpan = computeOccupancyTableEmptyColSpan({
      displayAsWeeks,
      displayColumnCount,
      quarterlySplitTaskColumns,
      workingDays,
    });
    return (
      <tbody>
        <OccupancyEmptyState globalNameFilter={globalNameFilter} tableColSpan={emptyColSpan} />
      </tbody>
    );
  }

  return (
    <tbody>
      <SingleTooltipGroupProvider>
        <SortableContext items={sortableRowIds} strategy={verticalListSortingStrategy}>
          <OccupancyTableBodyRows
            {...props}
            effectiveColumns={effectiveColumns}
            headerHeight={headerHeight}
          />
        </SortableContext>
        <OccupancyAvailabilitySection
          availabilityDevelopersWithSegments={availabilityDevelopersWithSegments}
          dayColumnWidth={dayColumnWidth}
          legacyCompactLayout={legacyCompactLayout}
          taskColumnWidth={taskColumnWidth}
          workingDays={workingDays}
        />
      </SingleTooltipGroupProvider>
    </tbody>
  );
}
