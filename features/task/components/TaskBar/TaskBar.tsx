'use client';

import type { TaskResizeParams } from '@/features/task/hooks/useTaskResize';
import type { StickyNoteCardRowLayout } from '@/features/task/utils/stickyNoteCardRowResizeHelpers';
import type { StickyNoteColor } from '@/lib/comments/stickyNoteColor';
import type { Task, Developer, TaskPosition } from '@/types';

import { observer } from 'mobx-react-lite';
import React, { useRef, useState } from 'react';

import { WORKING_DAYS, getPartsPerDay } from '@/constants';
import { isSwimlaneDiagramTask, parseSwimlaneCommentTaskId } from '@/features/comments/utils/swimlaneCommentTaskBridge';
import { isQuickAddChooserDraft } from '@/features/task/components/TaskCard/components/taskCardContentHelpers';
import { DiagramNameEditContext } from '@/features/task/components/TaskCard/components/TaskCardSwimlaneDiagramCaption';
import { isSwimlaneImageTask } from '@/features/task/utils/swimlaneImageTask';
import { useRootStore } from '@/lib/layers';

import { SwimlaneQuickAddMenu, type SwimlaneQuickAddMenuProps } from './components/SwimlaneQuickAddMenu';
import { resolveResizeHandleCornerStyle } from './components/taskBarResizeHandleHelpers';
import {
  getTaskBarRootClassName,
  resolveDiagramNameChangeHandler,
  resolveTaskBarAnnotationChrome,
  resolveTaskBarCardClick,
} from './taskBarAnnotationChrome';
import { TaskBarAnnotationOverlays } from './TaskBarAnnotationOverlays';
import { TaskBarDraftSaveButton } from './TaskBarDraftSaveButton';
import { TaskBarDragSourceGhost } from './TaskBarDragSourceGhost';
import { shouldCancelInlineEditorOnFocusOut } from './taskBarHelpers';
import { TaskBarOpacityLayer } from './TaskBarOpacityLayer';
import { TaskBarPendingApprovalToolbar } from './TaskBarPendingApprovalToolbar';
import { useTaskBarDisplayState } from './useTaskBarDisplayState';
import { useTaskBarLifecycle } from './useTaskBarLifecycle';
import { useTaskBarPhotoCardInteractions } from './useTaskBarPhotoCardInteractions';

interface TaskBarProps {
  assigneeName?: string;
  contextMenuBlurOtherCards?: boolean;
  contextMenuTaskId?: string | null;
  developers?: Developer[];
  /** Отключить drag/resize, но оставить клики (режим связей). */
  disableDragAndResize?: boolean;
  disableResize?: boolean;
  draggableId?: string;
  duration: number;
  errorTooltip?: string;
  globalNameFilter?: string;
  htmlAnchorId?: string;
  inlineTitleEditor?: {
    color?: StickyNoteColor;
    placeholder?: string;
    showDisabledSave?: boolean;
    value: string;
    onCancel?: () => void;
    onChange: (value: string) => void;
    onColorChange?: (color: StickyNoteColor) => void;
    onSubmit?: () => void;
  };
  interactionDisabled?: boolean;
  isInError?: boolean;
  isSelected?: boolean;
  leftPercent: number;
  /** Обводка в режиме создания связи. */
  linkMode?: 'source' | 'target' | null;
  qaTasksMap?: Map<string, Task>;
  quickAddMenu?: Omit<SwimlaneQuickAddMenuProps, 'anchorId' | 'isSubmitting' | 'title'> & {
    title: string;
  };
  quickAddSubmitting?: boolean;
  selectedSprintId?: number | null;
  selectedTaskId?: string | null;
  stickyNoteCardRowResize?: {
    assignedTaskLayer: number;
    committedCardRowLayout?: StickyNoteCardRowLayout;
    hasTaskOverlaps: boolean;
    layerHeight: number;
    onLayoutCommit?: (layout: StickyNoteCardRowLayout) => void;
    taskBandTotalHeight: number;
  };
  style?: React.CSSProperties;
  swimlaneBarDurationParts?: number;
  swimlaneDragActive?: boolean;
  swimlaneSegmentBadge?: { index: number; total: number } | null;
  swimlaneSegmentSecondary?: boolean;
  swimlaneTimelineTotalParts?: number;
  task: Task;
  taskPositions?: Map<string, TaskPosition>;
  widthPercent: number;
  onClick?: (taskId: string) => void;
  onCommentApprove?: (commentId: string) => void;
  onCommentDelete?: (commentId: string) => void;
  onCommentUpdate?: (commentId: string, text: string) => void;
  onContextMenu?: (e: React.MouseEvent, task: Task) => void;
  onCreateQATask?: (taskId: string, anchorRect?: DOMRect) => void;
  onDeleteLocalImage?: (taskId: string) => void;
  onResize: (params: TaskResizeParams) => void;
  onTaskHover?: (taskId: string | null) => void;
  requestArrowRedraw: () => void;
}

