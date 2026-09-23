'use client';

import type { ResizeHandleCornerStyle } from './components/taskBarResizeHandleHelpers';
import type { Developer, Task, TaskPosition } from '@/types';
import type { DraggableAttributes } from '@dnd-kit/core';

import React, { useCallback } from 'react';

import { Icon } from '@/components/Icon';

import { getQuickAddSubmittingOverlayRadiusClass } from './components/taskBarResizeHandleHelpers';
import { TaskBarDragSourceGhost } from './TaskBarDragSourceGhost';
import { TaskBarOpacityLayerCard } from './TaskBarOpacityLayerCard';
import { TaskBarOpacityLayerChrome } from './TaskBarOpacityLayerChrome';
import {
  buildTaskBarMouseLeaveHandler,
  runTaskBarMouseEnter,
} from './taskBarOpacityLayerHandlers';

interface TaskBarOpacityLayerProps {
  assigneeName?: string;
  children?: React.ReactNode;
  clickStartPos: { x: number; y: number } | null;
  contentDurationParts: number;
  contentWidthPercent: number;
  contextMenuTaskId: string | null;
  cornerStyle?: ResizeHandleCornerStyle;
  currentDurationParts: number;
  developers: Developer[];
  dimmedByContextMenuElsewhere: boolean;
  disableResize: boolean;
  dragActivationProps: DraggableAttributes;
  effectiveIsDragging: boolean;
  effectiveOpacity: number;
  errorTooltip?: string;
  hasQATaskInSwimlane: boolean;
  hideSourceForOverlay: boolean;
  hoverExpandTimelineTotalParts: number;
  inlineTitleEditor?: {
    onChange: (value: string) => void;
    onSubmit?: () => void;
    value: string;
  };
  interactionDisabled: boolean;
  isDraftTask: boolean;
  isInError: boolean;
  isLinking?: boolean;
  isNarrowForLongHoverExpand: boolean;
  isNotificationFocused?: boolean;
  isQATask: boolean;
  isSelected: boolean;
  linkMode?: 'source' | 'target' | null;
  longHoverTimeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
  previewBorder?: string;
  quickAddSubmitting: boolean;
  resize: {
    handleResizeStart: (e: React.MouseEvent, side: 'left' | 'right') => void;
    isResizing: boolean;
    resizePreviewDuration: number | null;
    resizeSide: 'left' | 'right' | null;
  };
  selectedSprintId?: number | null;
  setClickStartPos: React.Dispatch<React.SetStateAction<{ x: number; y: number } | null>>;
  setIsExpandedByLongHover: React.Dispatch<React.SetStateAction<boolean>>;
  showVerticalResize?: boolean;
  swimlaneBarDurationParts?: number;
  swimlaneSegmentBadge?: { index: number; total: number } | null;
  swimlaneSegmentSecondary: boolean;
  task: Task;
  taskPositions?: Map<string, TaskPosition>;
  transform: { x: number; y: number; scaleX: number; scaleY: number } | null;
  verticalResize?: {
    handleResizeStart: (e: React.MouseEvent, side: 'bottom' | 'top') => void;
    isResizing: boolean;
    resizeSide: 'bottom' | 'top' | null;
  };
  getPhotoClickSuppress?: () => boolean;
  onClick?: (taskId: string) => void;
  onCommentUpdate?: (commentId: string, text: string) => void;
  onContextMenu?: (e: React.MouseEvent, task: Task) => void;
  onCreateQATask?: (taskId: string, anchorRect?: DOMRect) => void;
  onPhotoClick?: () => void;
  onPhotoGestureStart?: (clientX: number, clientY: number) => void;
  onTaskHover?: (taskId: string | null) => void;
  setHoverExpandFitDurationParts: (durationParts: number) => void;
  setNodeRef: (node: HTMLElement | null) => void;
}

