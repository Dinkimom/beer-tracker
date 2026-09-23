'use client';

import type { SwimlaneProps } from '@/features/swimlane/components/SwimlaneProps';
import type { Developer } from '@/types';
import type { ChangelogEntry, IssueComment } from '@/types/tracker';

import { useDroppable } from '@dnd-kit/core';
import { observer } from 'mobx-react-lite';
import React, { useContext, useMemo, useState } from 'react';

import { WORKING_DAYS, getPartsPerDay } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import { sprintPlannerSwimlaneTimelineWidthCss } from '@/features/sprint/components/SprintPlanner/layout/sprintPlannerSwimlaneLayoutWidths';
import { canQuickAddOnSwimlaneLane } from '@/features/sprint/components/SprintPlanner/utils/swimlanePlacementToolbar';
import { SwimlaneInProgressFactLayer } from '@/features/swimlane/components/in-progress-fact';
import { memoizedSwimlanePropsEqual } from '@/features/swimlane/components/memoizedSwimlanePropsEqual';
import { SwimlaneAvailabilityChips } from '@/features/swimlane/components/SwimlaneAvailabilityChips';
import { SwimlaneAvailabilityModalGate } from '@/features/swimlane/components/SwimlaneAvailabilityModalGate';
import { SwimlaneCalendarBusyLane } from '@/features/swimlane/components/SwimlaneCalendarBusyLane';
import { SwimlaneDeveloperHeader } from '@/features/swimlane/components/SwimlaneDeveloperHeader';
import {
  SwimlaneQuickAddPreview,
  type SwimlaneQuickAddHoverPreview,
} from '@/features/swimlane/components/SwimlaneQuickAddPreview';
import { resolveSwimlaneQuickAddPreviewToolProps } from '@/features/swimlane/components/swimlaneQuickAddPreviewAppearance';
import {
  SwimlaneRowReservedHeightControls,
  useSwimlaneRowReservedHeightControls,
  useSwimlaneRowReservedLayersForAssignee,
} from '@/features/swimlane/components/SwimlaneRowReservedHeightControls';
import { TaskLayer } from '@/features/swimlane/components/TaskLayer';
import { TimelineGrid } from '@/features/swimlane/components/TimelineGrid';
import { useSwimlaneDocumentDarkClass } from '@/features/swimlane/hooks/in-progress-fact/useSwimlaneDocumentDarkClass';
import { useSwimlaneAvailabilityUi } from '@/features/swimlane/hooks/useSwimlaneAvailabilityUi';
import { useSwimlaneLayout } from '@/features/swimlane/hooks/useSwimlaneLayout';
import { useSwimlaneQuickAddHoverImagePaste } from '@/features/swimlane/hooks/useSwimlaneQuickAddHoverImagePaste';
import { availabilityKindMessageKey } from '@/features/swimlane/utils/availabilityCardKind';
import { resolveSwimlaneQuickAddBandLayout } from '@/features/swimlane/utils/swimlaneCellOccupancy';
import { resolveSwimlaneOneCardHeightPx } from '@/features/swimlane/utils/swimlaneRowReservedLayers';
import { useSwimlaneCardFieldsStorage } from '@/hooks/useLocalStorage';
import { useRootStore } from '@/lib/layers';
import { isTeamSwimlaneAssigneeId } from '@/lib/swimlane/teamSwimlaneAssignee';

import { SwimlaneArrowRedrawContext } from '../SwimlaneArrowRedrawContext';

import {
  buildSwimlanePlacementQuickAddHandler,
  buildSwimlaneRootClassName,
  createSwimlaneRootClickHandler,
  resolveSwimlaneAvailabilityTimeline,
  resolveSwimlaneFactExtra,
  resolveSwimlaneQuickAddLayoutState,
  resolveSwimlaneSecondaryLaneLayout,
} from './swimlaneHelpers';

const EMPTY_SWIMLANE_FACT_CHANGELOGS = new Map<string, ChangelogEntry[]>();
const EMPTY_SWIMLANE_FACT_COMMENTS = new Map<string, IssueComment[]>();
const EMPTY_SWIMLANE_FACT_DEVELOPERS = new Map<string, Developer>();

