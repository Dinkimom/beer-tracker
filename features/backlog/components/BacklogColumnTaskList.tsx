'use client';

import type { Developer, Task } from '@/types';

import { useI18n } from '@/contexts/LanguageContext';

import { BacklogShowMoreTasks } from './BacklogShowMoreTasks';
import { BacklogTaskRow } from './BacklogTaskRow';

interface BacklogColumnTaskListProps {
  developers: Developer[];
  emptyLabel?: string;
  hiddenCount: number;
  loading: boolean;
  tasks: readonly Task[];
  onShowMore: () => void;
}

export function BacklogColumnTaskList({
  developers,
  emptyLabel,
  hiddenCount,
  loading,
  tasks,
  onShowMore,
}: BacklogColumnTaskListProps) {
  const { t } = useI18n();

  if (loading) {
    return (
      <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
        {t('backlog.column.loadingTasks')}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
        {emptyLabel ?? t('backlog.column.empty')}
      </div>
    );
  }

  return (
    <div>
      <div className="divide-y divide-gray-100 dark:divide-gray-700">
        {tasks.map((task) => (
          <BacklogTaskRow key={task.id} developers={developers} scopeId="backlog" task={task} />
        ))}
      </div>
      <BacklogShowMoreTasks count={hiddenCount} onShowMore={onShowMore} />
    </div>
  );
}
