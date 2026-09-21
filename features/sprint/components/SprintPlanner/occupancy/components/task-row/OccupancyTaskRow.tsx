'use client';

import type { TimelineSettings } from '../table/OccupancyTableHeader';
import type { SprintInfo } from '../table/OccupancyTableHeader';
import type { PositionPreview } from './plan/OccupancyPhaseBar';
import type { QuarterlyWeekColumn } from '@/features/sprint/components/SprintPlanner/occupancy/quarterlyTimelineHeader';
import type { StatusDuration } from '@/features/task/components/TaskTimeline/types';
import type { OccupancyRowFieldsVisibility } from '@/hooks/useLocalStorage';
import type { GitLabMergeRequestFact } from '@/lib/gitlab/mergeRequestFactTypes';
import type { Developer, SidebarTasksTab, Task, TaskPosition } from '@/types';
import type { ChangelogEntry, IssueComment } from '@/types/tracker';
import type React from 'react';

import { getAvatarVariantForDeveloper, getAvatarVariantForTeam } from '@/components/Avatar';

import { useOccupancyTaskRowState } from '../../hooks/useOccupancyTaskRowState';
import { OccupancyArrowsVisibilityReporter } from '../../OccupancyArrowsVisibilityReporter';
import { OccupancyActualPhasesLazy } from '../actual/OccupancyActualPhasesLazy';
import { OccupancyLazyByViewport } from '../table/OccupancyLazyByViewport';
import { OccupancyTimelineCells } from '../table/OccupancyTimelineCells';

import { OccupancyRowScrollArrows } from './OccupancyRowScrollArrows';
import { OccupancyTaskCell } from './OccupancyTaskCell';
import { OccupancyRowPlanOverlaysAndBars } from './plan/OccupancyRowPlanOverlaysAndBars';
import { OccupancyLinkButton } from './plan/overlays/OccupancyLinkButton';

const ROW_BORDER_PX = 1;

function resolveOccupancyTaskRowSegmentEditOpacity(
  segmentEditTaskId: string | null | undefined,
  segmentEditMode: boolean,
  taskId: string,
  qaTaskId: string | undefined
): number {
  if (!segmentEditMode) return 1;
  if (taskId === segmentEditTaskId) return 1;
  if (qaTaskId != null && qaTaskId === segmentEditTaskId) return 1;
  return 0.5;
}

interface OccupancyTaskRowProps {
  assignee?: Developer;
  assigneeDisplayName?: string;
  assigneeIdToTaskPositions?: Map<string, Array<{ taskId: string; position: TaskPosition }>>;
  /** 1 = одна ячейка на день, 3 = три части дня */
  cellsPerDay?: 1 | 3;
  contextMenuBlurOtherCards?: boolean;
  contextMenuTaskId?: string | null;
  dayColumnWidth: number | undefined;
  developerMap: Map<string, Developer>;
  /** В компактном режиме — колонки по неделям; число колонок для отображения */
  displayAsWeeks?: boolean;
  displayColumnCount?: number;
  displayKey: string;
  dragHandle: { attributes: object; listeners: object | undefined } | null;
  factChangelog: ChangelogEntry[];
  factChangelogs: Map<string, ChangelogEntry[]>;
  factComments: IssueComment[];
  factDurations: StatusDuration[];
  /** Высота полосы факта с учётом стека маркеров */
  factRowHeight: number;
  gitlabFact?: GitLabMergeRequestFact;
  goalStoryEpicNames?: Set<string>;
  hasFact: boolean;
  hasQa: boolean;
  /** Индексы дней (0..9), которые являются нерабочими/праздничными */
  holidayDayIndices?: Set<number>;
  hoverConnectedPhaseIds?: Set<string> | null;
  hoveredErrorTaskId?: string | null;
  hoveredPhaseTaskId?: string | null;
  initials: string;
  isPlanned: boolean;
  isSortable: boolean;
  issueCommentsByWeek?: Map<number, IssueComment[]>;
  /** Компактный режим строк занятости (настройка «Компактный») */
  legacyCompactLayout?: boolean;
  linkingFromTaskId?: string | null;
  occupancyErrorReasons: Map<string, string[]>;
  occupancyErrorTaskIds: Set<string>;
  overlappingTaskIds?: Set<string>;
  planRowHeight: number;
  position?: TaskPosition;
  positionAssignee?: Developer;
  positionPreviews: Map<string, PositionPreview>;
  qaAssignee?: Developer;
  qaDisplayName?: string;
  qaInitials: string;
  qaPosition?: TaskPosition;
  qaPositionAssignee?: Developer;
  qaTask?: Task;
  /** Режим фаз квартального плана: без доп. оценки, без ошибок, синие фазы и эмодзи инструментов */
  quarterlyPhaseStyle?: boolean;
  /** Набор полей, отображаемых в строке занятости */
  rowFieldsVisibility?: OccupancyRowFieldsVisibility;
  rowId: string;
  /** Минимальная высота строки (учитывает компакт + таймлайн факта) */
  rowMinHeight: number;
  /** ID задачи, для которой открыт редактор отрезков (dev или QA task id) */
  segmentEditTaskId?: string | null;
  showIssueCommentsInWeeks?: boolean;
  sourceRowEndCell?: number | null;
  sourceRowPhaseIds?: Set<string> | null;
  sprintInfos?: SprintInfo[];
  sprintStartDate: Date;
  /** Левый край таймлайна при двух колонках задач (название + статус) */
  stickyTimelineOffset?: number;
  task: Task;
  taskCells?: React.ReactNode;
  taskColumnWidth: number;
  taskLinks?: Array<{ fromTaskId: string; toTaskId: string; id: string }>;
  taskRowHeights: Map<string, number>;
  timelineSettings: TimelineSettings;
  timelineTotalParts?: number;
  totalParts: number;
  totalRowHeight: number;
  unplannedWarning: SidebarTasksTab | null;
  weekColumns?: QuarterlyWeekColumn[];
  /** Количество рабочих дней в таймлайне (10 для одного спринта, N*10 для мультиспринта) */
  workingDays?: number;
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
  onPositionSave?: (position: TaskPosition, isQa: boolean, devTaskKey?: string) => Promise<void> | void;
  onSegmentEditCancel?: () => void;
  onSegmentEditSave?: (position: TaskPosition, segments: Array<{ startDay: number; startPart: number; duration: number }>, isQa: boolean) => void;
  onStartLinking?: (taskId: string) => void;
  onTaskClick?: (taskId: string) => void;
  setHoveredPhaseTaskId?: (taskId: string | null) => void;
  setTaskRowRef: (taskId: string) => (el: HTMLDivElement | null) => void;
}

