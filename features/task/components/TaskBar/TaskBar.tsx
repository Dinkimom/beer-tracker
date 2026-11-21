'use client';

import type { SegmentPlanAnchorOverlay } from '@/features/swimlane/utils/planAnchorShift';
import type { TaskResizeParams } from '@/features/task/hooks/useTaskResize';
import type { StickyNoteCardRowLayout } from '@/features/task/utils/stickyNoteCardRowResizeHelpers';
import type { StickyNoteColor } from '@/lib/comments/stickyNoteColor';
import type { Task, TaskPosition } from '@/types';

import { observer } from 'mobx-react-lite';
import React, { useRef, useState } from 'react';

import { useStickyNoteColorPop } from '@/features/comments/hooks/useStickyNoteColorPop';
import { useStickyNoteExiting } from '@/features/comments/hooks/useStickyNoteExiting';
import { useStickyNoteSaveMotion } from '@/features/comments/hooks/useStickyNoteSaveMotion';
import { stickyNoteColorPopClassName } from '@/features/comments/utils/stickyNoteColorPop';
import { stickyNoteExitClassName } from '@/features/comments/utils/stickyNoteExit';
import { finishStickyNoteSaveMotion, stickyNoteSaveMotionClassName } from '@/features/comments/utils/stickyNoteSaveMotion';
import { isSwimlaneDiagramTask, isSwimlaneWidgetTask, parseSwimlaneCommentTaskId } from '@/features/comments/utils/swimlaneCommentTaskBridge';
import { useCardContextMenu } from '@/features/context-menu/hooks/useCardContextMenu';
import { DraftItemCommentButton } from '@/features/swimlane/components/DraftItemCommentButton';
import { PlanPatchPendingToolbar } from '@/features/swimlane/components/PlanPatchPendingToolbar';
import { resolvePlanPatchTaskBarChrome } from '@/features/swimlane/components/PlanPatchPreviewCaption';
import { isQuickAddChooserDraft } from '@/features/task/components/TaskCard/components/taskCardContentHelpers';
import { DiagramNameEditContext } from '@/features/task/components/TaskCard/components/TaskCardSwimlaneDiagramCaption';
import { canDropTaskOnSidebar } from '@/features/task/utils/canDropTaskOnSidebar';
import { isSwimlaneImageTask } from '@/features/task/utils/swimlaneImageTask';
import { useRootStore } from '@/lib/layers';

import { SwimlaneQuickAddMenu, type SwimlaneQuickAddMenuProps } from './components/quickAddMenu/SwimlaneQuickAddMenu';
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
import { useTaskBarBoard } from './useTaskBarBoard';
import { useTaskBarDisplayState } from './useTaskBarDisplayState';
import { useTaskBarLifecycle } from './useTaskBarLifecycle';
import { useTaskBarNoteFocus } from './useTaskBarNoteFocus';
import { useTaskBarPhotoCardInteractions } from './useTaskBarPhotoCardInteractions';

/** Разработчики, фильтр по имени и спринт — из `SwimlaneBoardContext`: у всех карточек доски они общие. */
export interface TaskBarProps {
  assigneeName?: string;
  /** Отключить drag/resize, но оставить клики (режим связей). */
  disableDragAndResize?: boolean;
  disableResize?: boolean;
  draggableId?: string;
  duration: number;
  errorTooltip?: string;
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
  leftPercent: number;
  /** Обводка в режиме создания связи. */
  linkMode?: 'source' | 'target' | null;
  /** Штриховка стоимости и засечка срока относительно плана на старте работы. */
  planAnchorOverlay?: SegmentPlanAnchorOverlay | null;
  /** Карточка предложения: та же задача, геометрия из превью, без перетаскивания. */
  planPatchGhost?: boolean;
  quickAddMenu?: Omit<SwimlaneQuickAddMenuProps, 'anchorId' | 'isSubmitting' | 'title'> & {
    title: string;
  };
  quickAddSubmitting?: boolean;
  /** Отрезок сегментированной карточки: бейдж «n из m», индекс для ресайза, вторичный отрезок. */
  segment?: {
    badge?: { index: number; total: number } | null;
    index?: number;
    secondary?: boolean;
  };
  stickyNoteCardRowResize?: {
    assignedTaskLayer: number;
    committedCardRowLayout?: StickyNoteCardRowLayout;
    hasTaskOverlaps: boolean;
    layerHeight: number;
    onLayoutCommit?: (layout: StickyNoteCardRowLayout) => void;
    taskBandTotalHeight: number;
  };
  style?: React.CSSProperties;
  swimlaneDragActive?: boolean;
  task: Task;
  taskPositions?: Map<string, TaskPosition>;
  widthPercent: number;
  onResize: (params: TaskResizeParams) => void;
  onTaskHover?: (taskId: string | null) => void;
}

