'use client';

import type { Task } from '@/types';

import { StatusTag } from '@/components/StatusTag';
import { useI18n } from '@/contexts/LanguageContext';
import {
  buildTaskInfoTimestampsLine,
  formatTaskInfoDateTime,
} from '@/features/task/components/TaskInfoSidebar/taskInfoSidebarFormatters';

interface TaskInfoSidebarTimestampsProps {
  task: Task;
}

export function TaskInfoSidebarTimestamps({ task }: TaskInfoSidebarTimestampsProps) {
  const { language, t } = useI18n();
  const locale = language === 'en' ? 'en-US' : 'ru-RU';
  const relativeLabels = {
    todayAt: (time: string) => t('sprintPlanner.taskInfo.dateTodayAt', { time }),
    yesterdayAt: (time: string) => t('sprintPlanner.taskInfo.dateYesterdayAt', { time }),
  };

  const line = buildTaskInfoTimestampsLine(
    formatTaskInfoDateTime(task.createdAt, locale, relativeLabels),
    formatTaskInfoDateTime(task.updatedAt, locale, relativeLabels),
    t
  );
  const status = task.originalStatus?.trim() || null;

  if (!line && !status) {
    return null;
  }

  return (
    <div className="mb-1.5 flex min-w-0 flex-wrap items-center gap-2">
      {status ? (
        <StatusTag status={status} statusColorKey={task.statusColorKey} />
      ) : null}
      {line ? (
        <p className="min-w-0 text-sm text-gray-500 dark:text-gray-400">{line}</p>
      ) : null}
    </div>
  );
}
