/**
 * Утилиты для работы с задачами
 */

import type { TrackerWebUrlContext } from '@/lib/issueTrackerProvider/issueTrackerUi';
import type { Task } from '@/types';
import type { TaskStatus } from '@/utils/statusMapper';

import {
  issueTrackerIssueWebUrlFromBase,
  issueTrackerQueueWebUrlFromBase,
} from '@/lib/issueTrackerProvider/issueTrackerUi';
import { mapStatus } from '@/utils/statusMapper';

import { resolveTaskPointsForTeam } from './getTaskPointsHelpers';

/**
 * Задача в состоянии «готово» — та же логика, что в метриках спринта / раскраске статусов (см. isTaskDone).
 */
export function isTaskCompleted(task: Task): boolean {
  const effective: TaskStatus =
    task.status ?? mapStatus(task.originalStatus || '') ?? 'todo';
  return effective === 'done';
}

/**
 * Ключ задачи в Трекере для отображения и ссылок (учитывает синтетическую QA-строку).
 */
export function getTaskTrackerDisplayKey(task: Task): string {
  return String(task.originalTaskId ?? task.id);
}

/** URL задачи в трекере по ключу и web-base текущего инстанса (из TRACKER_API_URL). */
export function getTaskTrackerIssueUrl(task: Task, tracker: TrackerWebUrlContext): string {
  return getTrackerIssueUrlByKey(getTaskTrackerDisplayKey(task), tracker);
}

/** Web-URL задачи в трекере по ключу. */
export function getTrackerIssueUrlByKey(
  issueKey: string,
  tracker: TrackerWebUrlContext
): string {
  return issueTrackerIssueWebUrlFromBase(tracker.kind, tracker.webBaseUrl, issueKey);
}

/** Web-URL очереди/проекта в трекере по ключу. */
export function getTrackerQueueWebUrl(
  queueKey: string,
  tracker: TrackerWebUrlContext
): string {
  return issueTrackerQueueWebUrlFromBase(tracker.kind, tracker.webBaseUrl, queueKey);
}

/** URL merge request, если ссылка задана и валидна. */
export function getTaskMergeRequestUrl(task: Task): string | null {
  const raw = task.MergeRequestLink ?? task.mergeRequestLink;
  const trimmed = raw?.trim() ?? '';
  if (!trimmed) {
    return null;
  }
  return /^https?:\/\//i.test(trimmed) ? trimmed : null;
}

/**
 * Задача фактически является КУА-задачей: 0 СП и > 0 ТП.
 * Нет объёма разработки — только тестирование.
 * Такую задачу не нужно дублировать синтетической QA-задачей,
 * а фаза считается по ТП.
 */
export function isQaOnlyTask(task: Task): boolean {
  return (
    (!task.storyPoints || task.storyPoints === 0) &&
    task.testPoints != null &&
    task.testPoints > 0 &&
    task.team !== 'QA'
  );
}

/**
 * Задача "эффективно" является QA-задачей:
 * - либо команда явно QA,
 * - либо это чистая QA-задача по критерию 0 SP и > 0 TP.
 * Используем везде, где нужна логика "задача куа".
 */
export function isEffectivelyQaTask(task: Task): boolean {
  return task.team === 'QA' || task.testingOnlyByIntegrationRules === true || isQaOnlyTask(task);
}

/**
 * Получает длительность задачи в частях дня на основе storyPoints или testPoints
 * Для QA задач использует testPoints, для остальных - storyPoints
 */
export function getTaskPoints(task: Task): number {
  return resolveTaskPointsForTeam(task);
}