const TaskBarSurface = observer(function TaskBarSurface(props: TaskBarProps) {
  const {
  task,
  inlineTitleEditor,
  quickAddMenu,
  quickAddSubmitting = false,
  leftPercent,
  widthPercent,
  duration,
  errorTooltip,
  isInError = false,
  interactionDisabled = false,
  disableDragAndResize = false,
  disableResize = false,
  draggableId = task.id,
  htmlAnchorId = `task-${task.id}`,
  linkMode = null,
  planPatchGhost = false,
  planAnchorOverlay,
  assigneeName,
  taskPositions,
  onTaskHover,
  segment: { badge: swimlaneSegmentBadge = null, secondary: swimlaneSegmentSecondary = false } = {},
} = props;
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

  // Меню выбирается подпиской: карточка перерисуется, только когда её состояние меню изменилось.
  const contextMenu = useCardContextMenu(task.id);
  const {
    commentActions,
    developers,
    globalNameFilter,
    onClick,
    onContextMenu,
    onCreateQATask,
    onDeleteLocalImage,
    qaTasksMap,
    requestArrowRedraw,
    selectedSprintId,
    swimlaneTimelineTotalParts,
  } = useTaskBarBoard(planPatchGhost, disableDragAndResize);
  const { onCommentApprove, onCommentDelete, onCommentUpdate } = commentActions ?? {};
  const {
    content,
    root,
    dragActivationProps,
    effectiveIsDragging,
    effectiveOpacity,
    hasQATaskInSwimlane,
    hideSourceForOverlay,
    isAnyResizing,
    isDraftTask,
    isNarrowForLongHoverExpand,
    isQATask,
    longHoverElevated,
    presenceLocked,
    resize,
    setNodeRef,
    shouldExpandByLongHover,
    transform,
    verticalResize,
  } = useTaskBarDisplayState({
    bar: props,
    board: { globalNameFilter, qaTasksMap, swimlaneTimelineTotalParts },
    dimmedByContextMenu: contextMenu.dimmed,
    longHover: { expanded: isExpandedByLongHover, fitDurationParts: hoverExpandFitDurationParts },
    resizeDisabled,
  });


  useTaskBarLifecycle({
    contextMenuOpen: contextMenu.open,
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
        instantGeometryClass: root.geometryClass,
        interactionDisabled,
        isAnnotationCard: isStickyNoteCard || isPhotoCard || isDiagramCard || isWidgetCard,
        linkCursorClass,
        shouldExpandByLongHover,
      })}${stickyNoteExitClassName(isStickyNoteCard, stickyNoteExiting)}${stickyNoteColorPopClassName(isStickyNoteCard, stickyNoteColorPopping)}${stickyNoteSaveMotionClassName(isStickyNoteCard, stickyNoteSaveMotion)}${planPatchChrome.ringClass}`}
      data-draggable-id={draggableId}
      data-task-id={task.id}
      {...root.onboardingDataset}
      id={htmlAnchorId}
      style={{
        ...resolveTaskBarRootStyle({
          hideSourceForOverlay,
          layoutStyle: root.layoutStyle,
          taskBarZIndex: resolveVisibleTaskBarZIndex({
            pendingApprovalToolbar: taskBarHasPendingApprovalToolbar({
              planPatchToolbar: planPatchChrome.toolbarPreview != null,
              showNoteToolbar: showPendingApprovalToolbar,
              swimlaneCommentId,
            }),
            taskBarZIndex: root.zIndex,
          }),
        }),
        ...noteFocusMode.rootStyle,
      }}
      onAnimationEnd={(event) => finishStickyNoteSaveMotion(task.id, event.animationName)}
      onBlur={(event) => cancelInlineEditorOnFocusOut(event, inlineTitleEditor?.onCancel, isStickyNoteCard)}
    >
      <TaskBarOpacityLayer
        card={{
          taskCard: {
            assigneeName,
            developers,
            swimlaneBarDurationParts: duration,
            widthPercent: content.widthPercent,
            swimlane: {
              inlineTitleEditor,
              isNotificationFocused,
              layoutDuration: content.durationParts,
              linkMode,
              taskPosition: taskPositions?.get(task.id),
              onCommentUpdate: presenceBlocksMutations ? undefined : onCommentUpdate,
              onPhotoClick: isPhotoCard && task.imageUrl && task.isLocalTask !== true ? openPhotoLightbox : undefined,
            },
          },
          clickStartPos,
          dragActivationProps,
          getPhotoClickSuppress,
          onClick:
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
                }),
          onContextMenu,
          onPhotoGestureStart: beginPhotoGesture,
          setClickStartPos,
          setNodeRef,
        }}
        chrome={{
          disableResize: resizeDisabled || presenceBlocksMutations,
          errorTooltip,
          hasQATaskInSwimlane,
          isInError,
          onCreateQATask: presenceBlocksMutations ? undefined : onCreateQATask,
          showVerticalResize: isStickyNoteCard || isSwimlanePhotoCard,
          swimlaneSegmentBadge,
          swimlaneSegmentSecondary,
          verticalResize,
        }}
        cornerStyle={cornerStyle}
        currentDurationParts={duration}
        effectiveIsDragging={effectiveIsDragging}
        effectiveOpacity={effectiveOpacity * planPatchChrome.opacityFactor}
        hideSourceForOverlay={hideSourceForOverlay}
        interactionDisabled={interactionDisabled ?? false}
        isDraftTask={isDraftTask}
        isLinking={disableDragAndResize}
        isQATask={isQATask}
        longHover={{
          expanded: isExpandedByLongHover || longHoverElevated,
          isNarrow: isNarrowForLongHoverExpand,
          setExpanded: setIsExpandedByLongHover,
          setFitDurationParts: setHoverExpandFitDurationParts,
          timelineTotalParts: swimlaneTimelineTotalParts,
          timeoutRef: longHoverTimeoutRef,
        }}
        planAnchorOverlay={planAnchorOverlay}
        quickAddSubmitting={quickAddSubmitting}
        resize={{ ...resize, isResizing: isAnyResizing }}
        task={task}
        transform={transform}
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
        // quickAddMenu — пропсы меню без якоря и флага отправки: собраны в сегменте, отдаются как есть.
        <SwimlaneQuickAddMenu
          key={htmlAnchorId}
          {...quickAddMenu}
          anchorId={htmlAnchorId}
          isSubmitting={quickAddSubmitting}
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
      sidebarDropAllowed={canDropTaskOnSidebar(props.task)}
      taskId={props.task.id}
    >
      <TaskBarSurface {...props} draggableId={draggableId} />
    </TaskBarDragBridge>
  );
}
