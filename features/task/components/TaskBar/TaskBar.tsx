'use client';

import type { SegmentPlanAnchorOverlay } from '@/features/swimlane/utils/planAnchorShift';
import type { TaskResizeParams } from '@/features/task/hooks/useTaskResize';
import type { StickyNoteCardRowLayout } from '@/features/task/utils/stickyNoteCardRowResizeHelpers';
import type { StickyNoteColor } from '@/lib/comments/stickyNoteColor';
import type { Task, Developer, TaskPosition } from '@/types';

import { observer } from 'mobx-react-lite';
import React, { useRef, useState } from 'react';

import { WORKING_DAYS, getPartsPerDay } from '@/constants';
import { useStickyNoteColorPop } from '@/features/comments/hooks/useStickyNoteColorPop';
import { useStickyNoteExiting } from '@/features/comments/hooks/useStickyNoteExiting';
import { useStickyNoteSaveMotion } from '@/features/comments/hooks/useStickyNoteSaveMotion';
import { stickyNoteColorPopClassName } from '@/features/comments/utils/stickyNoteColorPop';
import { stickyNoteExitClassName } from '@/features/comments/utils/stickyNoteExit';
import { finishStickyNoteSaveMotion, stickyNoteSaveMotionClassName } from '@/features/comments/utils/stickyNoteSaveMotion';
import { isSwimlaneDiagramTask, isSwimlaneWidgetTask, parseSwimlaneCommentTaskId } from '@/features/comments/utils/swimlaneCommentTaskBridge';
import { DraftItemCommentButton } from '@/features/swimlane/components/DraftItemCommentButton';
import { PlanPatchPendingToolbar } from '@/features/swimlane/components/PlanPatchPendingToolbar';
import { resolvePlanPatchTaskBarChrome } from '@/features/swimlane/components/PlanPatchPreviewCaption';
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
import { TaskBarDragBridge } from './TaskBarDragBridge';
import {
  cancelInlineEditorOnFocusOut,
  resolveTaskBarRootStyle,
  resolveVisibleTaskBarZIndex,
  taskBarHasPendingApprovalToolbar,
} from './taskBarHelpers';
import { TaskBarOpacityLayer } from './TaskBarOpacityLayer';
import { TaskBarPendingApprovalToolbar } from './TaskBarPendingApprovalToolbar';
import { usePlanPatchNoteFocus } from './usePlanPatchNoteFocus';
import { useTaskBarDisplayState } from './useTaskBarDisplayState';
import { useTaskBarLifecycle } from './useTaskBarLifecycle';
import { useTaskBarNoteFocus } from './useTaskBarNoteFocus';
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
  /** Штриховка стоимости и засечка срока относительно плана на старте работы. */
  planAnchorOverlay?: SegmentPlanAnchorOverlay | null;
  /** Карточка предложения: та же задача, геометрия из превью, без перетаскивания. */
  planPatchGhost?: boolean;
  /** Индекс отрезка плана при ресайзе сегментированной карточки. */
  planSegmentIndex?: number;
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
  onCommentUpdate?: (commentId: string, text: string, color?: StickyNoteColor) => void;
  onContextMenu?: (e: React.MouseEvent, task: Task) => void;
  onCreateQATask?: (taskId: string, anchorRect?: DOMRect) => void;
  onDeleteLocalImage?: (taskId: string) => void;
  onResize: (params: TaskResizeParams) => void;
  onTaskHover?: (taskId: string | null) => void;
  requestArrowRedraw: () => void;
}

