/**
 * Типы для useSprintPlannerHandlers (вынесены для уменьшения размера основного хука).
 */

import type { TransitionField } from '@/lib/beerTrackerApi';
import type { Comment, Developer, Task, TaskPosition } from '@/types';
import type { MutableRefObject } from 'react';

export interface UseSprintPlannerHandlersProps {
  allTasksForDrag: Task[];
  backlogTaskRef: React.MutableRefObject<{
    getTask: (taskId: string) => Task | undefined;
    removeTask: (taskId: string) => void;
  } | null>;
  developersManagement: {
    handleDragEnd: (activeId: string, overId: string) => void;
    sortedDevelopers: Developer[];
  };
  filteredTaskLinks: Array<{ fromTaskId: string; toTaskId: string; id: string }>;
  filteredTaskPositions: Map<string, TaskPosition>;
  qaTaskManagement?: {
    createQATask: (
      devTaskId: string,
      qaTasksMap: Map<string, Task>,
      tasks: Task[]
    ) => void;
  };
  qaTasksByOriginalId: Map<string, Task>;
  qaTasksMap: Map<string, Task>;
  /** Синхронизируется из `useDragAndDrop` в `SprintPlanner` (после монтирования хука). */
  resetDragStateRef: MutableRefObject<(() => void) | null>;
  selectedSprintId: number | null;
  /** Открытые SLA-баги вкладки «Баги» (для DnD и дропа на свимлейн). */
  slaBugsTasks?: Task[];
  sprintStartDate: Date;
  sprintTimelineWorkingDays: number;
  taskLinks: Array<{ fromTaskId: string; id: string; toTaskId: string }>;
  taskOperations: {
    changeStatus: (
      taskId: string,
      transitionId: string,
      targetStatusKey?: string
    ) => Promise<void>;
    moveToSprint: (taskId: string, sprintId: number) => Promise<void>;
    removeFromSprint: (taskId: string) => Promise<void>;
  };
  taskPositions: Map<string, TaskPosition>;
  tasks: Task[];
  tasksMap: Map<string, Task>;
  workflowScreens?: Record<string, Record<string, TransitionField[]>>;
  confirm: (
    message: string,
    options?: {
      title?: string;
      confirmText?: string;
      cancelText?: string;
      variant?: 'default' | 'destructive';
    }
  ) => Promise<boolean>;
  debouncedUpdateXarrow: () => void;
  deleteComment: (commentId: string) => Promise<void>;
  deleteLink: (linkId: string) => Promise<void>;
  deletePosition: (taskId: string, options?: { recordHistory?: boolean }) => Promise<void>;
  /** Кнопка + QA на dev-карточке без qaEngineer — открыть пикер исполнителя QA */
  onRequestQaEngineerPicker?: (devTaskId: string, anchorRect: DOMRect) => void;
  onTasksReload?: (options?: { showToast?: boolean }) => void;
  saveLink: (link: {
    fromTaskId: string;
    toTaskId: string;
    id: string;
  }) => Promise<void>;
  savePosition: (
    position: TaskPosition,
    isQa: boolean,
    devTaskKey?: string,
    immediate?: boolean,
    options?: { recordHistory?: boolean }
  ) => Promise<void>;
  setComments: (updater: (prev: Comment[]) => Comment[]) => void;
  setSidebarOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  setTaskLinks: (
    updater: (
      prev: Array<{ fromTaskId: string; toTaskId: string; id: string }>
    ) => Array<{ fromTaskId: string; toTaskId: string; id: string }>
  ) => void;
  setTaskPositions: (
    updater: (
      prev: Map<string, TaskPosition>
    ) => Map<string, TaskPosition>,
    options?: { recordHistory?: boolean }
  ) => void;
  setTasks: (updater: (prev: Task[]) => Task[]) => void;
}