function SwimlaneComponent({
  developer,
  tasks: _tasks, // только для сравнения в React.memo, в рендере не используется
  taskPositions,
  tasksMap,
  activeDraggableId = null,
  activeTaskDuration,
  activeTask,
  boardId = null,
  calendarBusySegments = [],
  calendarBusyVisible = false,
  commentCardRowById,
  globalNameFilter,
  hoveredCell,
  hoverConnectedTaskIds = null,
  hoveredTaskId = null,
  isDraggingTask = false,
  isPinned = false,
  selectedTaskId = null,
  onTaskResize,
  onTaskClick,
  onCreateQATask,
  participantsColumnWidth,
  qaTasksMap,
  viewMode = 'full',
  sidebarWidth = 0,
  sidebarOpen = false,
  sprintStartDate,
  sprintTimelineWorkingDays = WORKING_DAYS,
  developers,
  onCommentCreate,
  onCommentCardRowLayoutUpdate,
  onCommentApprove,
  onCommentDelete,
  onCommentUpdate,
  onCloseSidebar,
  onTaskHover,
  onContextMenu,
  onCreateTaskInCell,
  onCancelQuickAddDraft,
  quickAddBoardId = null,
  quickAddExcludedIssueKeys,
  quickAddParentSelectOptions = [],
  quickAddQueueOptions = [],
  quickAddSubmittingTaskId = null,
  onPasteQuickAddNote,
  onQuickAddDraftAssigneeChange,
  onQuickAddDraftCommentColorChange,
  onQuickAddDraftKindChange,
  onQuickAddDraftImageUrlChange,
  onQuickAddDraftParentChange,
  onQuickAddDraftQueueChange,
  onQuickAddDraftTypeChange,
  onQuickAddDraftTitleChange,
  onSubmitQuickAddCommentDraft,
  onSubmitQuickAddDiagramDraft,
  onSubmitQuickAddImageDraft,
  onSubmitQuickAddDraft,
  onSelectExistingQuickAddDraft,
  contextMenuBlurOtherCards = false,
  contextMenuTaskId = null,
  selectedSprintId,
  disableCloseSidebarOnClick = false,
  errorReasons,
  errorTaskIds,
  factHoveredTaskId,
  developerAvailability,
  holidayDayIndices,
  swimlaneFactChangelogsByTaskId,
  swimlaneFactCommentsByTaskId,
  swimlaneFactDeveloperMap,
  swimlaneFactTimelineEnabled = false,
  linkingFromTaskId = null,
  linkSourceEndCell = null,
  taskLinks,
  segmentEditTaskId = null,
  swimlaneInProgressDurations = [],
  onFactSegmentHover,
  onSegmentEditCancel,
  onSegmentEditSave,
  onTogglePin,
}: SwimlaneProps) {
  const { t } = useI18n();
  const { sprintPlannerUi } = useRootStore();
  const isTeamLane = isTeamSwimlaneAssigneeId(developer.id);
  const canQuickAddOnLane = canQuickAddOnSwimlaneLane({
    isTeamLane,
    placementTool: sprintPlannerUi.placementTool,
  });
  const requestArrowRedraw = useContext(SwimlaneArrowRedrawContext) ?? (() => {});
  const availabilityUi = useSwimlaneAvailabilityUi({
    boardId,
    developer,
    sprintId: selectedSprintId,
  });
  const [quickAddHoverPreview, setQuickAddHoverPreview] =
    React.useState<SwimlaneQuickAddHoverPreview | null>(null);
  const [reservedTaskLayersPreview, setReservedTaskLayersPreview] = useState<number | null>(null);
  const [swimlaneCardFields] = useSwimlaneCardFieldsStorage();
  const storedReservedTaskLayers = useSwimlaneRowReservedLayersForAssignee(
    developer.id,
    selectedSprintId
  );

  const { setNodeRef } = useDroppable({
    id: `swimlane-${developer.id}`,
  });

  const isDark = useSwimlaneDocumentDarkClass();

  const quickAddLayout = resolveSwimlaneQuickAddLayoutState({
    canQuickAddOnLane,
    hoverPreview: quickAddHoverPreview,
    isDraggingTask,
    isLinking: linkingFromTaskId != null,
    noteComposer: sprintPlannerUi.noteComposer,
    placementTool: sprintPlannerUi.placementTool,
    tasks: tasksMap.values(),
  });
  const { hasQuickAddDraftMode, hideQuickAddPreview, quickAddFootprint } = quickAddLayout;

  const layout = useSwimlaneLayout({
    commentCardRowById,
    developerId: developer.id,
    draggingTaskId: isDraggingTask ? (activeTask?.id ?? null) : null,
    hoverMinTaskLayers: quickAddLayout.hoverMinTaskLayers,
    previewSpanLayers: quickAddLayout.previewSpanLayers,
    reservedTaskLayers: storedReservedTaskLayers,
    reservedTaskLayersPreview,
    sprintStartDate,
    sprintTimelineWorkingDays,
    taskPositions,
    tasksMap,
  });
  const rowReservedHeight = useSwimlaneRowReservedHeightControls({
    assigneeId: developer.id,
    contentMaxTaskLayers: layout.contentMaxTaskLayers,
    selectedSprintId,
    showParent: swimlaneCardFields.showParent,
    onPreviewLayersChange: setReservedTaskLayersPreview,
  });

  const quickAddBandLayout = useMemo(
    () =>
      resolveSwimlaneQuickAddBandLayout({
        contentHasTaskOverlaps: layout.hasTaskOverlaps,
        maxTaskLayers: layout.maxTaskLayers,
        oneCardHeightPx: resolveSwimlaneOneCardHeightPx(swimlaneCardFields.showParent),
        singleRowLayerHeight: layout.layerHeight,
      }),
    [layout.hasTaskOverlaps, layout.layerHeight, layout.maxTaskLayers, swimlaneCardFields.showParent]
  );

  const timelineTotalParts = sprintTimelineWorkingDays * getPartsPerDay();

  const sidebarEffectiveWidthPx = sidebarOpen ? sidebarWidth : 0;
  const timelineWidth = sprintPlannerSwimlaneTimelineWidthCss(
    viewMode,
    participantsColumnWidth,
    sidebarEffectiveWidthPx,
    sprintTimelineWorkingDays
  );

  const factExtra = resolveSwimlaneFactExtra(
    swimlaneFactTimelineEnabled,
    swimlaneInProgressDurations,
    sprintStartDate,
    timelineTotalParts
  );
  const { availabilitySegments, unavailableDayHatchKinds, unavailableDayTitles } = useMemo(
    () =>
      resolveSwimlaneAvailabilityTimeline({
        boardEvents: developerAvailability?.boardEvents,
        developerId: developer.id,
        sprintStartDate,
        sprintTimelineWorkingDays,
        titleForKind: (kind) => t(availabilityKindMessageKey(kind)),
      }),
    [developer.id, developerAvailability, sprintStartDate, sprintTimelineWorkingDays, t]
  );
  const {
    calendarBusyLaneVisible,
    laneLabels,
    mainAreaHeight,
    timelineOuterHeight,
  } = resolveSwimlaneSecondaryLaneLayout({
    calendarBusySegmentCount: calendarBusySegments.length,
    calendarBusyVisible,
    calendarLabel: t('sprintPlanner.swimlane.lanes.calendar'),
    factExtra,
    factLabel: t('sprintPlanner.swimlane.lanes.fact'),
    taskBandHeight: layout.totalHeight,
  });

  const swimlaneRowTaskIds = useMemo(
    () => new Set(layout.positionedTasks.map(({ task }) => task.id)),
    [layout.positionedTasks]
  );
  if (hideQuickAddPreview && quickAddHoverPreview != null) {
    setQuickAddHoverPreview(null);
  }

  useSwimlaneQuickAddHoverImagePaste({
    assigneeId: developer.id,
    cellIndex: quickAddHoverPreview?.cellIndex ?? null,
    enabled: Boolean(quickAddHoverPreview && !hideQuickAddPreview),
    noteClipboard: sprintPlannerUi.noteClipboard,
    onCommentCreate, onCreateTaskInCell,
  });

  return (
    <div
      className={buildSwimlaneRootClassName(Boolean(onCloseSidebar && !disableCloseSidebarOnClick))}
      onClick={createSwimlaneRootClickHandler(
        !disableCloseSidebarOnClick,
        onCloseSidebar
      )}
    >
      <div
        className="flex min-w-max"
        style={{
          minHeight: `${timelineOuterHeight}px`,
        }}
      >
        <SwimlaneDeveloperHeader
          developer={developer}
          isPinned={isPinned}
          isTeamLane={isTeamLane}
          laneLabels={laneLabels}
          layout={layout}
          participantsColumnWidth={participantsColumnWidth}
          rowResize={rowReservedHeight}
          rowResizeHandleTopPx={timelineOuterHeight}
          onTogglePin={onTogglePin}
        />

        {/* Timeline Grid */}
        <div
          ref={setNodeRef}
          className="flex relative bg-white dark:bg-gray-800"
          data-swimlane={developer.id}
          data-team-swimlane={isTeamLane ? 'true' : undefined}
          style={{
            width: timelineWidth,
            minWidth: viewMode === 'full' ? timelineWidth : undefined,
            minHeight: `${timelineOuterHeight}px`,
          }}
        >
          <SwimlaneRowReservedHeightControls
            isResizing={rowReservedHeight.isResizing}
            resizeHandleTopPx={timelineOuterHeight}
            taskBandHeightPx={layout.totalHeight}
            taskBandMeasureRef={rowReservedHeight.taskBandMeasureRef}
          />
          {/* Сетка таймлайна на всю высоту, включая lane календаря */}
          <TimelineGrid
            activeTask={activeTask}
            activeTaskDuration={activeTaskDuration}
            developerId={developer.id}
            hasTaskOverlaps={quickAddBandLayout.hasTaskOverlaps}
            holidayDayIndices={holidayDayIndices}
            hoveredCell={hoveredCell}
            isDraggingTask={isDraggingTask}
            isLinking={linkingFromTaskId != null}
            maxTaskLayers={layout.maxTaskLayers}
            occupiedLayersByCell={layout.occupiedLayersByCell}
            quickAddClipHeight={layout.totalHeight}
            quickAddFootprint={quickAddFootprint}
            sprintStartDate={sprintStartDate}
            sprintTimelineWorkingDays={sprintTimelineWorkingDays}
            taskAreaHeight={layout.taskBandVisualHeight}
            taskLayerHeight={quickAddBandLayout.layerHeight}
            totalHeight={timelineOuterHeight}
            unavailableDayHatchKinds={unavailableDayHatchKinds}
            unavailableDayTitles={unavailableDayTitles}
            onQuickAddHoverPreviewChange={setQuickAddHoverPreview}
            onQuickAddTask={buildSwimlanePlacementQuickAddHandler({
              canQuickAddOnLane,
              developerId: developer.id,
              hasQuickAddDraftMode,
              onCreateTaskInCell,
              onOpenAvailabilityForDate: availabilityUi.openCreateForDate,
              placementTool: sprintPlannerUi.placementTool,
              sprintStartDate,
              sprintTimelineWorkingDays,
            })}
          />

          {/* Зона карточек задач/комментов/факта */}
          <div
            className="absolute left-0 right-0 top-0 pointer-events-none"
            style={{ height: mainAreaHeight }}
          >
            {/* Task Bars (включая заметки comment:* как задачи свимлейна) */}
            <TaskLayer
              activeDraggableId={activeDraggableId}
              activeTask={activeTask}
              activeTaskDuration={activeTaskDuration}
              contextMenuBlurOtherCards={contextMenuBlurOtherCards}
              contextMenuTaskId={contextMenuTaskId}
              currentCell={layout.currentCell}
              developers={developers}
              errorReasons={errorReasons}
              errorTaskIds={errorTaskIds}
              factHoveredTaskId={factHoveredTaskId}
              globalNameFilter={globalNameFilter}
              hasQuickAddDraftMode={hasQuickAddDraftMode}
              hasTaskOverlaps={layout.hasTaskOverlaps}
              hoverConnectedTaskIds={hoverConnectedTaskIds}
              hoveredCell={hoveredCell}
              hoveredTaskId={hoveredTaskId}
              isDark={isDark}
              isDraggingTask={isDraggingTask}
              layerHeight={layout.layerHeight}
              linkSourceEndCell={linkSourceEndCell}
              linkingFromTaskId={linkingFromTaskId}
              positionedTasks={layout.positionedTasks}
              qaTasksMap={qaTasksMap}
              quickAddBoardId={quickAddBoardId}
              quickAddExcludedIssueKeys={quickAddExcludedIssueKeys}
              quickAddParentSelectOptions={quickAddParentSelectOptions}
              quickAddQueueOptions={quickAddQueueOptions}
              quickAddSubmittingTaskId={quickAddSubmittingTaskId}
              requestArrowRedraw={requestArrowRedraw}
              segmentEditTaskId={segmentEditTaskId}
              selectedSprintId={selectedSprintId}
              selectedTaskId={selectedTaskId}
              sprintStartDate={sprintStartDate}
              sprintTimelineWorkingDays={sprintTimelineWorkingDays}
              stickyNoteCardRowById={layout.stickyNoteCardRowById}
              taskBandTotalHeight={layout.taskBandTotalHeight}
              taskLayerMap={layout.taskLayerMap}
              taskLinks={taskLinks}
              taskPositions={taskPositions}
              timelineTotalParts={timelineTotalParts}
              totalHeight={layout.totalHeight}
              onCancelQuickAddDraft={onCancelQuickAddDraft}
              onCommentApprove={onCommentApprove}
              onCommentCardRowLayoutUpdate={onCommentCardRowLayoutUpdate}
              onCommentDelete={onCommentDelete}
              onCommentUpdate={onCommentUpdate}
              onContextMenu={onContextMenu}
              onCreateQATask={onCreateQATask}
              onPasteQuickAddNote={onPasteQuickAddNote}
              onQuickAddDraftAssigneeChange={onQuickAddDraftAssigneeChange}
              onQuickAddDraftCommentColorChange={onQuickAddDraftCommentColorChange}
              onQuickAddDraftImageUrlChange={onQuickAddDraftImageUrlChange}
              onQuickAddDraftKindChange={onQuickAddDraftKindChange}
              onQuickAddDraftParentChange={onQuickAddDraftParentChange}
              onQuickAddDraftQueueChange={onQuickAddDraftQueueChange}
              onQuickAddDraftTitleChange={onQuickAddDraftTitleChange}
              onQuickAddDraftTypeChange={onQuickAddDraftTypeChange}
              onSegmentEditCancel={onSegmentEditCancel}
              onSegmentEditSave={onSegmentEditSave}
              onSelectExistingQuickAddDraft={onSelectExistingQuickAddDraft}
              onSubmitQuickAddCommentDraft={onSubmitQuickAddCommentDraft}
              onSubmitQuickAddDiagramDraft={onSubmitQuickAddDiagramDraft}
              onSubmitQuickAddDraft={onSubmitQuickAddDraft}
              onSubmitQuickAddImageDraft={onSubmitQuickAddImageDraft}
              onTaskClick={onTaskClick}
              onTaskHover={onTaskHover}
              onTaskResize={onTaskResize}
            />
            {quickAddHoverPreview && !hideQuickAddPreview ? (
              <SwimlaneQuickAddPreview
                clipHeight={layout.totalHeight}
                hasTaskOverlaps={quickAddBandLayout.hasTaskOverlaps}
                layerHeight={quickAddBandLayout.layerHeight}
                preview={quickAddHoverPreview}
                taskAreaHeight={layout.taskBandVisualHeight}
                timelineTotalParts={timelineTotalParts}
                {...resolveSwimlaneQuickAddPreviewToolProps(
                  sprintPlannerUi.placementTool,
                  sprintPlannerUi.stickyNoteColor
                )}
              />
            ) : null}
            {swimlaneFactTimelineEnabled && (
              <SwimlaneInProgressFactLayer
                assigneeRole={developer.role}
                changelogsByTaskId={
                  swimlaneFactChangelogsByTaskId ?? EMPTY_SWIMLANE_FACT_CHANGELOGS
                }
                commentsByTaskId={swimlaneFactCommentsByTaskId ?? EMPTY_SWIMLANE_FACT_COMMENTS}
                developerMap={swimlaneFactDeveloperMap ?? EMPTY_SWIMLANE_FACT_DEVELOPERS}
                factHoveredTaskId={factHoveredTaskId}
                layerId={`swimlane-fact-${developer.id}`}
                requestArrowRedraw={requestArrowRedraw}
                segments={swimlaneInProgressDurations}
                sprintStartDate={sprintStartDate}
                swimlaneRowTaskIds={swimlaneRowTaskIds}
                tasksMap={tasksMap}
                totalParts={timelineTotalParts}
                onFactSegmentHover={onFactSegmentHover}
              />
            )}
          </div>

          <SwimlaneCalendarBusyLane
            calendarBusySegments={calendarBusySegments}
            laneTopPx={mainAreaHeight}
            totalParts={timelineTotalParts}
            visible={calendarBusyLaneVisible}
          />

          <SwimlaneAvailabilityChips
            dayCount={sprintTimelineWorkingDays}
            mainAreaHeight={mainAreaHeight}
            segments={availabilitySegments}
            onChipClick={(eventId) => {
              const event = developerAvailability?.boardEvents.find((item) => item.id === eventId);
              if (event) {
                availabilityUi.openUpsertForEvent(event);
              }
            }}
          />

        </div>
      </div>
      <SwimlaneAvailabilityModalGate
        upsertModal={availabilityUi.ui}
        onClose={availabilityUi.close}
      />
    </div>
  );
}

// observer внутри memo: MobX пересчитывает layout при span sticky-note; сравнение пропсов снаружи.
export const Swimlane = React.memo(observer(SwimlaneComponent), memoizedSwimlanePropsEqual);

Swimlane.displayName = 'Swimlane';

