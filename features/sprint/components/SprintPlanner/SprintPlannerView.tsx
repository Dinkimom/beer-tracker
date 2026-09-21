
import type { useSprintPlannerViewModel } from './hooks/useSprintPlannerViewModel';

import { ZIndex } from '@/constants';
import { StickyNoteReactionsProvider } from '@/features/comments/StickyNoteReactionsProvider';
import { isSwimlaneCommentTask } from '@/features/comments/utils/swimlaneCommentTaskBridge';
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
import { SprintPlannerAssigneePickerLayer } from './SprintPlannerAssigneePickerLayer';
import { SprintPlannerDndShell } from './SprintPlannerDndShell';

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
  factVisible,
  filteredTaskLinks,
  filteredTaskPositions,
  gitlabFactByLink,
  goalTaskIds,
  goalsLoading,
  handleAddLink,
  handleAssigneeSelect,
  handleCancelQuickAddDraft,
  handleContextMenuAssigneeSelect,
  handleCommentCreateWithFocus,
  handleCreateTaskInSwimlaneCell,
  handleOccupancyPositionSave,
  handleOpenAssigneePicker,
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
  minStoryPointsForAssignee,
  minTestPointsForAssignee,
  occupancyOldTmLayout,
  occupancyRowFields,
  occupancyStatusFilter,
  occupancyTasksLoading,
  occupancyTimelineScale,
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
  setOccupancyStatusFilter,
  setParticipantsColumnWidth,
  setSelectedAssigneeIds,
  setSidebarWidth,
  setTaskOrder,
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
  taskOrder,
  taskPositions,
  tasks,
  tasksByAssignee,
  tasksForOccupancy,
  tasksLoading,
  tasksMap,
  tasksReloading,
  timelineSettings,
  unassignedTasks,
  viewMode,
  DialogComponent,
}: SprintPlannerViewProps) {
  return (
    <StickyNoteReactionsProvider comments={comments} sprintId={selectedSprintId}>
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
        <SprintCardPresenceProvider viewers={boardViewers}>
        <FeatureDraftRowNamesProvider names={featureDraftRowNamesById}>
        <SprintPlannerPresenceSync
          dragAssigneeId={dragAndDrop.hoveredCell?.assigneeId ?? null}
          dragDay={dragAndDrop.hoveredCell?.day ?? null}
          dragDuration={dragAndDrop.activeTaskDuration ?? null}
          dragNoteColor={
            activeTask && isSwimlaneCommentTask(activeTask)
              ? parseStickyNoteColor(activeTask.stickyNoteColor)
              : null
          }
          dragNoteText={
            activeTask && isSwimlaneCommentTask(activeTask) ? (activeTask.name ?? '') : null
          }
          dragPart={dragAndDrop.hoveredCell?.part ?? null}
          draggingTaskId={dragAndDrop.isDraggingTask ? dragAndDrop.activeTaskId : null}
          sprintId={selectedSprintId}
          viewMode={viewMode}
        />
        <div
          className="relative flex flex-col bg-gray-50 dark:bg-gray-900 flex-1 min-h-0 overflow-hidden"
          style={{
            width: '100%',
            height: '100%',
          }}
        >
          <SprintPlannerControlsBar
            boardId={boardIdForPlannerData ?? null}
            boardViewers={boardViewers}
            developers={developers}
            occupancyStatusFilter={occupancyStatusFilter}
            planHistory={positionHistory}
            selectedAssigneeIds={selectedAssigneeIds}
            selectedSprintId={selectedSprintId}
            setOccupancyStatusFilter={setOccupancyStatusFilter}
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
          {/* Контейнер с шапкой/свимлейнами или режимом занятости */}
          <div className="flex flex-1 overflow-hidden min-h-0 relative" style={{ zIndex: ZIndex.base }}>
            <div className="flex flex-col flex-1 min-w-0 overflow-hidden relative">
              <SprintPlannerBoardViews
                kanban={{
                  boardId: boardIdForPlannerData ?? null,
                  contextMenuBlurOtherCards,
                  developers,
                  groupBy: kanbanGroupBy,
                  tasks: allTasksForDrag,
                  onContextMenu: handlers.handleContextMenu,
                  onStatusChange: handlers.handleStatusChange,
                  onTaskClick: handlers.handleTaskClick,
                }}
                occupancy={{
                  availability,
                  contextMenuBlurOtherCards,
                  deliveryChecklistItems,
                  developers,
                  discoveryChecklistItems,
                  factVisible,
                  gitlabFactByLink,
                  linksDimOnHover,
                  occupancyCallbacks: {
                    onAddLink: handleAddLink,
                    onContextMenu: handlers.handleContextMenu,
                    onDeleteLink: handlers.handleDeleteLink,
                    onOpenAssigneePicker: handleOpenAssigneePicker,
                    onPositionSave: handleOccupancyPositionSave,
                    onSegmentEditSave: handleSegmentEditSave,
                    onTaskClick: handlers.handleTaskClick,
                    onTaskOrderChange: (order) => setTaskOrder(() => order),
                  },
                  occupancyLayout: {
                    legacyCompactLayout: occupancyOldTmLayout,
                    plannerSidebarOpen: sidebarOpen,
                    plannerSidebarWidth: sidebarWidth,
                    rowFieldsVisibility: occupancyRowFields,
                    timelineScale: occupancyTimelineScale,
                  },
                  selectedAssigneeIds,
                  sprintStartDate,
                  sprintWorkingDaysCount: sprintTimelineWorkingDays,
                  swimlaneLinksVisible,
                  taskLinks: filteredTaskLinks,
                  taskOrder,
                  taskPositions: filteredTaskPositions,
                  tasks: tasksForOccupancy,
                  timelineSettings,
                  usePlannerUiStore: true,
                }}
                occupancyStatusFilter={occupancyStatusFilter}
                occupancyTasksLoading={occupancyTasksLoading}
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
                  sidebarWidth,
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
                  onCommentDelete: handlers.handleCommentDelete,
                  onCommentsLeftSprint: handlers.handleCommentsLeftSprint,
                  onCommentParentChange: handlers.handleCommentParentChange,
                  onCommentUpdate: handlers.handleCommentUpdate,
                  onContextMenu: handlers.handleContextMenu,
                  onCreateQATask: handlers.handleCreateQATask,
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
                <SwimlanePlacementToolbar variant={viewMode === 'features' ? 'features' : 'people'} />
              ) : null}
            </div>

            <SidebarSection
              activeTaskDuration={dragAndDrop.activeTaskDuration}
              activeTaskId={dragAndDrop.activeTaskId}
              allSprintTasks={tasks}
              backlogTaskRef={backlogTaskRef}
              checklistDone={checklistDone}
              checklistTotal={checklistTotal}
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
              sidebarDropPointerY={dragAndDrop.sidebarDropPointerY}
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
        </div>
        </FeatureDraftRowNamesProvider>
        </SprintCardPresenceProvider>
      </SprintPlannerDndShell>
      <ModalsSection
        DialogComponent={DialogComponent}
        assigneeOptions={{
          assigneePointsStats,
          availability,
          developers,
          minStoryPointsForAssignee,
          minTestPointsForAssignee,
          sprintStartDate,
        }}
        boardId={boardIdForPlannerData}
        comments={comments}
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
          minStoryPointsForAssignee={minStoryPointsForAssignee}
          minTestPointsForAssignee={minTestPointsForAssignee}
          sprintStartDate={sprintStartDate}
          onAssigneeSelect={handleAssigneeSelect}
          onClose={() => setAssigneePicker(null)}
        />
      )}
    </StickyNoteReactionsProvider>
  );
}
