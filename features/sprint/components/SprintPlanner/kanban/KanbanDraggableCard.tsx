'use client';

import type { Task, Developer } from '@/types';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useEffect, useState } from 'react';

import { useSprintCardPresenceLocked } from '@/features/task/components/TaskCard/SprintCardPresenceContext';
import { TaskCard } from '@/features/task/components/TaskCard/TaskCard';
import { useRootStore } from '@/lib/layers';
import { sprintCardPresenceBlocksNewGestures } from '@/lib/realtime/sprintCardPresence';

import { kanbanTaskId } from './kanbanDndUtils';

interface KanbanDraggableCardProps {
  contextMenuBlurOtherCards?: boolean;
  contextMenuTaskId?: string | null;
  developers: Developer[];
  task: Task;
  onContextMenu?: (e: React.MouseEvent, task: Task) => void;
  onTaskClick?: (taskId: string) => void;
}

export function KanbanDraggableCard({
  task,
  developers,
  contextMenuBlurOtherCards = false,
  contextMenuTaskId = null,
  onTaskClick,
  onContextMenu,
}: KanbanDraggableCardProps) {
  const presenceLocked = useSprintCardPresenceLocked(task.id);
  const { sprintPlannerUi } = useRootStore();
  const [ownDragActive, setOwnDragActive] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: kanbanTaskId(task.id),
    data: { task },
    disabled: sprintCardPresenceBlocksNewGestures(presenceLocked, ownDragActive),
  });

  useEffect(() => {
    setOwnDragActive(isDragging);
  }, [isDragging]);

  useEffect(() => {
    if (!isDragging) {
      return undefined;
    }
    sprintPlannerUi.setBoardDraggingTaskId(task.id);
    return () => {
      if (sprintPlannerUi.boardDraggingTaskId === task.id) {
        sprintPlannerUi.setBoardDraggingTaskId(null);
      }
    };
  }, [isDragging, sprintPlannerUi, task.id]);

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0 : 1,
  };

  const dimOthers =
    contextMenuBlurOtherCards &&
    contextMenuTaskId != null &&
    contextMenuTaskId !== task.id;
  const menuOpenHere = contextMenuTaskId === task.id;
  const blockNewGestures = sprintCardPresenceBlocksNewGestures(presenceLocked, isDragging);

  return (
    <div
      ref={setNodeRef}
      className={`${
        blockNewGestures ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'
      } rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset ${
        menuOpenHere ? 'overflow-visible relative z-20' : 'overflow-hidden'
      } ${
        dimOthers
          ? 'opacity-50 pointer-events-none transition-opacity duration-200'
          : ''
      }`}
      data-context-menu-source="task-card"
      style={style}
      {...(blockNewGestures ? {} : listeners)}
      {...attributes}
      onClick={() => {
        if (blockNewGestures) {
          return;
        }
        onTaskClick?.(task.id);
      }}
      onContextMenu={(e) => {
        if (blockNewGestures) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        onContextMenu?.(e, task);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (blockNewGestures) {
            return;
          }
          onTaskClick?.(task.id);
        }
      }}
      onMouseEnter={() => sprintPlannerUi.setHoveredTaskId(task.id)}
      onMouseLeave={() => {
        if (sprintPlannerUi.hoveredTaskId === task.id) {
          sprintPlannerUi.setHoveredTaskId(null);
        }
      }}
    >
      <TaskCard
        assigneeName={task.assigneeName}
        className="pointer-events-none"
        developers={developers}
        isContextMenuOpen={menuOpenHere}
        task={task}
        variant="sidebar"
      />
    </div>
  );
}
