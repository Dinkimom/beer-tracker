'use client';

import type { Developer, Task } from '@/types';

import { useSprintCardPresenceLocked } from '@/features/task/components/TaskCard/SprintCardPresenceContext';
import { TaskCard } from '@/features/task/components/TaskCard/TaskCard';

import { useDraggableTask } from './hooks/useDraggableTask';

interface DraggableTaskProps {
  activeTaskDuration?: number | null;
  activeTaskId?: string | null;
  contextMenuBlurOtherCards?: boolean;
  contextMenuTaskId?: string | null;
  developers: Developer[];
  isQATask?: boolean;
  qaTasksMap?: Map<string, Task>;
  selectedSprintId?: number | null;
  task: Task;
  viewMode?: 'compact' | 'full';
  onAutoAddToSwimlane?: (task: Task) => void;
  onContextMenu?: (e: React.MouseEvent, task: Task) => void;
}

export function DraggableTask({
  task,
  developers,
  onContextMenu,
  isQATask,
  activeTaskId,
  activeTaskDuration,
  contextMenuBlurOtherCards = false,
  contextMenuTaskId = null,
  viewMode,
  selectedSprintId,
  onAutoAddToSwimlane,
}: DraggableTaskProps) {
  const presenceLocked = useSprintCardPresenceLocked(task.id);
  const {
    attributes,
    listeners,
    combinedRef,
    isDragging,
    style,
    widthPercent,
    handleMouseDown,
  } = useDraggableTask({
    taskId: task.id,
    activeTaskId,
    activeTaskDuration,
    viewMode,
  });

  return (
    <div
      style={isDragging ? {
        opacity: 0,
        pointerEvents: 'none',
      } : undefined}
    >
      <TaskCard
        ref={combinedRef}
        developers={developers}
        dimmedByContextMenu={
          contextMenuBlurOtherCards &&
          contextMenuTaskId != null &&
          contextMenuTaskId !== task.id
        }
        isContextMenuOpen={contextMenuTaskId === task.id}
        isDragging={isDragging}
        isQATask={isQATask}
        selectedSprintId={selectedSprintId}
        style={style}
        task={task}
        variant="sidebar"
        widthPercent={widthPercent}
        onAutoAddToSwimlane={onAutoAddToSwimlane}
        onContextMenu={onContextMenu}
        onMouseDown={handleMouseDown}
        {...(presenceLocked && !isDragging ? {} : listeners)}
        {...attributes}
      />
    </div>
  );
}
