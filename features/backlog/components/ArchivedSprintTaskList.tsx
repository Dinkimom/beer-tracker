'use client';

import type { Developer, Task } from '@/types';

import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import { DraggableTask } from '@/features/task/components/DraggableTask';

interface ArchivedSprintTaskListProps {
  developers: Developer[];
  isLoading: boolean;
  selectedSprintId: number;
  tasks: Task[];
}

export function ArchivedSprintTaskList({
  developers,
  isLoading,
  selectedSprintId,
  tasks,
}: ArchivedSprintTaskListProps) {
  const { t } = useI18n();

  if (isLoading) {
    return (
      <div className="px-3 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
        <Icon className="animate-spin h-4 w-4 mx-auto mb-2" name="spinner" />
        {t('backlog.archived.loadingTasks')}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="px-3 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
        {t('backlog.archived.noTasks')}
      </div>
    );
  }

  return (
    <div className="p-2 space-y-2 max-h-96 overflow-y-auto">
      {tasks.map((task) => (
        <DraggableTask
          key={task.id}
          developers={developers}
          selectedSprintId={selectedSprintId}
          task={task}
          viewMode="compact"
        />
      ))}
    </div>
  );
}
