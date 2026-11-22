'use client';

import type { Developer, Task } from '@/types';

import { observer } from 'mobx-react-lite';

import { useCardContextMenu } from '@/features/context-menu/hooks/useCardContextMenu';
import { openCardContextMenu } from '@/features/context-menu/openCardContextMenu';
import { useSprintCardPresenceLocked } from '@/features/task/components/TaskCard/SprintCardPresenceContext';
import { TaskCard } from '@/features/task/components/TaskCard/TaskCard';
import { useRootStore } from '@/lib/layers';

import { useDraggableTask } from './hooks/useDraggableTask';

interface DraggableTaskProps {
  activeTaskDuration?: number | null;
  activeTaskId?: string | null;
  developers: Developer[];
  isQATask?: boolean;
  task: Task;
  viewMode?: 'compact' | 'full';
  onAutoAddToSwimlane?: (task: Task) => void;
}

// observer: меню карточки читается из стора (`useCardContextMenu`).
export const DraggableTask = observer(function DraggableTask({
  task,
  developers,
  isQATask,
  activeTaskId,
  activeTaskDuration,
  viewMode,
  onAutoAddToSwimlane,
}: DraggableTaskProps) {
  const presenceLocked = useSprintCardPresenceLocked(task.id);
  const contextMenu = useCardContextMenu(task.id);
  const { sprintPlannerUi } = useRootStore();
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
        dimmedByContextMenu={contextMenu.dimmed}
        isContextMenuOpen={contextMenu.open}
        isDragging={isDragging}
        isQATask={isQATask}
        style={style}
        task={task}
        variant="sidebar"
        widthPercent={widthPercent}
        onAutoAddToSwimlane={onAutoAddToSwimlane}
        onContextMenu={(e, menuTask) => openCardContextMenu(sprintPlannerUi, e, menuTask)}
        onMouseDown={handleMouseDown}
        {...(presenceLocked && !isDragging ? {} : listeners)}
        {...attributes}
      />
    </div>
  );
});
