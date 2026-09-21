'use client';

import type { FlattenedRow } from '../../utils/buildFlattenedRows';
import type { PositionPreview } from '../task-row/plan/OccupancyPhaseBar';
import type { TimelineSettings } from './OccupancyTableHeader';
import type { SprintInfo } from './OccupancyTableHeader';
import type { QuarterlyWeekColumn } from '@/features/sprint/components/SprintPlanner/occupancy/quarterlyTimelineHeader';
import type { StatusDuration } from '@/features/task/components/TaskTimeline/types';
import type { OccupancyRowFieldsVisibility } from '@/hooks/useLocalStorage';
import type { OccupancyTaskOrder } from '@/lib/api/types';
import type { GitLabMergeRequestFact } from '@/lib/gitlab/mergeRequestFactTypes';
import type { Developer, Task, TaskPosition } from '@/types';
import type { ChangelogEntry, IssueComment } from '@/types/tracker';

import React from 'react';

import { computeOccupancyFactRowHeightPx } from '@/features/gitlab/utils/gitlabFactTimelineLayoutHelpers';
import { QUARTERLY_STATUS_COLUMN_WIDTH_PX } from '@/features/quarterly-planning-v2/components/planner/quarterlyPlannerLayout';
import { renderQuarterlyPlannerTaskCells } from '@/features/quarterly-planning-v2/components/planner/renderQuarterlyPlannerTaskCells';
import { groupIssueCommentsByWeekColumn } from '@/features/quarterly-planning-v2/utils/issueCommentsWeekColumn';

import { getReestimationEvents } from '../actual/occupancyActualPhasesHelpers';
import { OccupancyParentRow } from '../other/OccupancyParentRow';
import { OccupancySortableRow } from '../other/OccupancySortableRow';
import { OccupancyTaskRow } from '../task-row/OccupancyTaskRow';

import { OccupancyAddTaskRow } from './OccupancyAddTaskRow';
import {
  computePlanRowHeightPx,
  computeRowMinHeight,
  computeUnplannedWarning,
} from './occupancyTableBodyRowMetrics';

const ROW_BORDER_PX = 1;

