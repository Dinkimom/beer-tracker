
import type { useSprintPlannerViewModel } from './hooks/useSprintPlannerViewModel';

import { useLayoutEffect, useState } from 'react';

import { ZIndex } from '@/constants';
import { StickyNoteReactionsProvider } from '@/features/comments/StickyNoteReactionsProvider';
import { isSwimlaneCommentTask, selectPendingAgentProposalNotes } from '@/features/comments/utils/swimlaneCommentTaskBridge';
import { FLOATING_TOOLBAR_GLASS } from '@/features/context-menu/contextMenuClasses';
import { DAYS_HEADER_ROW_HEIGHT_PX } from '@/features/sprint/components/DaysHeader';
import { AssigneeVelocityProvider } from '@/features/swimlane/hooks/useAssigneeVelocity';
import { useCloseOverdueAndCreateNext } from '@/features/swimlane/hooks/useCloseOverdueAndCreateNext';
import { FeatureDraftRowNamesProvider } from '@/features/task/components/TaskCard/FeatureDraftRowNamesContext';
import { SprintCardPresenceProvider } from '@/features/task/components/TaskCard/SprintCardPresenceContext';
import { parseStickyNoteColor } from '@/lib/comments/stickyNoteColor';

import { SprintPlannerBoardViews } from './board';
import { ModalsSection } from './components/ModalsSection';
import { SidebarSection } from './components/SidebarSection';
import { SprintPlannerControlsBar } from './components/SprintPlannerControlsBar';
import { SprintPlannerPresenceSync } from './components/SprintPlannerPresenceSync';
import { SwimlanePlacementToolbar } from './components/SwimlanePlacementToolbar';
import { PlannerMobxSessionBridge } from './mobx/PlannerMobxSessionBridge';
import { PlannerOnboardingHost } from './onboarding/PlannerOnboardingHost';
import { PlannerChromeSlotProvider } from './plannerChromeSlot';
import { SprintPlannerAssigneePickerLayer } from './SprintPlannerAssigneePickerLayer';
import { SprintPlannerDndShell } from './SprintPlannerDndShell';
import { SprintPlannerDragStoresProvider } from './SprintPlannerDragStoresProvider';

export type SprintPlannerViewProps = ReturnType<typeof useSprintPlannerViewModel>;

