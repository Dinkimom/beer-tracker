/**
 * Типы для useSprintPlannerHandlers (вынесены для уменьшения размера основного хука).
 */

import type { useSprintPlannerState } from './useSprintPlannerState';
import type { useSprintPlannerTimeline } from './useSprintPlannerTimeline';
import type { DevelopersManagement } from '@/features/sprint/hooks/useDevelopersManagement';
import type { TransitionField } from '@/lib/beerTrackerApi';
import type { Task, TaskPosition } from '@/types';
import type { MutableRefObject } from 'react';

export interface UseSprintPlannerHandlersProps {
  /** Доска, какой её видит пользователь: задачи, позиции и карта задач вместе с заметками, видимые связи. */
  boardView: {
    allTasksForDrag: Task[];
    filteredTaskLinks: Array<{ fromTaskId: string; toTaskId: string; id: string }>;
    filteredTaskPositions: Map<string, TaskPosition>;
    tasksMap: Map<string, Task>;
  };
  developersManagement: DevelopersManagement;
  qaTaskManagement?: {
    createQATask: (
      devTaskId: string,
      qaTasksMap: Map<string, Task>,
      tasks: Task[]
    ) => void;
  };
  /** Синхронизируется из `useDragAndDrop` в `SprintPlanner` (после монтирования хука). */
  resetDragStateRef: MutableRefObject<(() => void) | null>;
  selectedSprintId: number | null;
  /** Сырые данные доски из `useSprintPlannerState` — эти поля хук получает без подмен. */
  state: Pick<ReturnType<typeof useSprintPlannerState>, 'board'>;
  taskOperations: {
    changeStatus: (
      taskId: string,
      transitionId: string,
      targetStatusKey?: string
    ) => Promise<void>;
    moveToSprint: (taskId: string, sprintId: number) => Promise<void>;
    removeFromSprint: (taskId: string) => Promise<void>;
  };
  timeline: Pick<ReturnType<typeof useSprintPlannerTimeline>, 'sprintStartDate' | 'sprintTimelineWorkingDays'>;
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
  /** Удаление оверлея Tracker/Jira (`tracker:{id}`). */
  deleteTrackerOverlayLink?: (link: {
    fromTaskId: string;
    id: string;
    toTaskId: string;
  }) => Promise<void>;
  /** Кнопка + QA на dev-карточке без qaEngineer — открыть пикер исполнителя QA */
  onRequestQaEngineerPicker?: (devTaskId: string, anchorRect: DOMRect) => void;
  onTasksReload?: (options?: { showToast?: boolean }) => void;
}