interface OccupancyTableBodyRowsProps {
  assigneeIdToTaskPositions: Map<string, Array<{ taskId: string; position: TaskPosition }>>;
  cellsPerDay?: 1 | 3;
  collapsedParents: Set<string>;
  contextMenuBlurOtherCards?: boolean;
  contextMenuTaskId?: string | null;
  dayColumnWidth: number | undefined;
  developerMap: Map<string, Developer>;
  displayAsWeeks?: boolean;
  displayColumnCount?: number;
  effectiveColumns: number;
  factChangelogs: Map<string, ChangelogEntry[]>;
  factComments: Map<string, IssueComment[]>;
  factDurations: Map<string, StatusDuration[]>;
  factVisible: boolean;
  gitlabFactByLink?: Record<string, GitLabMergeRequestFact>;
  goalStoryEpicNames: Set<string>;
  headerHeight: number;
  holidayDayIndices?: Set<number>;
  hoverConnectedPhaseIds: Set<string> | null;
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
  quarterlyPhaseStyle?: boolean;
  quarterlySplitTaskColumns?: boolean;
  rowFieldsVisibility?: OccupancyRowFieldsVisibility;
  segmentEditTaskId?: string | null;
  showIssueCommentsInWeeks?: boolean;
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

/** Строки тела таблицы занятости: parent/task rows внутри SortableContext. */

export function OccupancyTableBodyRows(props: OccupancyTableBodyRowsProps) {
  const {
    assigneeIdToTaskPositions,
    cellsPerDay = 3,
    visibleRows,
    collapsedParents,
    contextMenuBlurOtherCards = false,
    contextMenuTaskId = null,
    goalStoryEpicNames,
    taskPositions,
    developerMap,
    taskRowHeights,
    setTaskRowRef,
    taskColumnWidth,
    dayColumnWidth,
    totalParts,
    positionPreviews,
    occupancyErrorTaskIds,
    occupancyErrorReasons,
    overlappingTaskIds,
    parentStatuses,
    parentTypes,
    factChangelogs,
    factComments,
    factDurations,
    factVisible,
    gitlabFactByLink = {},
    timelineSettings,
    isReorderMode,
    legacyCompactLayout = false,
    rowFieldsVisibility,
    onTaskOrderChange,
    sprintStartDate,
    holidayDayIndices,
    onTaskClick,
    onContextMenu,
    onPositionSave,
    onSegmentEditCancel,
    onSegmentEditSave,
    segmentEditTaskId = null,
    handlePositionPreview,
    onCreateTaskForParent,
    handleEmptyCellClick,
    setHoveredPhaseTaskId,
    hoverConnectedPhaseIds,
    hoveredPhaseTaskId,
    linkingFromTaskId,
    sourceRowPhaseIds,
    sourceRowEndCell,
    taskLinks,
    onCancelLinking,
    onStartLinking,
    onCompleteLink,
    displayAsWeeks = false,
    displayColumnCount,
    quarterlyPhaseStyle = false,
    quarterlySplitTaskColumns = false,
    showIssueCommentsInWeeks = false,
    sprintInfos,
    timelineTotalParts,
    weekColumns,
    getRowId,
    toggleParent,
    effectiveColumns,
    headerHeight,
    workingDays = 10,
  } = props;

  return (
    <>
      {/* eslint-disable-next-line sonarjs/cognitive-complexity -- parent vs task branches; metrics in occupancyTableBodyRowMetrics */}
      {visibleRows.map((row, rowIndex) => {
        const rowId = getRowId(row);
        const isSortable = !!onTaskOrderChange && isReorderMode;

        if (row.type === 'parent') {
          const isCollapsed = collapsedParents.has(row.id);
          return (
            <OccupancySortableRow
              key={rowId}
              className="sticky z-30 bg-violet-50 dark:bg-slate-700"
              id={rowId}
              isSortable={isSortable}
              style={{
                top: headerHeight,
                height: 40,
                minHeight: 40,
                maxHeight: 40,
                boxSizing: 'border-box',
                transform: 'translateZ(0)',
                backfaceVisibility: 'hidden' as const,
              }}
            >
              {(dragHandle) => (
                <OccupancyParentRow
                  colSpan={effectiveColumns}
                  dragHandle={dragHandle}
                  goalStoryEpicNames={goalStoryEpicNames}
                  isCollapsed={isCollapsed}
                  issueType={row.key ? parentTypes?.get(row.key) : undefined}
                  quarterlySplitTaskColumns={quarterlySplitTaskColumns}
                  row={row}
                  status={row.key ? parentStatuses?.get(row.key) : undefined}
                  taskColumnWidth={taskColumnWidth}
                  onCreateTaskForParent={onCreateTaskForParent}
                  onToggle={toggleParent}
                />
              )}
            </OccupancySortableRow>
          );
        }

        const { task, qaTask } = row;
        const position = taskPositions.get(task.id);
        const qaPosition = qaTask ? taskPositions.get(qaTask.id) : undefined;
        const assignee = task.assignee ? developerMap.get(task.assignee) : undefined;
        const qaAssignee = qaTask?.assignee ? developerMap.get(qaTask.assignee) : undefined;
        // В полосе фазы и в колонке задачи при наличии позиции показываем исполнителя из позиции.
        const positionAssignee = position?.assignee ? developerMap.get(position.assignee) : undefined;
        const qaPositionAssignee = qaPosition?.assignee ? developerMap.get(qaPosition.assignee) : undefined;
        const nameFromPosition = position && positionAssignee ? positionAssignee.name : undefined;
        const qaNameFromPosition = qaPosition && qaPositionAssignee ? qaPositionAssignee.name : undefined;
        const assigneeDisplayName = nameFromPosition ?? task.assigneeName ?? assignee?.name;
        const qaDisplayName = qaTask ? (qaNameFromPosition ?? qaTask.assigneeName ?? qaAssignee?.name) : undefined;
        const initials = positionAssignee
          ? positionAssignee.name.split(' ').map((n) => n[0]).join('').toUpperCase()
          : '—';
        const qaInitials = qaPositionAssignee
          ? qaPositionAssignee.name.split(' ').map((n) => n[0]).join('').toUpperCase()
          : '—';
        const displayKey = (task.originalTaskId ? task.originalTaskId : task.id).toString();
        const hasQa = !!qaTask && task.id !== qaTask.id;
        const hasStoryPoints = task.storyPoints != null && task.storyPoints > 0;
        const hasTestPoints =
          (task.testPoints != null && task.testPoints > 0) ||
          (hasQa && !!qaTask && qaTask.testPoints != null && qaTask.testPoints > 0);
        const unplannedWarning = computeUnplannedWarning({
          hasQa,
          hasStoryPoints,
          hasTestPoints,
          position,
          qaPosition,
          task,
        });
        const isPlanned = unplannedWarning === null;
        const factDurationsForTask = factDurations.get(task.id) ?? [];
        const factChangelogForTask = factChangelogs.get(task.id) ?? [];
        const factCommentsForTask = factComments.get(task.id) ?? [];
        const mrLink = (task.MergeRequestLink ?? task.mergeRequestLink)?.trim() ?? '';
        const gitlabFactForTask = mrLink ? gitlabFactByLink[mrLink] : undefined;
        const reestimationAts = timelineSettings.showReestimations
          ? getReestimationEvents(factChangelogForTask).map((ev) => ev.updatedAt)
          : [];
        const factRowHeight = factVisible
          ? computeOccupancyFactRowHeightPx({
              commentAts: factCommentsForTask.map((comment) => comment.createdAt),
              gitlabEvents: gitlabFactForTask?.events,
              reestimationAts,
              showComments:
                timelineSettings.showComments && factCommentsForTask.length > 0,
              showGitlab: timelineSettings.showGitlab ?? true,
              showReestimations: reestimationAts.length > 0,
            })
          : 0;
        const rowMinHeight = computeRowMinHeight(
          legacyCompactLayout,
          factVisible,
          factRowHeight
        );
        const planRowHeight = computePlanRowHeightPx({
          legacyCompactLayout,
          rowMinHeight,
          taskId: task.id,
          taskRowHeights,
          unplannedWarning,
        });

        const issueCommentsByWeek =
          showIssueCommentsInWeeks &&
          weekColumns &&
          weekColumns.length > 0 &&
          sprintInfos &&
          factCommentsForTask.length > 0
            ? groupIssueCommentsByWeekColumn(factCommentsForTask, weekColumns, sprintInfos)
            : undefined;
        const hasFact = factVisible;
        const totalRowHeight = planRowHeight;
        const nextRow = visibleRows[rowIndex + 1];
        const isLastBeforeParent = nextRow?.type === 'parent';
        const isLastRow = rowIndex === visibleRows.length - 1;
        const showBottomBorder = !isLastBeforeParent || isLastRow;

        const parentSource = task.parent ?? task.epic;
        const parentForTask = parentSource
          ? {
              id: parentSource.id,
              display: parentSource.display,
              key: parentSource.key,
            }
          : undefined;
        const currentParentId = parentForTask?.id ?? '__root__';
        let nextParentId: string | undefined;
        if (nextRow && nextRow.type === 'task') {
          const nextParent = nextRow.task.parent ?? nextRow.task.epic;
          nextParentId = nextParent ? nextParent.id : '__root__';
        } else {
          nextParentId = undefined;
        }
        const isLastInParentGroup =
          !!parentForTask &&
          (nextRow == null ||
            nextRow.type === 'parent' ||
            nextParentId !== currentParentId);

        return (
          <React.Fragment key={rowId}>
            <OccupancySortableRow
              className={`relative border-gray-200 dark:border-gray-600 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors overflow-hidden ${showBottomBorder ? 'border-b border-gray-100 dark:border-gray-700' : ''}`}
              id={rowId}
              isSortable={isSortable}
              style={{
                height: totalRowHeight,
                minHeight: rowMinHeight - ROW_BORDER_PX,
              }}
            >
              {(dragHandle) => (
                <OccupancyTaskRow
                  assignee={assignee}
                  assigneeDisplayName={assigneeDisplayName}
                  assigneeIdToTaskPositions={assigneeIdToTaskPositions}
                  cellsPerDay={cellsPerDay}
                  contextMenuBlurOtherCards={contextMenuBlurOtherCards}
                  contextMenuTaskId={contextMenuTaskId}
                  dayColumnWidth={dayColumnWidth}
                  developerMap={developerMap}
                  displayAsWeeks={displayAsWeeks}
                  displayColumnCount={displayColumnCount ?? workingDays}
                  displayKey={displayKey}
                  dragHandle={dragHandle}
                  factChangelog={factChangelogForTask}
                  factChangelogs={factChangelogs}
                  factComments={factCommentsForTask}
                  factDurations={factDurationsForTask}
                  factRowHeight={factRowHeight}
                  gitlabFact={gitlabFactForTask}
                  goalStoryEpicNames={goalStoryEpicNames}
                  handleEmptyCellClick={handleEmptyCellClick}
                  handlePositionPreview={handlePositionPreview}
                  hasFact={hasFact}
                  hasQa={hasQa}
                  holidayDayIndices={holidayDayIndices}
                  hoverConnectedPhaseIds={hoverConnectedPhaseIds}
                  hoveredPhaseTaskId={hoveredPhaseTaskId}
                  initials={initials}
                  isPlanned={isPlanned}
                  isSortable={isSortable}
                  issueCommentsByWeek={issueCommentsByWeek}
                  legacyCompactLayout={legacyCompactLayout}
                  linkingFromTaskId={linkingFromTaskId}
                  occupancyErrorReasons={occupancyErrorReasons}
                  occupancyErrorTaskIds={occupancyErrorTaskIds}
                  overlappingTaskIds={overlappingTaskIds}
                  planRowHeight={planRowHeight}
                  position={position}
                  positionAssignee={positionAssignee}
                  positionPreviews={positionPreviews}
                  qaAssignee={qaAssignee}
                  qaDisplayName={qaDisplayName}
                  qaInitials={qaInitials}
                  qaPosition={qaPosition}
                  qaPositionAssignee={qaPositionAssignee}
                  qaTask={qaTask}
                  quarterlyPhaseStyle={quarterlyPhaseStyle}
                  rowFieldsVisibility={rowFieldsVisibility}
                  rowId={rowId}
                  rowMinHeight={rowMinHeight}
                  segmentEditTaskId={segmentEditTaskId}
                  setHoveredPhaseTaskId={setHoveredPhaseTaskId}
                  setTaskRowRef={setTaskRowRef}
                  showIssueCommentsInWeeks={showIssueCommentsInWeeks}
                  sourceRowEndCell={sourceRowEndCell}
                  sourceRowPhaseIds={sourceRowPhaseIds}
                  sprintInfos={sprintInfos}
                  sprintStartDate={sprintStartDate}
                  stickyTimelineOffset={
                    quarterlySplitTaskColumns
                      ? taskColumnWidth + QUARTERLY_STATUS_COLUMN_WIDTH_PX
                      : undefined
                  }
                  task={task}
                  taskCells={
                    quarterlySplitTaskColumns
                      ? renderQuarterlyPlannerTaskCells({
                          displayKey,
                          dragHandle,
                          rowHeightPx: totalRowHeight,
                          status: task.originalStatus,
                          statusColorKey: task.statusColorKey,
                          statusColumnWidth: QUARTERLY_STATUS_COLUMN_WIDTH_PX,
                          taskColumnWidth,
                          taskName: task.name,
                          taskType: task.type,
                        })
                      : undefined
                  }
                  taskColumnWidth={taskColumnWidth}
                  taskLinks={taskLinks}
                  taskRowHeights={taskRowHeights}
                  timelineSettings={timelineSettings}
                  timelineTotalParts={timelineTotalParts}
                  totalParts={totalParts}
                  totalRowHeight={totalRowHeight}
                  unplannedWarning={unplannedWarning}
                  weekColumns={weekColumns}
                  workingDays={workingDays}
                  onCancelLinking={onCancelLinking}
                  onCompleteLink={onCompleteLink}
                  onContextMenu={onContextMenu}
                  onPositionSave={onPositionSave}
                  onSegmentEditCancel={onSegmentEditCancel}
                  onSegmentEditSave={onSegmentEditSave}
                  onStartLinking={onStartLinking}
                  onTaskClick={onTaskClick}
                />
              )}
            </OccupancySortableRow>
            {onCreateTaskForParent &&
              parentForTask &&
              parentForTask.key &&
              isLastInParentGroup && (
                <OccupancyAddTaskRow
                  cellsPerDay={cellsPerDay}
                  dayColumnWidth={dayColumnWidth}
                  displayAsWeeks={displayAsWeeks}
                  effectiveColumns={effectiveColumns}
                  holidayDayIndices={holidayDayIndices}
                  legacyCompactLayout={legacyCompactLayout}
                  parent={parentForTask}
                  quarterlySplitTaskColumns={quarterlySplitTaskColumns}
                  sprintStartDate={sprintStartDate}
                  taskColumnWidth={taskColumnWidth}
                  workingDays={workingDays}
                  onCreateTaskForParent={onCreateTaskForParent}
                />
              )}
          </React.Fragment>
        );
      })}
    </>
  );
}