const TaskBarSurface = observer(function TaskBarSurface({
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
  planPatchGhost = false,
  planSegmentIndex,
  planAnchorOverlay,
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
  const { sprintPlannerUi, taskPositions: positionsStore } = useRootStore();
  const noteFocus = usePlanPatchNoteFocus(task, onTaskHover);
  const planPatchChrome = resolvePlanPatchTaskBarChrome({
    focusTaskId: sprintPlannerUi.planPatchFocusTaskId,
    noteFocused: noteFocus.focused,
    planPatchGhost,
    preview: positionsStore.planPatchPreviews.get(task.id),
    suppressPlanPatchToolbar: swimlaneSegmentSecondary,
    taskId: task.id,
  });
  const isChooserDraft = isQuickAddChooserDraft(task);
  const resizeDisabled =
    disableResize || disableDragAndResize || isChooserDraft || isSwimlaneWidgetTask(task);
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
    isAnyResizing, onboardingDataset,
    isDraftTask,
    isNarrowForLongHoverExpand,
    isQATask,
    layoutStyle,
    presenceLocked,
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
    planSegmentIndex,
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
  const isWidgetCard = isSwimlaneWidgetTask(task);
  const isSwimlanePhotoCard = isSwimlaneImageTask(task);
  const isStickyNoteCard =
    !isSwimlanePhotoCard &&
    !isDiagramCard &&
    !isWidgetCard &&
    (task.localDraftKind === 'comment' || swimlaneCommentId != null);
  const stickyNoteExiting = useStickyNoteExiting(task.id);
  const stickyNoteColorPopping = useStickyNoteColorPop(task.id, isStickyNoteCard, task.stickyNoteColor);
  const stickyNoteSaveMotion = useStickyNoteSaveMotion(task.id);
  const cornerStyle = resolveResizeHandleCornerStyle(
    isPhotoCard || isDiagramCard || isWidgetCard,
    isStickyNoteCard
  );
  const {
    showCommentDelete,
    showDraftNoteDelete,
    showImageDelete,
    showPendingApprovalToolbar,
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
  const noteFocusMode = useTaskBarNoteFocus({ developers, inlineTitleEditor, isStickyNoteCard });
  const onDiagramNameChange = resolveDiagramNameChangeHandler({
    commentId: swimlaneCommentId,
    isDiagramCard,
    onCommentUpdate,
    presenceBlocksMutations,
  });

  return (
    <DiagramNameEditContext.Provider value={onDiagramNameChange}>
    <div
      ref={noteFocusMode.rootRef}
      className={`${getTaskBarRootClassName({
        effectiveIsDragging,
        instantGeometryClass,
        interactionDisabled,
        isAnnotationCard: isStickyNoteCard || isPhotoCard || isDiagramCard || isWidgetCard,
        linkCursorClass,
        shouldExpandByLongHover,
      })}${stickyNoteExitClassName(isStickyNoteCard, stickyNoteExiting)}${stickyNoteColorPopClassName(isStickyNoteCard, stickyNoteColorPopping)}${stickyNoteSaveMotionClassName(isStickyNoteCard, stickyNoteSaveMotion)}${planPatchChrome.ringClass}`}
      data-draggable-id={draggableId}
      data-task-id={task.id}
      {...onboardingDataset}
      id={htmlAnchorId}

      style={{
        ...resolveTaskBarRootStyle({
          hideSourceForOverlay,
          layoutStyle,
          taskBarZIndex: resolveVisibleTaskBarZIndex({
            pendingApprovalToolbar: taskBarHasPendingApprovalToolbar({
              planPatchToolbar: planPatchChrome.toolbarPreview != null,
              showNoteToolbar: showPendingApprovalToolbar,
              swimlaneCommentId,
            }),
            taskBarZIndex,
          }),
        }),
        ...noteFocusMode.rootStyle,
      }}
      onAnimationEnd={(event) => finishStickyNoteSaveMotion(task.id, event.animationName)}
      onBlur={(event) => cancelInlineEditorOnFocusOut(event, inlineTitleEditor?.onCancel, isStickyNoteCard)}
    >
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
        effectiveOpacity={effectiveOpacity * planPatchChrome.opacityFactor}
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
        longHoverExpanded={isExpandedByLongHover}
        longHoverTimeoutRef={longHoverTimeoutRef}
        planAnchorOverlay={planAnchorOverlay}
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
          isWidgetCard || (presenceBlocksMutations && !isPhotoCard && !isDiagramCard)
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
        onTaskHover={noteFocus.hover}
      >
        <TaskBarAnnotationOverlays
          isDiagramCard={isDiagramCard}
          isPhotoCard={isPhotoCard || isWidgetCard}
          isResizing={isAnyResizing}
          readOnly={presenceBlocksMutations}
          showCommentDelete={showCommentDelete}
          showDraftNoteDelete={showDraftNoteDelete}
          showImageDelete={showImageDelete}
          showStickyNoteReactions={showStickyNoteReactions}
          stickyNoteColor={task.stickyNoteColor}
          swimlaneCommentId={swimlaneCommentId}
          taskId={task.id}
          onCommentDelete={onCommentDelete}
          onDeleteLocalImage={onDeleteLocalImage}
          onTaskHover={noteFocus.hover}
        />
      </TaskBarOpacityLayer>
      <PlanPatchPendingToolbar preview={planPatchChrome.toolbarPreview} sprintId={selectedSprintId} />
      {showPendingApprovalToolbar && swimlaneCommentId != null ? (
        <TaskBarPendingApprovalToolbar
          clientBrand={task.pendingApprovalClientBrand}
          commentId={swimlaneCommentId}
          extraAction={
            <DraftItemCommentButton
              sprintId={selectedSprintId}
              targetId={swimlaneCommentId}
              targetKind="note"
              targetLabel={task.name}
            />
          }
          onApprove={onCommentApprove}
          onReject={onCommentDelete}
        />
      ) : null}
      <TaskBarDraftSaveButton noteEditor={inlineTitleEditor} onNoteExpand={noteFocusMode.onNoteExpand} />
      {noteFocusMode.focusEditor}
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

// Мост с useDraggable — родитель поверхности: сдвиг курсора не пересоздаёт её element.
export function TaskBar(props: TaskBarProps) {
  const draggableId = props.draggableId ?? props.task.id;
  return (
    <TaskBarDragBridge
      draggableId={draggableId}
      interactionDisabled={Boolean(props.interactionDisabled || props.disableDragAndResize)}
      taskId={props.task.id}
    >
      <TaskBarSurface {...props} draggableId={draggableId} />
    </TaskBarDragBridge>
  );
}