export const TaskBar = observer(function TaskBar({
  task,
  inlineTitleEditor,
  quickAddMenu,
  quickAddSubmitting = false,
  leftPercent,
  widthPercent,
  duration,
  errorTooltip,
  globalNameFilter,
  isInError = false,
  isSelected = false,
  interactionDisabled = false,
  disableDragAndResize = false,
  disableResize = false,
  draggableId = task.id,
  htmlAnchorId = `task-${task.id}`,
  swimlaneSegmentSecondary = false,
  linkMode = null,
  onResize,
  onClick,
  onCommentApprove,
  onCommentDelete,
  onCommentUpdate,
  onDeleteLocalImage,
  onCreateQATask,
  developers = [],
  assigneeName,
  taskPositions,
  qaTasksMap,
  requestArrowRedraw,
  style: customStyle,
  onTaskHover,
  onContextMenu,
  contextMenuBlurOtherCards = false,
  contextMenuTaskId = null,
  selectedSprintId,
  selectedTaskId: _selectedTaskId = null,
  stickyNoteCardRowResize,
  swimlaneBarDurationParts,
  swimlaneSegmentBadge = null,
  swimlaneDragActive,
  swimlaneTimelineTotalParts = WORKING_DAYS * getPartsPerDay(),
}: TaskBarProps) {
  const { sprintPlannerUi } = useRootStore();
  const isChooserDraft = isQuickAddChooserDraft(task);
  const resizeDisabled =
    disableResize || disableDragAndResize || isChooserDraft;
  const [clickStartPos, setClickStartPos] = useState<{ x: number; y: number } | null>(null);
  const [isExpandedByLongHover, setIsExpandedByLongHover] = useState(false);
  const [hoverExpandFitDurationParts, setHoverExpandFitDurationParts] = useState<number | null>(null);
  const longHoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    contentDurationParts,
    contentWidthPercent,
    dimmedByContextMenuElsewhere,
    dragActivationProps,
    effectiveIsDragging,
    effectiveOpacity,
    hasQATaskInSwimlane,
    hideSourceForOverlay,
    instantGeometryClass,
    isAnyResizing,
    isDraftTask,
    isNarrowForLongHoverExpand,
    isQATask,
    layoutStyle,
    presenceLocked,
    previewBorder,
    resize,
    setNodeRef,
    shouldExpandByLongHover,
    taskBarZIndex,
    transform,
    verticalResize,
  } = useTaskBarDisplayState({
    assigneeName,
    contextMenuBlurOtherCards,
    contextMenuTaskId,
    customStyle,
    developers,
    disableResize: resizeDisabled,
    draggableId,
    duration,
    globalNameFilter,
    hoverExpandFitDurationParts,
    inlineTitleEditor,
    interactionDisabled: interactionDisabled || disableDragAndResize,
    isExpandedByLongHover,
    isInError,
    isLinking: disableDragAndResize,
    isSelected,
    leftPercent,
    onResize,
    qaTasksMap,
    quickAddMenu,
    stickyNoteCardRowResize,
    swimlaneBarDurationParts,
    swimlaneDragActive,
    swimlaneTimelineTotalParts,
    task,
    taskPositions,
    widthPercent,
  });

  useTaskBarLifecycle({
    contextMenuTaskId,
    effectiveIsDragging,
    htmlAnchorId,
    isLinking: disableDragAndResize,
    leftPercent,
    longHoverTimeoutRef,
    requestArrowRedraw,
    setIsExpandedByLongHover,
    shouldExpandByLongHover,
    taskId: task.id,
    widthPercent,
  });

  let linkCursorClass = '';
  if (linkMode === 'target') {
    linkCursorClass = 'cursor-pointer';
  } else if (disableDragAndResize) {
    linkCursorClass = 'cursor-default';
  }
  const isNotificationFocused = sprintPlannerUi.notificationFocusTaskId === task.id;
  const presenceBlocksMutations =
    presenceLocked && !effectiveIsDragging && !isAnyResizing;
  const swimlaneCommentId = parseSwimlaneCommentTaskId(task.id);
  const {
    beginPhotoGesture,
    getPhotoClickSuppress,
    isPhotoCard,
    openPhotoLightbox,
  } = useTaskBarPhotoCardInteractions(task, effectiveIsDragging);
  const isDiagramCard = isSwimlaneDiagramTask(task);
  const isSwimlanePhotoCard = isSwimlaneImageTask(task);
  const isStickyNoteCard =
    !isSwimlanePhotoCard &&
    !isDiagramCard &&
    (task.localDraftKind === 'comment' || swimlaneCommentId != null);
  const cornerStyle = resolveResizeHandleCornerStyle(isPhotoCard || isDiagramCard, isStickyNoteCard);
  const {
    showCommentDelete,
    showDraftNoteDelete,
    showImageDelete,
    showPendingApprovalToolbar,
    showStickyNotePin,
    showStickyNoteReactions,
  } = resolveTaskBarAnnotationChrome({
      effectiveIsDragging,
      hasCommentApprove: onCommentApprove != null,
      hasCommentDelete: onCommentDelete != null,
      hasImageDelete: onDeleteLocalImage != null,
      inlineTitleEditor,
      isDiagramCard,
      isLinkingSession: disableDragAndResize,
      isLocalTask: task.isLocalTask,
      isPhotoCard,
      isResizing: isAnyResizing,
      isStickyNoteCard,
      pendingApproval: task.pendingApproval === true,
      presenceLocked: presenceBlocksMutations,
      quickAddMenu,
      quickAddSubmitting,
      swimlaneCommentId,
    });
  const onDiagramNameChange = resolveDiagramNameChangeHandler({
    commentId: swimlaneCommentId,
    isDiagramCard,
    onCommentUpdate,
    presenceBlocksMutations,
  });

  return (
    <DiagramNameEditContext.Provider value={onDiagramNameChange}>
    <div
      className={getTaskBarRootClassName({
        effectiveIsDragging,
        instantGeometryClass,
        interactionDisabled,
        isAnnotationCard: isStickyNoteCard || isPhotoCard || isDiagramCard,
        linkCursorClass,
        shouldExpandByLongHover,
      })}
      data-draggable-id={draggableId}
      data-onboarding-card=""
      data-task-id={task.id}
      id={htmlAnchorId}
      style={{
        ...layoutStyle,
        zIndex: taskBarZIndex,
      }}
      onBlur={(event) => {
        const next = event.relatedTarget;
        if (
          inlineTitleEditor?.onCancel &&
          shouldCancelInlineEditorOnFocusOut({
            currentTarget: event.currentTarget,
            persistDraft: isStickyNoteCard,
            relatedTarget: next instanceof Node ? next : null,
          })
        ) {
          inlineTitleEditor.onCancel();
        }
      }}
    >
      {hideSourceForOverlay && (
        <TaskBarDragSourceGhost
          cornerStyle={cornerStyle}
          enabled={effectiveIsDragging}
          pinToSource
          transform={transform}
        />
      )}
      <TaskBarOpacityLayer
        assigneeName={assigneeName}
        clickStartPos={clickStartPos}
        contentDurationParts={contentDurationParts}
        contentWidthPercent={contentWidthPercent}
        contextMenuTaskId={contextMenuTaskId}
        cornerStyle={cornerStyle}
        currentDurationParts={swimlaneBarDurationParts ?? duration}
        developers={developers}
        dimmedByContextMenuElsewhere={dimmedByContextMenuElsewhere}
        disableResize={resizeDisabled || presenceBlocksMutations}
        dragActivationProps={dragActivationProps}
        effectiveIsDragging={effectiveIsDragging}
        effectiveOpacity={effectiveOpacity}
        errorTooltip={errorTooltip}
        getPhotoClickSuppress={getPhotoClickSuppress}
        hasQATaskInSwimlane={hasQATaskInSwimlane}
        hideSourceForOverlay={hideSourceForOverlay}
        hoverExpandTimelineTotalParts={swimlaneTimelineTotalParts}
        inlineTitleEditor={inlineTitleEditor}
        interactionDisabled={interactionDisabled ?? false}
        isDraftTask={isDraftTask}
        isInError={isInError}
        isLinking={disableDragAndResize}
        isNarrowForLongHoverExpand={isNarrowForLongHoverExpand}
        isNotificationFocused={isNotificationFocused}
        isQATask={isQATask}
        isSelected={isSelected}
        linkMode={linkMode}
        longHoverTimeoutRef={longHoverTimeoutRef}
        previewBorder={isDraftTask ? undefined : previewBorder}
        quickAddSubmitting={quickAddSubmitting}
        resize={{ ...resize, isResizing: isAnyResizing }}
        selectedSprintId={selectedSprintId}
        setClickStartPos={setClickStartPos}
        setHoverExpandFitDurationParts={setHoverExpandFitDurationParts}
        setIsExpandedByLongHover={setIsExpandedByLongHover}
        setNodeRef={setNodeRef}
        showVerticalResize={isStickyNoteCard || isSwimlanePhotoCard}
        swimlaneBarDurationParts={swimlaneBarDurationParts}
        swimlaneSegmentBadge={swimlaneSegmentBadge}
        swimlaneSegmentSecondary={swimlaneSegmentSecondary}
        task={task}
        taskPositions={taskPositions}
        transform={transform}
        verticalResize={verticalResize}
        onClick={
          presenceBlocksMutations && !isPhotoCard && !isDiagramCard
            ? undefined
            : resolveTaskBarCardClick({
                imageUrl: task.imageUrl,
                isDiagramCard,
                isLinkingSession: disableDragAndResize,
                isLocalTask: task.isLocalTask,
                isPhotoCard,
                onClick,
                openDiagram: () => sprintPlannerUi.openDiagramEditor(task.id),
                openLightbox: openPhotoLightbox,
              })
        }
        onCommentUpdate={presenceBlocksMutations ? undefined : onCommentUpdate}
        onContextMenu={onContextMenu}
        onCreateQATask={presenceBlocksMutations ? undefined : onCreateQATask}
        onPhotoClick={
          isPhotoCard && task.imageUrl && task.isLocalTask !== true
            ? openPhotoLightbox
            : undefined
        }
        onPhotoGestureStart={beginPhotoGesture}
        onTaskHover={onTaskHover}
      >
        <TaskBarAnnotationOverlays
          isDiagramCard={isDiagramCard}
          isPhotoCard={isPhotoCard}
          isResizing={isAnyResizing}
          readOnly={presenceBlocksMutations}
          showCommentDelete={showCommentDelete}
          showDraftNoteDelete={showDraftNoteDelete}
          showImageDelete={showImageDelete}
          showStickyNotePin={showStickyNotePin}
          showStickyNoteReactions={showStickyNoteReactions}
          stickyNoteColor={task.stickyNoteColor}
          swimlaneCommentId={swimlaneCommentId}
          taskId={task.id}
          onCommentDelete={onCommentDelete}
          onDeleteLocalImage={onDeleteLocalImage}
          onTaskHover={onTaskHover}
        />
      </TaskBarOpacityLayer>
      {showPendingApprovalToolbar && swimlaneCommentId != null ? (
        <TaskBarPendingApprovalToolbar
          commentId={swimlaneCommentId}
          onApprove={onCommentApprove}
          onReject={onCommentDelete}
        />
      ) : null}
      <TaskBarDraftSaveButton noteEditor={inlineTitleEditor} />
      {quickAddMenu && !quickAddSubmitting ? (
        <SwimlaneQuickAddMenu
          key={htmlAnchorId}
          anchorId={htmlAnchorId}
          assigneeId={quickAddMenu.assigneeId}
          availabilityStartDate={quickAddMenu.availabilityStartDate}
          boardId={quickAddMenu.boardId}
          commentColor={quickAddMenu.commentColor}
          draftKind={quickAddMenu.draftKind}
          excludedIssueKeys={quickAddMenu.excludedIssueKeys}
          imageUrl={quickAddMenu.imageUrl}
          isSubmitting={quickAddSubmitting}
          issueType={quickAddMenu.issueType}
          lockedMode={quickAddMenu.lockedMode}
          parentKey={quickAddMenu.parentKey}
          parentSelectOptions={quickAddMenu.parentSelectOptions}
          queueKey={quickAddMenu.queueKey}
          queueOptions={quickAddMenu.queueOptions}
          requiresAssignee={quickAddMenu.requiresAssignee}
          showAssigneeSelect={quickAddMenu.showAssigneeSelect}
          taskId={quickAddMenu.taskId}
          title={quickAddMenu.title}
          onCancel={quickAddMenu.onCancel}
          onCommentColorChange={quickAddMenu.onCommentColorChange}
          onCreate={quickAddMenu.onCreate}
          onCreateAvailability={quickAddMenu.onCreateAvailability}
          onDraftKindChange={quickAddMenu.onDraftKindChange}
          onImageUrlChange={quickAddMenu.onImageUrlChange}
          onIssueTypeChange={quickAddMenu.onIssueTypeChange}
          onParentChange={quickAddMenu.onParentChange}
          onPasteNote={quickAddMenu.onPasteNote}
          onQueueChange={quickAddMenu.onQueueChange}
          onSelectExisting={quickAddMenu.onSelectExisting}
          onTitleChange={quickAddMenu.onTitleChange}
        />
      ) : null}
    </div>
    </DiagramNameEditContext.Provider>
  );
});

