import type { TrackerWebUrlContext } from '@/lib/issueTrackerProvider/issueTrackerUi';
/**
 * Утилиты для работы с задачами
 */
import type { SprintTaskCompletionRules } from '@/lib/sprints/sprintTaskCompletion';
import type { Task } from '@/types';

import {
  issueTrackerIssueWebUrlFromBase,
  issueTrackerQueueWebUrlFromBase,
} from '@/lib/issueTrackerProvider/issueTrackerUi';
import { isQaOnlyTask, resolveTaskPointsForTeam } from '@/lib/pointsUtils';
import { isTaskCompleted as isTaskCompletedByTracker } from '@/lib/sprints/sprintTaskCompletion';

/**
 * Задача «сделана» по правилу трекера ({@link isTaskCompletedByTracker}). Без правил организации
 * проверяется только тип статуса `done`, резолюция — когда правила переданы.
 */
export function isTaskCompleted(task: Task, rules?: SprintTaskCompletionRules | null): boolean {
  return isTaskCompletedByTracker(task, rules);
}

/**
 * Ключ задачи в Трекере для отображения и ссылок (учитывает синтетическую QA-строку).
 */
export function getTaskTrackerDisplayKey(task: Task): string {
  return String(task.originalTaskId ?? task.id);
}

/** Текст бейджа статуса: подпись трекера, иначе ключ. */
export function taskStatusLabel(task: {
  originalStatus?: string | null;
  originalStatusDisplay?: string | null;
}): string | undefined {
  return task.originalStatusDisplay?.trim() || task.originalStatus?.trim() || undefined;
}

/** URL задачи в трекере по ключу и web-base трекера организации (из URL API). */
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

// Единственная реализация — в pointsUtils; реэкспорт для существующих импортёров (features/qa, occupancy).
export { isQaOnlyTask };

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
