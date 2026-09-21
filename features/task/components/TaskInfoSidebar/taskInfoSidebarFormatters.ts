import type { TrackerWebUrlContext } from '@/lib/issueTrackerProvider/issueTrackerUi';
import type { Task } from '@/types';

import {
  getTrackerIssueUrlByKey,
  getTrackerQueueWebUrl,
} from '@/features/task/utils/taskUtils';

interface TaskInfoRelativeDateLabels {
  todayAt: (time: string) => string;
  yesterdayAt: (time: string) => string;
}

function startOfLocalDayMs(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function formatTaskInfoClockTime(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
}

/** Абсолютный фрагмент: `03 июл, 14:00` / `03 Jul, 14:00`. */
export function formatTaskInfoAbsoluteDateTime(date: Date, locale: string): string {
  const parts = new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const day = parts.find((part) => part.type === 'day')?.value ?? '';
  let month = parts.find((part) => part.type === 'month')?.value ?? '';
  month = month.replace(/\./g, '').trim();
  if (locale.toLowerCase().startsWith('ru')) {
    month = month.toLowerCase();
  }
  const time = formatTaskInfoClockTime(date, locale);
  return `${day} ${month}, ${time}`;
}

/**
 * Дата для строки «Создано … / обновлено …»:
 * сегодня → «сегодня в 15:16», вчера → «вчера в 15:16», иначе абсолютный формат.
 */
export function formatTaskInfoDateTime(
  value: string | null | undefined,
  locale: string,
  labels: TaskInfoRelativeDateLabels,
  now: Date = new Date()
): string | null {
  if (!value?.trim()) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const dayDiff = Math.round(
    (startOfLocalDayMs(date) - startOfLocalDayMs(now)) / (24 * 60 * 60 * 1000)
  );
  const time = formatTaskInfoClockTime(date, locale);
  if (dayDiff === 0) {
    return labels.todayAt(time);
  }
  if (dayDiff === -1) {
    return labels.yesterdayAt(time);
  }
  return formatTaskInfoAbsoluteDateTime(date, locale);
}

export function buildTaskInfoTimestampsLine(
  createdLabel: string | null,
  updatedLabel: string | null,
  t: (key: string, params?: Record<string, number | string>) => string
): string | null {
  const parts = [
    createdLabel ? t('sprintPlanner.taskInfo.createdAt', { date: createdLabel }) : null,
    updatedLabel ? t('sprintPlanner.taskInfo.updatedAt', { date: updatedLabel }) : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : null;
}

interface TaskInfoBreadcrumbParent {
  key: string;
  label: string;
  url: string;
}

interface TaskInfoBreadcrumbParts {
  parent: TaskInfoBreadcrumbParent | null;
  queueKey: string | null;
  queueLabel: string | null;
  queueUrl: string | null;
}

/** Ключ очереди из поля задачи или из ключа issue (`DEV-948` → `DEV`). */
export function resolveTaskInfoQueueKey(task: Task, issueKey: string): string | null {
  const fromField = task.trackerQueue?.trim();
  if (fromField) {
    return fromField;
  }
  const match = issueKey.trim().match(/^(.+)-(\d+)$/);
  const fromKey = match?.[1]?.trim();
  return fromKey || null;
}

function resolveTaskParentWebUrl(
  parent: NonNullable<Task['parent']>,
  tracker: TrackerWebUrlContext
): string {
  return getTrackerIssueUrlByKey(parent.key.trim(), tracker);
}

function resolveTaskInfoBreadcrumbParent(
  task: Task,
  tracker: TrackerWebUrlContext
): TaskInfoBreadcrumbParent | null {
  const parent = task.parent ?? task.epic;
  if (!parent) {
    return null;
  }
  const key = parent.key?.trim();
  if (!key) {
    return null;
  }
  const label = parent.display?.trim() || key;
  return { key, label, url: resolveTaskParentWebUrl(parent, tracker) };
}

export function resolveTaskInfoBreadcrumbParts(
  task: Task,
  issueKey: string,
  tracker: TrackerWebUrlContext
): TaskInfoBreadcrumbParts {
  const queueKey = resolveTaskInfoQueueKey(task, issueKey);
  const queueName = task.trackerQueueName?.trim() || null;
  const queueLabel = queueName || queueKey;
  return {
    queueKey,
    queueLabel,
    queueUrl: queueKey ? getTrackerQueueWebUrl(queueKey, tracker) : null,
    parent: resolveTaskInfoBreadcrumbParent(task, tracker),
  };
}

/** @deprecated Используйте resolveTaskInfoBreadcrumbParts */
export function resolveTaskInfoBreadcrumb(task: Task): string | null {
  const parent = task.parent ?? task.epic;
  if (!parent) {
    return null;
  }
  return parent.display?.trim() || parent.key?.trim() || null;
}