export function TaskBarOpacityLayer(props: TaskBarOpacityLayerProps) {
  const {
    assigneeName,
    children,
    clickStartPos,
    contentDurationParts,
    contentWidthPercent,
    contextMenuTaskId,
    cornerStyle = 'rounded',
    currentDurationParts,
    developers,
    dimmedByContextMenuElsewhere,
    disableResize,
    dragActivationProps,
    effectiveIsDragging,
    effectiveOpacity,
    errorTooltip,
    hasQATaskInSwimlane,
    hideSourceForOverlay,
    hoverExpandTimelineTotalParts,
    inlineTitleEditor,
    interactionDisabled,
    isDraftTask,
    isInError,
    isLinking = false,
    isNarrowForLongHoverExpand,
    linkMode = null,
    isNotificationFocused = false,
    isQATask,
    isSelected,
    longHoverTimeoutRef,
    onClick,
    onContextMenu,
    onCreateQATask,
    onPhotoClick,
    onPhotoGestureStart,
    onCommentUpdate,
    getPhotoClickSuppress,
    onTaskHover,
    previewBorder,
    quickAddSubmitting,
    resize,
    selectedSprintId,
    setClickStartPos,
    setHoverExpandFitDurationParts,
    setIsExpandedByLongHover,
    setNodeRef,
    swimlaneBarDurationParts,
    swimlaneSegmentBadge,
    swimlaneSegmentSecondary,
    task,
    taskPositions,
    transform,
  } = props;

  const isContextMenuOpenForThis = contextMenuTaskId === task.id;
  const isCommentCard = task.localDraftKind === 'comment';
  const cardElementRef = React.useRef<HTMLElement | null>(null);

  const handleMouseEnter = useCallback(() => {
    runTaskBarMouseEnter({
      cardElementRef,
      currentDurationParts,
      effectiveIsDragging,
      isCommentCard,
      isDraftTask,
      isLinking,
      isNarrowForLongHoverExpand,
      isResizing: resize.isResizing,
      longHoverTimeoutRef,
      onTaskHover,
      setHoverExpandFitDurationParts,
      setIsExpandedByLongHover,
      taskId: task.id,
      timelineTotalParts: hoverExpandTimelineTotalParts,
    });
  }, [
    currentDurationParts,
    effectiveIsDragging,
    hoverExpandTimelineTotalParts,
    isCommentCard,
    isDraftTask,
    isLinking,
    isNarrowForLongHoverExpand,
    longHoverTimeoutRef,
    onTaskHover,
    resize.isResizing,
    setHoverExpandFitDurationParts,
    setIsExpandedByLongHover,
    task.id,
  ]);

  const handleMouseLeave = useCallback(
    (e?: { relatedTarget: EventTarget | null }) => {
      buildTaskBarMouseLeaveHandler({
        effectiveIsDragging,
        isContextMenuOpenForThis,
        isResizing: resize.isResizing,
        longHoverTimeoutRef,
        onTaskHover,
        setIsExpandedByLongHover,
        taskId: task.id,
      })(e);
    },
    [
      effectiveIsDragging,
      isContextMenuOpenForThis,
      longHoverTimeoutRef,
      onTaskHover,
      resize.isResizing,
      setIsExpandedByLongHover,
      task.id,
    ]
  );

  return (
    <div
      className="task-bar-opacity-layer relative h-full min-h-0 w-full min-w-0 overflow-visible"
      style={{
        opacity: hideSourceForOverlay ? 0 : effectiveOpacity,
        transition: hideSourceForOverlay ? 'none' : 'opacity 0.2s ease',
        visibility: hideSourceForOverlay ? 'hidden' : 'visible',
      }}
      onMouseEnter={interactionDisabled ? undefined : handleMouseEnter}
      onMouseLeave={interactionDisabled ? undefined : handleMouseLeave}
    >
      {!hideSourceForOverlay && (
        <TaskBarDragSourceGhost
          cornerStyle={cornerStyle}
          enabled={effectiveIsDragging}
          transform={transform}
        />
      )}
      {quickAddSubmitting ? (
        <div
          aria-busy="true"
          aria-live="polite"
          className={`absolute inset-0 z-[2] flex items-center justify-center ${getQuickAddSubmittingOverlayRadiusClass(cornerStyle)} bg-white/70 dark:bg-gray-900/70`}
        >
          <Icon className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400" name="spinner" />
        </div>
      ) : null}
      <TaskBarOpacityLayerCard
        assigneeName={assigneeName}
        cardElementRef={cardElementRef}
        clickStartPos={clickStartPos}
        contentDurationParts={contentDurationParts}
        contentWidthPercent={contentWidthPercent}
        contextMenuTaskId={contextMenuTaskId}
        developers={developers}
        dimmedByContextMenuElsewhere={dimmedByContextMenuElsewhere}
        dragActivationProps={dragActivationProps}
        effectiveIsDragging={effectiveIsDragging}
        getPhotoClickSuppress={getPhotoClickSuppress}
        hideSourceForOverlay={hideSourceForOverlay}
        inlineTitleEditor={inlineTitleEditor}
        interactionDisabled={interactionDisabled}
        isDraftTask={isDraftTask}
        isLinking={isLinking}
        isNotificationFocused={isNotificationFocused}
        isQATask={isQATask}
        isSelected={isSelected}
        linkMode={linkMode}
        previewBorder={previewBorder}
        resize={resize}
        selectedSprintId={selectedSprintId}
        setClickStartPos={setClickStartPos}
        setNodeRef={setNodeRef}
        swimlaneBarDurationParts={swimlaneBarDurationParts}
        task={task}
        taskPositions={taskPositions}
        onClick={onClick}
        onCommentUpdate={onCommentUpdate}
        onContextMenu={onContextMenu}
        onPhotoClick={onPhotoClick}
        onPhotoGestureStart={onPhotoGestureStart}
      />
      <TaskBarOpacityLayerChrome
        cornerStyle={cornerStyle}
        disableResize={disableResize}
        effectiveIsDragging={effectiveIsDragging}
        errorTooltip={errorTooltip}
        hasQATaskInSwimlane={hasQATaskInSwimlane}
        interactionDisabled={interactionDisabled}
        isDraftTask={isDraftTask}
        isInError={isInError}
        isQATask={isQATask}
        isSelected={isSelected}
        resize={resize}
        showVerticalResize={props.showVerticalResize}
        swimlaneSegmentBadge={swimlaneSegmentBadge}
        swimlaneSegmentSecondary={swimlaneSegmentSecondary}
        task={task}
        verticalResize={props.verticalResize}
        onCreateQATask={onCreateQATask}
      />
      {children}
    </div>
  );
}
