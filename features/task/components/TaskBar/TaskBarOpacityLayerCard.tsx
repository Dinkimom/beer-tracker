'use client';

import type { TaskCardProps, TaskCardSwimlaneProps } from '@/features/task/components/TaskCard/TaskCard';
import type { Task } from '@/types';
import type { DraggableAttributes } from '@dnd-kit/core';

import { observer } from 'mobx-react-lite';
import React, { useCallback } from 'react';

import { useCardContextMenu } from '@/features/context-menu/hooks/useCardContextMenu';
import { TaskCard } from '@/features/task/components/TaskCard/TaskCard';

import { buildTaskBarMouseUpHandler } from './taskBarOpacityLayerHandlers';
import { shouldOpenPhotoLightboxAfterPointerUp } from './taskBarPhotoGestureHelpers';

/** Поля `TaskCard`, которые карточка дорожки отдаёт как есть: слой их не читает. */
type TaskCardPassThrough = Pick<TaskCardProps, 'assigneeName' | 'developers' | 'swimlaneBarDurationParts' | 'widthPercent'> & {
  /** Режим связей и превью ресайза слой подставляет сам. */
  swimlane: Omit<TaskCardSwimlaneProps, 'linkingActive' | 'resizePreviewDuration'>;
};

/** Своё у слоя — поведение указателя: клик, жест фото, ресайз, перетаскивание, меню в режиме связей. */
export interface TaskBarOpacityLayerCardProps {
  cardElementRef: React.MutableRefObject<HTMLElement | null>;
  clickStartPos: { x: number; y: number } | null;
  dragActivationProps: DraggableAttributes;
  effectiveIsDragging: boolean;
  hideSourceForOverlay: boolean;
  interactionDisabled: boolean;
  isDraftTask: boolean;
  isLinking?: boolean;
  isQATask: boolean;
  resize: {
    isResizing: boolean;
    resizePreviewDuration: number | null;
  };
  setClickStartPos: React.Dispatch<React.SetStateAction<{ x: number; y: number } | null>>;
  task: Task;
  taskCard: TaskCardPassThrough;
  getPhotoClickSuppress?: () => boolean;
  onClick?: (taskId: string) => void;
  onContextMenu?: (e: React.MouseEvent, task: Task) => void;
  onPhotoGestureStart?: (clientX: number, clientY: number) => void;
  setNodeRef: (node: HTMLElement | null) => void;
}

// observer: меню карточки читается из стора (`useCardContextMenu`).
export const TaskBarOpacityLayerCard = observer(function TaskBarOpacityLayerCard({
  taskCard,
  cardElementRef,
  clickStartPos,
  dragActivationProps,
  effectiveIsDragging,
  hideSourceForOverlay,
  interactionDisabled,
  isDraftTask,
  isLinking = false,
  isQATask,
  onClick,
  onContextMenu,
  onPhotoGestureStart,
  getPhotoClickSuppress,
  resize,
  setClickStartPos,
  setNodeRef,
  task,
}: TaskBarOpacityLayerCardProps) {
  const contextMenu = useCardContextMenu(task.id);
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
      {...taskCard}
      className={`${interactionDisabled ? 'pointer-events-none ' : ''}relative z-[1]`}
      dimmedByContextMenu={contextMenu.dimmed}
      isContextMenuOpen={contextMenu.open}
      isDragging={hideSourceForOverlay ? false : effectiveIsDragging}
      isLocalTask={isDraftTask}
      isQATask={isQATask}
      isResizing={resize.isResizing}
      swimlane={{
        ...taskCard.swimlane,
        linkingActive: isLinking,
        resizePreviewDuration: resize.resizePreviewDuration,
      }}
      task={task}
      variant="swimlane"
      {...dragActivationProps}
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
});