export function SprintPlannerView({
  activeTask,
  allTasksForDrag,
  allTasksForDragWithComments,
  assigneePicker,
  assigneePointsStats,
  availability,
  boardAvailabilityEvents,
  backlogTaskRef,
  boardIdForPlannerData,
  boardViewers,
  checklistDone,
  checklistTotal,
  comments,
  commentsVisible,
  contextMenuBlurOtherCards,
  deliveryChecklistItems,
  deliveryGoalsLoading,
  developers,
  developersManagement,
  discoveryChecklistItems,
  discoveryGoalsLoading,
  dragAndDrop,
  dragContextRef,
  filteredTaskLinks,
  filteredTaskPositions,
  getQueueByBoardId,
  goalTaskIds,
  goalsLoading,
  handleAddLink,
  handleAssigneeSelect,
  handleCancelQuickAddDraft,
  handleContextMenuAssigneeSelect,
  handleCommentCreateWithFocus,
  handleCreateTaskInSwimlaneCell,
  handleOccupancyPositionSave,
  handlePasteQuickAddNote,
  handleQuickAddDraftAssigneeChange,
  handleQuickAddDraftCommentColorChange,
  handleQuickAddDraftImageUrlChange,
  handleQuickAddDraftKindChange,
  handleQuickAddDraftQueueChange,
  handleQuickAddDraftTitleChange,
  handleQuickAddDraftTypeChange,
  handleQuickAddDraftParentChange,
  handleRemoveParticipantFromTeam,
  handleSegmentEditSave,
  handleSelectExistingQuickAddDraft,
  handleSplitPhaseIntoSegments,
  handleSubmitQuickAddCommentDraft,
  handleSubmitQuickAddDiagramDraft,
  handleSubmitQuickAddDraft,
  handleSubmitQuickAddImageDraft,
  handleUpdateEstimate,
  handlers,
  isDragFromSidebar,
  kanbanGroupBy,
  linksDimOnHover,
  movePlacement,
  onGoalsUpdate,
  onSprintChange,
  onTasksReload,
  participantsColumnWidth,
  positionHistory,
  qaTasksMap,
  featureDraftRowNamesById,
  quickAddExcludedIssueKeys,
  quickAddParentSelectOptions,
  quickAddQueueOptions,
  quickAddSubmittingTaskId,
  scrollContainerRef,
  selectedAssigneeIds,
  selectedSprintId,
  setAssigneePicker,
  setIsDragFromSidebar,
  setParticipantsColumnWidth,
  setSelectedAssigneeIds,
  setSidebarWidth,
  setTasks,
  setViewMode,
  sidebarOpen,
  sidebarWidth,
  sprintInfo,
  sprintStartDate,
  sprintTimelineWorkingDays,
  sprints,
  sprintsLoading,
  swimlaneFactTimelineEnabled,
  swimlaneCalendarBusyEnabled,
  swimlaneImagesVisible,
  swimlaneLinksVisible,
  swimlaneNotesVisible,
  swimlaneTaskChangelogsMap,
  swimlaneTaskDurationsMap,
  swimlaneTaskIssueCommentsMap,
  swimlaneTaskLinks,
  taskPositions,
  tasks,
  tasksByAssignee,
  tasksLoading,
  tasksMap,
  tasksReloading,
  unassignedTasks,
  viewMode,
  DialogComponent,
}: SprintPlannerViewProps) {
  const [boardFrameEl, setBoardFrameEl] = useState<HTMLDivElement | null>(null);
  const [controlsEl, setControlsEl] = useState<HTMLDivElement | null>(null);
  const [daysSlotEl, setDaysSlotEl] = useState<HTMLDivElement | null>(null);
  const daysChrome =
    viewMode === 'compact' || viewMode === 'full' || viewMode === 'features';

  useLayoutEffect(() => {
    const frame = boardFrameEl;
    const bar = controlsEl;
    if (!frame || !bar) return undefined;
    const apply = () => {
      frame.style.setProperty('--planner-controls-h', `${bar.offsetHeight}px`);
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(bar);
    return () => observer.disconnect();
  }, [boardFrameEl, controlsEl]);
  const onOverdueCloseAndCreate = useCloseOverdueAndCreateNext({
    boardId: boardIdForPlannerData ?? null,
    getQueueByBoardId,
    onStatusChange: handlers.handleStatusChange,
    savePosition: handleOccupancyPositionSave,
    selectedSprintId,
    setTasks,
  });

  return (
    <AssigneeVelocityProvider selectedSprintId={selectedSprintId} sprints={sprints}>
    <PlannerChromeSlotProvider slot={daysSlotEl}>
    <StickyNoteReactionsProvider comments={comments} sprintId={selectedSprintId} onPaintNoteColor={handlers.handlePaintNoteColorFromReaction}>
      <PlannerMobxSessionBridge />
      <SprintPlannerDndShell
        activeTask={activeTask}
        activeTaskDuration={dragAndDrop.activeTaskDuration}
        developers={developers}
        developersManagement={developersManagement}
        dragAndDrop={dragAndDrop}
        dragContextRef={dragContextRef}
        isDragFromSidebar={isDragFromSidebar}
        scrollContainerRef={scrollContainerRef}
        setIsDragFromSidebar={setIsDragFromSidebar}
        sidebarOpen={sidebarOpen}
        sidebarWidth={sidebarWidth}
        sprintTimelineWorkingDays={sprintTimelineWorkingDays}
        viewMode={viewMode}
      >
        <SprintPlannerDragStoresProvider hoverStore={dragAndDrop.hoverStore} sidebarDropPointerStore={dragAndDrop.sidebarDropPointerStore}>
        <SprintCardPresenceProvider viewers={boardViewers}>
        <FeatureDraftRowNamesProvider names={featureDraftRowNamesById}>
        <SprintPlannerPresenceSync
          dragDuration={dragAndDrop.activeTaskDuration ?? null}
          dragNoteColor={
            activeTask && isSwimlaneCommentTask(activeTask)
              ? parseStickyNoteColor(activeTask.stickyNoteColor)
              : null
          }
          dragNoteText={
            activeTask && isSwimlaneCommentTask(activeTask) ? (activeTask.name ?? '') : null
          }
          draggingTaskId={dragAndDrop.isDraggingTask ? dragAndDrop.activeTaskId : null}
          sprintId={selectedSprintId}
          viewMode={viewMode}
        />
        <PlannerOnboardingHost
          scrollContainerRef={scrollContainerRef}
          selectedSprintId={selectedSprintId}
          setViewMode={setViewMode}
          tasksLoading={tasksLoading}
          viewMode={viewMode}
        >
        <div className="relative flex h-full min-h-0 w-full flex-1 gap-3 overflow-hidden">
          <div
            ref={setBoardFrameEl}
            className="planner-board-frame relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-ds-surface-header"
          >
          <div
            className="absolute inset-0 flex min-h-0 flex-col overflow-hidden"
            style={{ zIndex: ZIndex.base }}
          >
              <SprintPlannerBoardViews
                kanban={{
                  boardId: boardIdForPlannerData ?? null,
                  contextMenuBlurOtherCards,
                  developers,
                  groupBy: kanbanGroupBy,
                  selectedAssigneeIds,
                  tasks: allTasksForDrag,
                  onContextMenu: handlers.handleContextMenu,
                  onStatusChange: handlers.handleStatusChange, onTaskClick: handlers.handleTaskClick,
                }}
                swimlanes={{
                  allTasksForDrag: allTasksForDragWithComments ?? allTasksForDrag,
                  boardAvailabilityEvents,
                  boardId: boardIdForPlannerData ?? null,
                  comments,
                  commentsVisible,
                  contextMenuBlurOtherCards,
                  developers,
                  developersManagement,
                  dragAndDrop,
                  filteredTaskLinks: swimlaneTaskLinks ?? filteredTaskLinks,
                  linksDimOnHover,
                  participantsColumnWidth,
                  qaTasksMap,
                  removeParticipantFromTeam: handleRemoveParticipantFromTeam,
                  scrollContainerRef,
                  selectedSprintId,
                  setTasks,
                  showLinks: swimlaneLinksVisible,
                  sidebarOpen,
                  sprintStartDate,
                  sprintTimelineWorkingDays,
                  swimlaneCalendarBusyEnabled,
                  swimlaneFactTimelineEnabled,
                  swimlaneImagesVisible,
                  swimlaneNotesVisible,
                  taskChangelogsByTaskId: swimlaneTaskChangelogsMap,
                  taskDurationsByTaskId: swimlaneTaskDurationsMap,
                  taskIssueCommentsByTaskId: swimlaneTaskIssueCommentsMap,
                  taskPositions,
                  tasksByAssignee,
                  tasksMap,
                  onMoveToSprint: handlers.handleMoveToSprint,
                  onRemoveFromSprint: handlers.handleRemoveFromSprint,
                  sprints,
                  onCloseSidebar: handlers.handleCloseSidebar,
                  onCommentCreate: handleCommentCreateWithFocus,
                  onCommentCardRowLayoutUpdate: handlers.handleCommentCardRowLayoutUpdate,
                  onCommentApprove: handlers.handleCommentApprove,
                  onCommentDelete: handlers.handleCommentDelete,
                  onCommentsLeftSprint: handlers.handleCommentsLeftSprint,
                  onCommentParentChange: handlers.handleCommentParentChange,
                  onCommentUpdate: handlers.handleCommentUpdate,
                  onContextMenu: handlers.handleContextMenu,
                  onCreateQATask: handlers.handleCreateQATask,
                  onOverdueCloseAndCreate,
                  onCreateTaskInCell: handleCreateTaskInSwimlaneCell,
                  onCancelQuickAddDraft: handleCancelQuickAddDraft,
                  quickAddBoardId: boardIdForPlannerData,
                  quickAddExcludedIssueKeys,
                  quickAddParentSelectOptions,
                  quickAddQueueOptions,
                  quickAddSubmittingTaskId,
                  onPasteQuickAddNote: handlePasteQuickAddNote,
                  onQuickAddDraftAssigneeChange: handleQuickAddDraftAssigneeChange,
                  onQuickAddDraftCommentColorChange: handleQuickAddDraftCommentColorChange,
                  onQuickAddDraftImageUrlChange: handleQuickAddDraftImageUrlChange,
                  onQuickAddDraftKindChange: handleQuickAddDraftKindChange,
                  onQuickAddDraftParentChange: handleQuickAddDraftParentChange,
                  onQuickAddDraftQueueChange: handleQuickAddDraftQueueChange,
                  onQuickAddDraftTypeChange: handleQuickAddDraftTypeChange,
                  onQuickAddDraftTitleChange: handleQuickAddDraftTitleChange,
                  onSubmitQuickAddCommentDraft: handleSubmitQuickAddCommentDraft,
                  onSubmitQuickAddDiagramDraft: handleSubmitQuickAddDiagramDraft,
                  onSubmitQuickAddImageDraft: handleSubmitQuickAddImageDraft,
                  onSubmitQuickAddDraft: handleSubmitQuickAddDraft,
                  onSelectExistingQuickAddDraft: handleSelectExistingQuickAddDraft,
                  onDeleteLink: handlers.handleDeleteLink,
                  onParticipantsColumnWidthChange: setParticipantsColumnWidth,
                  onSegmentEditSave: handleSegmentEditSave,
                  onAddLink: handleAddLink,
                  onTaskClick: handlers.handleTaskClick,
                  onTaskResize: handlers.handleTaskResize,
                }}
                viewMode={viewMode}
              />
              {viewMode === 'compact' || viewMode === 'full' || viewMode === 'features' ? (
                <SwimlanePlacementToolbar
                  movePlacement={movePlacement.toolbar}
                  pendingAgentNotes={selectPendingAgentProposalNotes(comments)}
                  sprintId={selectedSprintId}
                  variant={viewMode === 'features' ? 'features' : 'people'}
                  onApproveAgentNotes={handlers.handleCommentApproveAll}
                  onRejectAgentNotes={handlers.handleCommentRejectAll}
                />
              ) : null}
          </div>
          <div
            ref={setControlsEl}
            className={`absolute inset-x-0 top-0 ${FLOATING_TOOLBAR_GLASS}`}
            style={{ zIndex: ZIndex.plannerControls }}
          >
            <SprintPlannerControlsBar
              assigneeFilterTasks={allTasksForDrag}
              boardId={boardIdForPlannerData ?? null}
              boardViewers={boardViewers}
              developers={developers}
              planHistory={positionHistory}
              selectedAssigneeIds={selectedAssigneeIds}
              selectedSprintId={selectedSprintId}
              setSelectedAssigneeIds={setSelectedAssigneeIds}
              setViewMode={setViewMode}
              sidebarOpen={sidebarOpen}
              sprints={sprints}
              sprintsLoading={sprintsLoading}
              tasksLoading={tasksLoading}
              tasksReloading={tasksReloading}
              viewMode={viewMode}
              onOpenSidebar={handlers.handleToggleSidebar}
              onSprintChange={onSprintChange}
              onTasksReload={onTasksReload}
            />
            <div
              ref={setDaysSlotEl}
              style={daysChrome ? { minHeight: DAYS_HEADER_ROW_HEIGHT_PX } : undefined}
            />
          </div>
          </div>

            <SidebarSection
              activeTaskDuration={dragAndDrop.activeTaskDuration}
              activeTaskId={dragAndDrop.activeTaskId}
              allSprintTasks={tasks}
              backlogTaskRef={backlogTaskRef}
              checklistDone={checklistDone}
              checklistTotal={checklistTotal}
              closedHandleHost={boardFrameEl}
              contextMenuBlurOtherCards={contextMenuBlurOtherCards}
              deliveryChecklistItems={deliveryChecklistItems}
              deliveryGoalsLoading={deliveryGoalsLoading}
              developers={developers}
              developersManagement={developersManagement}
              discoveryChecklistItems={discoveryChecklistItems}
              discoveryGoalsLoading={discoveryGoalsLoading}
              goalTaskIds={goalTaskIds}
              goalsLoading={goalsLoading}
              isSidebarDropTarget={dragAndDrop.isSidebarDropTarget}
              qaTasksMap={qaTasksMap}
              selectedBoardId={boardIdForPlannerData}
              selectedSprintId={selectedSprintId}
              sidebarOpen={sidebarOpen}
              sidebarWidth={sidebarWidth}
              sprintInfo={sprintInfo}
              sprints={sprints}
              taskPositions={filteredTaskPositions}
              unassignedTasks={unassignedTasks}
              viewMode={viewMode}
              onAutoAddToSwimlane={handlers.handleAutoAddToSwimlane}
              onAutoAssignTasks={handlers.handleAutoAssignTasks}
              onContextMenu={handlers.handleContextMenu}
              onGoalsUpdate={onGoalsUpdate}
              onPlanAssignees={handlers.handlePlanAssignees}
              onReturnAllTasks={handlers.handleReturnAllTasks}
              onSprintTaskUpserted={(task) => {
                setTasks((prev) => [
                  ...prev.filter((existing) => existing.id !== task.id),
                  task,
                ]);
              }}
              onTasksReload={onTasksReload}
              onToggle={handlers.handleToggleSidebar}
              onWidthChange={setSidebarWidth}
            />
        </div>
        </PlannerOnboardingHost>
        </FeatureDraftRowNamesProvider>
        </SprintCardPresenceProvider>
        </SprintPlannerDragStoresProvider>
      </SprintPlannerDndShell>
      <ModalsSection
        DialogComponent={DialogComponent}
        assigneeOptions={{
          assigneePointsStats,
          availability,
          developers,
          sprintStartDate,
        }}
        boardId={boardIdForPlannerData}
        comments={comments}
        movePlacement={movePlacement}
        selectedSprintId={selectedSprintId}
        showStartLinking={
          (viewMode === 'full' || viewMode === 'compact' || viewMode === 'features') &&
          swimlaneLinksVisible
        }
        sprintTasks={tasks}
        sprints={sprints}
        taskPositions={filteredTaskPositions}
        tasksMap={tasksMap}
        transitionModal={handlers.transitionModal}
        viewMode={viewMode}
        onAccountWork={handlers.handleAccountWork}
        onAssigneeSelect={handleContextMenuAssigneeSelect}
        onCloseTransitionModal={handlers.closeTransitionModal}
        onCommentApprove={handlers.handleCommentApprove}
        onCommentDelete={handlers.handleCommentDelete}
        onCommentParentChange={handlers.handleCommentParentChange}
        onCommentUpdate={handlers.handleCommentUpdate}
        onMoveToSprint={handlers.handleMoveToSprint}
        onParentChange={handlers.handleParentChange}
        onRemoveFromPlan={handlers.handleRemoveFromPlan}
        onRemoveFromSprint={handlers.handleRemoveFromSprint}
        onSplitPhaseIntoSegments={handleSplitPhaseIntoSegments}
        onStatusChange={handlers.handleStatusChange}
        onTaskInfoFieldsSaved={handlers.handleTaskInfoFieldsSaved}
        onTransitionSubmit={handlers.handleTransitionSubmit}
        onUpdateEstimate={handleUpdateEstimate}
      />
      {assigneePicker && (
        <SprintPlannerAssigneePickerLayer
          assigneePicker={assigneePicker}
          assigneePointsStats={assigneePointsStats}
          availability={availability}
          developers={developers}
          sprintStartDate={sprintStartDate}
          onAssigneeSelect={handleAssigneeSelect}
          onClose={() => setAssigneePicker(null)}
        />
      )}
    </StickyNoteReactionsProvider>
    </PlannerChromeSlotProvider>
    </AssigneeVelocityProvider>
  );
}
