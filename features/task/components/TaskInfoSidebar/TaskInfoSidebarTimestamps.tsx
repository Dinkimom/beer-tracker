'use client';

import type { Task } from '@/types';

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

  if (!line) {
    return null;
  }

  return <p className="mb-3 text-xs text-ds-text-muted">{line}</p>;
}
