'use client';

import type { Task } from '@/types';

import { useI18n } from '@/contexts/LanguageContext';
import { TaskInfoSidebarDescriptionField } from '@/features/task/components/TaskInfoSidebar/TaskInfoSidebarDescriptionField';
import { TaskInfoSidebarHeader } from '@/features/task/components/TaskInfoSidebar/TaskInfoSidebarHeader';
import { TaskInfoSidebarTimestamps } from '@/features/task/components/TaskInfoSidebar/TaskInfoSidebarTimestamps';
import { TaskInfoSidebarTitleField } from '@/features/task/components/TaskInfoSidebar/TaskInfoSidebarTitleField';
import { TaskInfoSidebarTransitions } from '@/features/task/components/TaskInfoSidebar/TaskInfoSidebarTransitions';
import { useTaskInfoSidebarDetailTask } from '@/features/task/components/TaskInfoSidebar/useTaskInfoSidebarDetailTask';

interface TaskInfoSidebarPanelProps {
  task: Task;
  onClose: () => void;
  onFieldsSaved?: (fields: { description?: string; name?: string }) => void;
  onStatusChange?: (
    taskId: string,
    transitionId: string,
    targetStatusKey?: string,
    targetStatusDisplay?: string,
    screenId?: string
  ) => Promise<void>;
}

export function TaskInfoSidebarPanel({
  task,
  onClose,
  onFieldsSaved,
  onStatusChange,
}: TaskInfoSidebarPanelProps) {
  const { t } = useI18n();
  const { applySavedFields, isDescriptionLoading, task: detailTask } =
    useTaskInfoSidebarDetailTask(task);

  const handleFieldsSaved = (fields: { description?: string; name?: string }) => {
    applySavedFields(fields);
    onFieldsSaved?.(fields);
  };

  return (
    <aside
      aria-label={t('sprintPlanner.taskInfo.title')}
      className="flex h-full w-full flex-col bg-white dark:bg-gray-800"
    >
      <TaskInfoSidebarHeader task={detailTask} onClose={onClose} />

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <TaskInfoSidebarTimestamps task={detailTask} />
        <TaskInfoSidebarTitleField task={detailTask} onFieldsSaved={handleFieldsSaved} />

        <TaskInfoSidebarTransitions task={detailTask} onStatusChange={onStatusChange} />

        <TaskInfoSidebarDescriptionField
          isDescriptionLoading={isDescriptionLoading}
          task={detailTask}
          onFieldsSaved={handleFieldsSaved}
        />
      </div>
    </aside>
  );
}