const MemoizedTaskBar = React.memo(TaskBar, (prevProps, nextProps) => {
  return (
    prevProps.task.id === nextProps.task.id &&
    prevProps.task.status === nextProps.task.status &&
    prevProps.task.storyPoints === nextProps.task.storyPoints &&
    prevProps.task.testPoints === nextProps.task.testPoints &&
    prevProps.task.name === nextProps.task.name &&
    prevProps.task.excalidrawSceneText === nextProps.task.excalidrawSceneText &&
    prevProps.task.diagramSceneUrl === nextProps.task.diagramSceneUrl &&
    prevProps.task.localDraftKind === nextProps.task.localDraftKind &&
    prevProps.task.imageUrl === nextProps.task.imageUrl &&
    prevProps.task.stickyNoteColor === nextProps.task.stickyNoteColor &&
    prevProps.task.stickyNoteAuthorName === nextProps.task.stickyNoteAuthorName &&
    prevProps.task.pendingApproval === nextProps.task.pendingApproval &&
    prevProps.leftPercent === nextProps.leftPercent &&
    prevProps.widthPercent === nextProps.widthPercent &&
    prevProps.duration === nextProps.duration &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.contextMenuBlurOtherCards === nextProps.contextMenuBlurOtherCards &&
    prevProps.contextMenuTaskId === nextProps.contextMenuTaskId &&
    prevProps.isInError === nextProps.isInError &&
    prevProps.errorTooltip === nextProps.errorTooltip &&
    prevProps.disableResize === nextProps.disableResize &&
    prevProps.disableDragAndResize === nextProps.disableDragAndResize &&
    prevProps.linkMode === nextProps.linkMode &&
    prevProps.interactionDisabled === nextProps.interactionDisabled &&
    prevProps.draggableId === nextProps.draggableId &&
    prevProps.htmlAnchorId === nextProps.htmlAnchorId &&
    prevProps.swimlaneSegmentSecondary === nextProps.swimlaneSegmentSecondary &&
    prevProps.swimlaneBarDurationParts === nextProps.swimlaneBarDurationParts &&
    prevProps.swimlaneDragActive === nextProps.swimlaneDragActive &&
    Boolean(prevProps.inlineTitleEditor) === Boolean(nextProps.inlineTitleEditor) &&
    prevProps.inlineTitleEditor?.value === nextProps.inlineTitleEditor?.value &&
    prevProps.inlineTitleEditor?.color === nextProps.inlineTitleEditor?.color &&
    prevProps.inlineTitleEditor?.showDisabledSave === nextProps.inlineTitleEditor?.showDisabledSave &&
    Boolean(prevProps.quickAddMenu) === Boolean(nextProps.quickAddMenu) &&
    prevProps.quickAddMenu?.title === nextProps.quickAddMenu?.title &&
    prevProps.quickAddMenu?.commentColor === nextProps.quickAddMenu?.commentColor &&
    prevProps.quickAddMenu?.issueType === nextProps.quickAddMenu?.issueType &&
    prevProps.quickAddMenu?.parentKey === nextProps.quickAddMenu?.parentKey &&
    prevProps.quickAddMenu?.parentSelectOptions === nextProps.quickAddMenu?.parentSelectOptions &&
    prevProps.quickAddMenu?.queueKey === nextProps.quickAddMenu?.queueKey &&
    prevProps.quickAddMenu?.taskId === nextProps.quickAddMenu?.taskId &&
    prevProps.quickAddMenu?.lockedMode === nextProps.quickAddMenu?.lockedMode &&
    prevProps.quickAddMenu?.requiresAssignee === nextProps.quickAddMenu?.requiresAssignee &&
    prevProps.quickAddMenu?.assigneeId === nextProps.quickAddMenu?.assigneeId &&
    prevProps.quickAddMenu?.showAssigneeSelect === nextProps.quickAddMenu?.showAssigneeSelect &&
    prevProps.quickAddMenu?.availabilityStartDate === nextProps.quickAddMenu?.availabilityStartDate &&
    Boolean(prevProps.quickAddMenu?.onCreateAvailability) ===
      Boolean(nextProps.quickAddMenu?.onCreateAvailability) &&
    Boolean(prevProps.quickAddMenu?.onPasteNote) === Boolean(nextProps.quickAddMenu?.onPasteNote) &&
    prevProps.quickAddSubmitting === nextProps.quickAddSubmitting &&
    Boolean(prevProps.onCommentApprove) === Boolean(nextProps.onCommentApprove) &&
    Boolean(prevProps.onCommentDelete) === Boolean(nextProps.onCommentDelete) &&
    Boolean(prevProps.onCommentUpdate) === Boolean(nextProps.onCommentUpdate) &&
    Boolean(prevProps.onDeleteLocalImage) === Boolean(nextProps.onDeleteLocalImage)
  );
});

MemoizedTaskBar.displayName = 'MemoizedTaskBar';
