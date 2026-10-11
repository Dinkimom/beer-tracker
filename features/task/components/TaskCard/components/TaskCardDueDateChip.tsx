'use client';

import type { Task } from '@/types';

import { createContext, useContext } from 'react';

import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import { isTaskCompleted } from '@/features/task/utils/taskUtils';

import { resolveTaskCardDueDate } from './taskCardDueDate';

/** Включён на карточках канбана: без провайдера плашка срока не рисуется. */
export const TaskCardDueDateContext = createContext(false);

function dueDateChipClassName(overdue: boolean): string {
  const tone = overdue
    ? 'border-red-600 text-red-600 dark:border-red-400 dark:text-red-400'
    : 'border-gray-300 text-gray-800 dark:border-white/25 dark:text-gray-200';
  return `mt-2 inline-flex shrink-0 items-center gap-1 self-start whitespace-nowrap rounded border px-1.5 py-0.5 text-xs leading-4 ${tone}`;
}

export function TaskCardDueDateChip({ task }: { task: Task }) {
  const enabled = useContext(TaskCardDueDateContext);
  const { language, t } = useI18n();
  if (!enabled) {
    return null;
  }

  const due = resolveTaskCardDueDate(task.deadline, {
    completed: isTaskCompleted(task),
    language,
  });
  if (!due) {
    return null;
  }

  const ariaLabel = t(
    due.overdue ? 'sprintPlanner.kanban.dueDateOverdue' : 'sprintPlanner.kanban.dueDate',
    { date: due.label }
  );

  return (
    <span
      aria-label={ariaLabel}
      className={dueDateChipClassName(due.overdue)}
      data-due-state={due.overdue ? 'overdue' : 'scheduled'}
    >
      <span aria-hidden="true" className="inline-flex">
        <Icon className="h-3.5 w-3.5 shrink-0" name={due.overdue ? 'alert-triangle' : 'calendar'} />
      </span>
      {due.label}
    </span>
  );
}
