'use client';

import type { Developer, Task } from '@/types';

import { useI18n } from '@/contexts/LanguageContext';
import { DraggableTask } from '@/features/task/components/DraggableTask';

interface BacklogColumnTaskListProps {
  developers: Developer[];
  loading: boolean;
  tasks: Task[];
}

export function BacklogColumnTaskList({ developers, loading, tasks }: BacklogColumnTaskListProps) {
  const { t } = useI18n();

  if (loading) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400 text-sm py-8">
        {t('backlog.column.loadingTasks')}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400 text-sm py-8">
        {t('backlog.column.empty')}
      </div>
    );
  }

  return (
    <>
      {tasks.map((task) => (
        <DraggableTask
          key={task.id}
          developers={developers}
          task={task}
          viewMode="compact"
        />
      ))}
    </>
  );
}
