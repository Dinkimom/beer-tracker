/**
 * Хук для операций с задачами: изменение статуса, перенос в спринт, удаление из спринта
 */

import type { Task, TaskLink, TaskPosition } from '@/types';

import { useTaskSprintOperations } from './useTaskOperations/hooks/useTaskSprintOperations';
import { useTaskStatusOperations } from './useTaskOperations/hooks/useTaskStatusOperations';

interface UseTaskOperationsProps {
  selectedSprintId: number | null;
  sprints: Array<{ id: number; name: string }>;
  taskLinks: TaskLink[];
  taskPositions: Map<string, TaskPosition>;
  tasks: Task[];
  deleteLink: (linkId: string) => Promise<void>;
  deletePosition: (taskId: string) => Promise<void>;
  onTasksReload?: () => Promise<void> | void;
  setTaskLinks: (updater: (prev: TaskLink[]) => TaskLink[]) => void;
  setTaskPositions: (updater: (prev: Map<string, TaskPosition>) => Map<string, TaskPosition>) => void;
  setTasks: (updater: (prev: Task[]) => Task[]) => void;
  updateXarrow?: () => void;
}

/**
 * Хук для выполнения операций с задачами
 */
export function useTaskOperations({
  tasks,
  taskPositions,
  taskLinks,
  selectedSprintId,
  sprints,
  setTasks,
  setTaskPositions,
  setTaskLinks,
  deletePosition,
  deleteLink,
  onTasksReload,
  updateXarrow,
}: UseTaskOperationsProps) {
  const statusOperations = useTaskStatusOperations({
    tasks,
    setTasks,
  });

  const sprintOperations = useTaskSprintOperations({
    tasks,
    taskPositions,
    taskLinks,
    selectedSprintId,
    sprints,
    setTasks,
    setTaskPositions,
    setTaskLinks,
    deletePosition,
    deleteLink,
    onTasksReload,
    updateXarrow,
  });

  return {
    changeStatus: statusOperations.changeStatus,
    moveToSprint: sprintOperations.moveToSprint,
    removeFromSprint: sprintOperations.removeFromSprint,
  };
}

