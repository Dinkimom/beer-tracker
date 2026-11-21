'use client';

import type { Developer, Task, TaskPosition } from '@/types';
import type { DraggableAttributes } from '@dnd-kit/core';

import React, { useCallback } from 'react';

import { useSwimlaneCardContextMenu } from '@/features/swimlane/SwimlaneBoardContext';
import { TaskCard } from '@/features/task/components/TaskCard/TaskCard';

import { buildTaskBarMouseUpHandler } from './taskBarOpacityLayerHandlers';
import { shouldOpenPhotoLightboxAfterPointerUp } from './taskBarPhotoGestureHelpers';

export interface TaskBarOpacityLayerCardProps {
  assigneeName?: string;
  cardElementRef: React.MutableRefObject<HTMLElement | null>;
  clickStartPos: { x: number; y: number } | null;
  contentDurationParts: number;
  contentWidthPercent: number;
  developers: Developer[];
  dragActivationProps: DraggableAttributes;
  effectiveIsDragging: boolean;
  hideSourceForOverlay: boolean;
  inlineTitleEditor?: {
    onChange: (value: string) => void;
    onSubmit?: () => void;
    value: string;
  };
  interactionDisabled: boolean;
  isDraftTask: boolean;
  isLinking?: boolean;
  isNotificationFocused?: boolean;
  isQATask: boolean;
  isSelected: boolean;
  linkMode?: 'source' | 'target' | null;
  resize: {
    isResizing: boolean;
    resizePreviewDuration: number | null;
  };
  selectedSprintId?: number | null;
  setClickStartPos: React.Dispatch<React.SetStateAction<{ x: number; y: number } | null>>;
  swimlaneBarDurationParts?: number;
  task: Task;
  taskPositions?: Map<string, TaskPosition>;
  getPhotoClickSuppress?: () => boolean;
  onClick?: (taskId: string) => void;
  onCommentUpdate?: (commentId: string, text: string) => void;
  onContextMenu?: (e: React.MouseEvent, task: Task) => void;
  onPhotoClick?: () => void;
  onPhotoGestureStart?: (clientX: number, clientY: number) => void;
  setNodeRef: (node: HTMLElement | null) => void;
}

export function TaskBarOpacityLayerCard({
  assigneeName,
  cardElementRef,
  clickStartPos,
  contentDurationParts,
  contentWidthPercent,
  developers,
  dragActivationProps,
  effectiveIsDragging,
  hideSourceForOverlay,
  inlineTitleEditor,
  interactionDisabled,
  isDraftTask,
  isLinking = false,
  linkMode = null,
  isNotificationFocused = false,
  isQATask,
  isSelected,
  onClick,
  onContextMenu,
  onPhotoClick,
  onCommentUpdate,
  onPhotoGestureStart,
  getPhotoClickSuppress,
  resize,
  selectedSprintId,
  setClickStartPos,
  setNodeRef,
  swimlaneBarDurationParts,
  task,
  taskPositions,
}: TaskBarOpacityLayerCardProps) {
  const contextMenu = useSwimlaneCardContextMenu(task.id);
  const mergedCardRef = useCallback(
    (node: HTMLDivElement | null) => {
      cardElementRef.current = node;
      setNodeRef(node);
    },
    [cardElementRef, setNodeRef]
  );

  return (
    <TaskCard
      ref={mergedCardRef}
      assigneeName={assigneeName}
      className={`${interactionDisabled ? 'pointer-events-none ' : ''}relative z-[1]`}
      developers={developers}
      dimmedByContextMenu={contextMenu.dimmed}
      inlineTitleEditor={inlineTitleEditor}
      isContextMenuOpen={contextMenu.open}
      isDragging={hideSourceForOverlay ? false : effectiveIsDragging}
      isLocalTask={isDraftTask}
      isNotificationFocused={isNotificationFocused}
      isQATask={isQATask}
      isResizing={resize.isResizing}
      isSelected={isSelected}
      layoutDuration={contentDurationParts}
      linkMode={linkMode}
      linkingActive={isLinking}
      resizePreviewDuration={resize.resizePreviewDuration}
      swimlaneBarDurationParts={swimlaneBarDurationParts}
      task={task}
      taskPosition={taskPositions?.get(task.id)}
      variant="swimlane"
      widthPercent={contentWidthPercent}
      onCommentUpdate={onCommentUpdate}
      onPhotoClick={onPhotoClick}
      {...dragActivationProps}
      selectedSprintId={selectedSprintId}
      onContextMenu={
        interactionDisabled || isLinking
          ? (e) => {
              e.preventDefault();
              e.stopPropagation();
            }
          : onContextMenu
      }
      onMouseDown={(e) => {
        if (!resize.isResizing) {
          if (!isLinking) {
            onPhotoGestureStart?.(e.clientX, e.clientY);
          }
          setClickStartPos({ x: e.clientX, y: e.clientY });
        }
      }}
      onMouseUp={buildTaskBarMouseUpHandler({
        clickStartPos,
        effectiveIsDragging,
        isResizing: resize.isResizing,
        onClick,
        setClickStartPos,
        shouldHandleClick: getPhotoClickSuppress
          ? (params) =>
              shouldOpenPhotoLightboxAfterPointerUp({
                ...params,
                suppressOpen: getPhotoClickSuppress(),
              })
          : undefined,
        taskId: task.id,
      })}
    />
  );
}
