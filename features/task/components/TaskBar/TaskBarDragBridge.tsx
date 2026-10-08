'use client';

import type { ReactNode } from 'react';

import { useDraggable, type DraggableAttributes, type DraggableSyntheticListeners } from '@dnd-kit/core';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { SWIMLANE_TASK_DRAG_DATA_KIND } from '@/features/swimlane/utils/swimlaneDragIds';
import { useSprintCardPresenceLocked } from '@/features/task/components/TaskCard/SprintCardPresenceContext';
import { isOnboardingSampleTaskId } from '@/lib/plannerOnboarding/onboardingDemoLane';
import { sprintCardPresenceBlocksNewGestures } from '@/lib/realtime/sprintCardPresence';

/**
 * Сдвиг курсора живёт только здесь. Тяжёлая карточка читает стабильный bind
 * и не перерисовывается на каждом pointermove.
 */
interface TaskBarDragBind {
  attributes: DraggableAttributes;
  isDragging: boolean;
  listeners: DraggableSyntheticListeners;
  transform: null;
  setNodeRef: (element: HTMLElement | null) => void;
}

const TaskBarDragContext = createContext<TaskBarDragBind | null>(null);

export function useTaskBarDragBind(): TaskBarDragBind {
  const bind = useContext(TaskBarDragContext);
  if (!bind) {
    throw new Error('TaskBar must render inside TaskBarDragBridge');
  }
  return bind;
}

interface TaskBarDragBridgeProps {
  children: ReactNode;
  draggableId: string;
  interactionDisabled: boolean;
  taskId: string;
}

export function TaskBarDragBridge({
  children,
  draggableId,
  interactionDisabled,
  taskId,
}: TaskBarDragBridgeProps) {
  const [ownDragActive, setOwnDragActive] = useState(false);
  const presenceLocked = useSprintCardPresenceLocked(taskId);
  const { attributes, isDragging, listeners, setNodeRef } = useDraggable({
    id: draggableId,
    disabled:
      interactionDisabled ||
      sprintCardPresenceBlocksNewGestures(presenceLocked, ownDragActive) ||
      isOnboardingSampleTaskId(taskId),
    data: { kind: SWIMLANE_TASK_DRAG_DATA_KIND },
  });

  useEffect(() => {
    setOwnDragActive(isDragging);
  }, [isDragging]);

  const bind = useMemo<TaskBarDragBind>(
    () => ({
      attributes,
      isDragging,
      listeners,
      setNodeRef,
      transform: null,
    }),
    [attributes, isDragging, listeners, setNodeRef]
  );

  return <TaskBarDragContext.Provider value={bind}>{children}</TaskBarDragContext.Provider>;
}