export function OccupancyTaskRow({
  task,
  qaTask,
  position,
  qaPosition,
  assignee,
  assigneeIdToTaskPositions,
  contextMenuBlurOtherCards = false,
  contextMenuTaskId = null,
  qaAssignee,
  goalStoryEpicNames,
  assigneeDisplayName,
  qaDisplayName,
  positionAssignee,
  qaPositionAssignee,
  initials,
  qaInitials,
  displayKey,
  hasQa,
  isPlanned,
  planRowHeight,
  rowMinHeight,
  issueCommentsByWeek,
  showIssueCommentsInWeeks = false,
  sprintInfos,
  timelineTotalParts,
  weekColumns,
  legacyCompactLayout = false,
  rowFieldsVisibility,
  totalRowHeight,
  developerMap,
  factChangelog,
  factChangelogs,
  factComments,
  factDurations,
  factRowHeight,
  gitlabFact,
  hasFact,
  taskCells,
  taskColumnWidth,
  stickyTimelineOffset,
  dayColumnWidth,
  totalParts,
  cellsPerDay = 3,
  positionPreviews,
  occupancyErrorTaskIds,
  occupancyErrorReasons,
  overlappingTaskIds,
  hoveredErrorTaskId,
  quarterlyPhaseStyle = false,
  unplannedWarning,
  displayAsWeeks = false,
  displayColumnCount,
  setTaskRowRef,
  sprintStartDate,
  timelineSettings,
  onTaskClick,
  onContextMenu,
  onPositionSave,
  handlePositionPreview,
  handleEmptyCellClick,
  setHoveredPhaseTaskId,
  hoveredPhaseTaskId = null,
  hoverConnectedPhaseIds,
  linkingFromTaskId = null,
  sourceRowPhaseIds = null,
  sourceRowEndCell = null,
  taskLinks = [],
  onCancelLinking,
  onCompleteLink,
  onStartLinking,
  dragHandle,
  holidayDayIndices,
  workingDays = 10,
  segmentEditTaskId = null,
  onSegmentEditCancel,
  onSegmentEditSave,
}: OccupancyTaskRowProps) {
  const state = useOccupancyTaskRowState({
    task,
    qaTask,
    position,
    qaPosition,
    assignee,
    qaAssignee,
    assigneeIdToTaskPositions,
    totalParts,
    displayAsWeeks,
    displayColumnCount,
    workingDays,
    legacyCompactLayout,
    planRowHeight,
    occupancyErrorReasons,
    cellsPerDay,
    linkingFromTaskId,
    sourceRowPhaseIds,
    sourceRowEndCell,
    taskLinks,
    handlePositionPreview,
    onPositionSave,
    handleEmptyCellClick,
  });

  const {
    hoveredCell,
    setHoveredCellBatched,
    planPhasesRef,
    linkedQaPreviewStart,
    phaseBarHeightPx,
    phaseBarTopOffsetPx,
    effectiveColSpan,
    toWeekPosition,
    fromWeekPosition,
    getErrorTooltip,
    handleDevPreviewChange,
    handleDevPositionSave,
    wrappedHandleEmptyCellClick,
    linkAlreadyExistsFromSource,
    validTargetByTime,
    assigneeOtherPositions,
    qaAssigneeOtherPositions,
    mainTask,
    effectivelyQa,
  } = state;

  const segmentEditMode =
    segmentEditTaskId != null && onSegmentEditSave != null && onSegmentEditCancel != null;
  const segmentEditRowOpacity = resolveOccupancyTaskRowSegmentEditOpacity(
    segmentEditTaskId,
    segmentEditMode,
    task.id,
    qaTask?.id
  );

  const timelineLeftOffset = stickyTimelineOffset ?? taskColumnWidth;

  return (
    <>
          {taskCells ?? (
          <OccupancyTaskCell
            assigneeDisplayName={assigneeDisplayName}
            devAvatarUrl={positionAssignee?.avatarUrl ?? assignee?.avatarUrl ?? null}
            devAvatarVariant={
              positionAssignee ?? assignee
                ? getAvatarVariantForDeveloper(positionAssignee ?? assignee!)
                : getAvatarVariantForTeam(task.team)
            }
            devInitials={initials}
            displayKey={displayKey}
            dragHandle={dragHandle}
            goalStoryEpicNames={goalStoryEpicNames}
            hasFact={hasFact}
            hasQa={hasQa}
            isPlanned={isPlanned}
            legacyCompactLayout={legacyCompactLayout}
            mainTask={mainTask}
            qaAvatarUrl={qaPositionAssignee?.avatarUrl ?? qaAssignee?.avatarUrl ?? null}
            qaDisplayName={qaDisplayName}
            qaInitials={qaInitials}
            qaTask={qaTask}
            rowFieldsVisibility={rowFieldsVisibility}
            rowHeightMinusBorder={totalRowHeight}
            rowOpacity={segmentEditRowOpacity}
            setTaskRowRef={setTaskRowRef}
            task={task}
            taskColumnWidth={taskColumnWidth}
            unplannedWarning={unplannedWarning}
            onContextMenu={onContextMenu}
            onTaskClick={onTaskClick}
          />
          )}
          <td
            className="relative border-r border-gray-200 dark:border-gray-600 p-0 align-top bg-gray-50/50 dark:bg-gray-800/50"
            colSpan={effectiveColSpan}
            style={{
              height: totalRowHeight,
              minHeight: rowMinHeight - ROW_BORDER_PX,
              boxSizing: 'border-box',
              verticalAlign: 'top',
              opacity: segmentEditRowOpacity,
              transition: 'opacity 0.2s ease',
            }}
          >
            <div className="relative h-full w-full">
              {/* Интерактивные ячейки на всю высоту */}
              <OccupancyTimelineCells
                assignee={assignee}
                cellsPerDay={cellsPerDay}
                dayColumnWidth={dayColumnWidth}
                developerMap={developerMap}
                displayAsWeeks={displayAsWeeks}
                handleEmptyCellClick={wrappedHandleEmptyCellClick}
                issueCommentsByWeek={issueCommentsByWeek}
                phaseBarHeightPx={phaseBarHeightPx}
                phaseBarTopOffsetPx={phaseBarTopOffsetPx}
                position={position}
                qaAssignee={qaAssignee}
                qaPosition={qaPosition}
                qaTask={qaTask}
                rowHeightMinusBorder={totalRowHeight}
                setHoveredCell={setHoveredCellBatched}
                showIssueCommentsInWeeks={showIssueCommentsInWeeks}
                sprintInfos={sprintInfos}
                sprintStartDate={sprintStartDate}
                task={task}
                timelineTotalParts={timelineTotalParts}
                weekColumns={weekColumns}
                workingDays={effectiveColSpan}
                {...(holidayDayIndices ? { holidayDayIndices } : {})}
              />
              {/* Контейнер фаз плана (без факта) — рендер только в viewport для снижения фризов */}
              <OccupancyLazyByViewport
                ref={planPhasesRef}
                className="absolute left-0 right-0 pointer-events-none group/phase-row"
                style={{
                  top: 4,
                  height: hasFact
                    ? planRowHeight - 4 - factRowHeight
                    : planRowHeight - 4,
                }}
              >
                {(inView) => (
                  <>
                    <OccupancyArrowsVisibilityReporter
                      inView={inView}
                      taskIds={[task.id, qaTask?.id].filter((id): id is string => Boolean(id))}
                    />
                    {inView ? (
                    <>
                      <OccupancyRowPlanOverlaysAndBars
                        assignee={assignee}
                        assigneeOtherPositions={assigneeOtherPositions}
                        cellsPerDay={cellsPerDay}
                        contextMenuBlurOtherCards={contextMenuBlurOtherCards}
                        contextMenuTaskId={contextMenuTaskId}
                        displayAsWeeks={displayAsWeeks}
                        effectivelyQa={effectivelyQa}
                        factChangelog={factChangelog}
                        factChangelogs={factChangelogs}
                        fromWeekPosition={fromWeekPosition}
                        getErrorTooltip={getErrorTooltip}
                        handleDevPositionSave={handleDevPositionSave}
                        handleDevPreviewChange={handleDevPreviewChange}
                        handlePositionPreview={handlePositionPreview}
                        holidayDayIndices={holidayDayIndices}
                        hoverConnectedPhaseIds={hoverConnectedPhaseIds}
                        hoveredCell={hoveredCell}
                        hoveredErrorTaskId={hoveredErrorTaskId}
                        hoveredPhaseTaskId={hoveredPhaseTaskId}
                        initials={initials}
                        linkAlreadyExistsFromSource={linkAlreadyExistsFromSource}
                        linkedQaPreviewStart={linkedQaPreviewStart}
                        linkingFromTaskId={linkingFromTaskId}
                        occupancyErrorTaskIds={occupancyErrorTaskIds}
                        overlappingTaskIds={overlappingTaskIds}
                        phaseBarHeightPx={phaseBarHeightPx}
                        phaseBarTopOffsetPx={phaseBarTopOffsetPx}
                        position={position}
                        positionAssignee={positionAssignee}
                        positionPreviews={positionPreviews}
                        qaAssignee={qaAssignee}
                        qaAssigneeOtherPositions={qaAssigneeOtherPositions}
                        qaInitials={qaInitials}
                        qaPosition={qaPosition}
                        qaPositionAssignee={qaPositionAssignee}
                        qaTask={qaTask}
                        quarterlyPhaseStyle={quarterlyPhaseStyle}
                        segmentEditTaskId={segmentEditTaskId}
                        setHoveredPhaseTaskId={setHoveredPhaseTaskId}
                        sprintStartDate={sprintStartDate}
                        task={task}
                        timelineSettings={timelineSettings}
                        toWeekPosition={toWeekPosition}
                        totalParts={totalParts}
                        validTargetByTime={validTargetByTime}
                        onCompleteLink={onCompleteLink}
                        onContextMenu={onContextMenu}
                        onPositionSave={onPositionSave}
                        onSegmentEditCancel={onSegmentEditCancel}
                        onSegmentEditSave={onSegmentEditSave}
                      />
                <OccupancyLinkButton
                  linkingFromTaskId={linkingFromTaskId}
                  phaseBarHeightPx={phaseBarHeightPx}
                  phaseBarTopOffsetPx={phaseBarTopOffsetPx}
                  position={position}
                  positionPreviews={positionPreviews}
                  qaPosition={qaPosition}
                  qaTask={qaTask}
                  task={task}
                  totalParts={totalParts}
                  onCancelLinking={onCancelLinking}
                  onStartLinking={onStartLinking}
                />
                <OccupancyRowScrollArrows
                  phaseBarHeightPx={phaseBarHeightPx}
                  phaseBarTopOffsetPx={phaseBarTopOffsetPx}
                  planPhasesRef={planPhasesRef}
                  taskColumnWidth={timelineLeftOffset}
                />
                    </>
                  ) : null}
                  </>
                )}
              </OccupancyLazyByViewport>
              {hasFact && (
                <OccupancyActualPhasesLazy
                  changelog={factChangelog}
                  comments={factComments}
                  developerMap={developerMap}
                  durations={factDurations}
                  factRowHeight={factRowHeight}
                  gitlabFact={gitlabFact}
                  showComments={timelineSettings.showComments}
                  showGitlab={timelineSettings.showGitlab ?? true}
                  showReestimations={timelineSettings.showReestimations}
                  showStatuses={timelineSettings.showStatuses}
                  sprintStartDate={sprintStartDate}
                  taskCreatedAt={task.createdAt}
                  taskId={task.id}
                  totalParts={totalParts}
                />
              )}
            </div>
          </td>
    </>
  );
}
