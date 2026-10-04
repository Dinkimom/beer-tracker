'use client';

import type { Developer, Task } from '@/types';

import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';

import { useBacklogTaskPreview } from '../hooks/useBacklogTaskPreview';

import { BacklogShowMoreTasks } from './BacklogShowMoreTasks';
import { BacklogTaskRow } from './BacklogTaskRow';

interface ArchivedSprintTaskListProps {
  developers: Developer[];
  isLoading: boolean;
  tasks: Task[];
}

export function ArchivedSprintTaskList({
  developers,
  isLoading,
  tasks,
}: ArchivedSprintTaskListProps) {
  const { t } = useI18n();
  const { hiddenCount, shownTasks, onShowMore } = useBacklogTaskPreview(tasks, 'archived');

  if (isLoading) {
    return (
      <div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
        <Icon className="mx-auto mb-2 h-4 w-4 animate-spin" name="spinner" />
        {t('backlog.archived.loadingTasks')}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
        {t('backlog.archived.noTasks')}
      </div>
    );
  }

  return (
    <div>
      <div className="divide-y divide-gray-100 dark:divide-gray-700">
        {shownTasks.map((task) => (
          <BacklogTaskRow key={task.id} developers={developers} task={task} />
        ))}
      </div>
      <BacklogShowMoreTasks count={hiddenCount} onShowMore={onShowMore} />
    </div>
  );
}
