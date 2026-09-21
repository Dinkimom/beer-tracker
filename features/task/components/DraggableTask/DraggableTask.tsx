'use client';

import type { SlaBugDemoteReason, SlaBugLabelKey } from '@/lib/slaBugs';
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
  sidebarWidth?: number;
  slaBugBoardId?: number | null;
  slaBugCloseP4ActionsEnabled?: boolean;
  slaBugDemoteReason?: SlaBugDemoteReason;
  slaBugSignalLabel?: SlaBugLabelKey;
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
  sidebarWidth,
  selectedSprintId,
  slaBugBoardId,
  slaBugCloseP4ActionsEnabled = false,
  slaBugDemoteReason,
  slaBugSignalLabel,
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
    sidebarWidth,
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
        slaBugBoardId={slaBugBoardId}
        slaBugCloseP4ActionsEnabled={slaBugCloseP4ActionsEnabled}
        slaBugDemoteReason={slaBugDemoteReason}
        slaBugSignalLabel={slaBugSignalLabel}
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
