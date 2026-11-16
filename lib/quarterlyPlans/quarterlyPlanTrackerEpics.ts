/**
 * Привязанные эпики трекера для квартального плана: название и статус (QE5, QE7).
 * Как у задач: сначала снимок в базе, иначе трекер; в плане хранится только ключ.
 */

import type { QuarterlyPlanTrackerEpic } from './quarterlyPlanTypes';
import type { IssueTrackerProviderClient } from '@/lib/issueTrackerProvider/types';
import type { SprintTaskCompletionRules } from '@/lib/sprints/sprintTaskCompletion';
import type { Task } from '@/types';

import { apiCache } from '@/lib/cache';
import { issueTrackerClientWebContext } from '@/lib/issueTrackerProvider/types';
import { findIssueSnapshotMetaByKeys } from '@/lib/snapshots/issueSnapshotReadDb';
import { loadSprintTaskCompletionRules } from '@/lib/sprints/loadSprintTaskCompletionRules';
import { isTaskCompleted } from '@/lib/sprints/sprintTaskCompletion';
import { mapTrackerIssueToTask } from '@/lib/trackerApi/issues';
import { loadTrackerIntegrationForOrganization } from '@/lib/trackerIntegration/loadForOrganization';

/** Эпика нет в снимках — спрашиваем трекер не чаще раза в 10 минут. */
const TRACKER_EPIC_CACHE_TTL_SECONDS = 10 * 60;
/**
 * Сколько после смены статуса с доски квартала строка читается из трекера, минуя снимок: снимок обновит
 * только следующая синхронизация, а до неё показывал бы прежний статус.
 */
const TRACKER_EPIC_CHANGED_TTL_SECONDS = 60 * 60;
const epicCacheKey = (organizationId: string, issueKey: string) => `quarterly-plan:tracker-epic:${organizationId}:${issueKey}`;
const changedCacheKey = (organizationId: string, issueKey: string) =>
  `quarterly-plan:tracker-epic-changed:${organizationId}:${issueKey}`;

/** Статус задачи только что сменили: её строка плана читается из трекера заново (QE7). */
export function markTrackerEpicChanged(organizationId: string, issueKey: string): void {
  apiCache.delete(epicCacheKey(organizationId, issueKey));
  apiCache.set(changedCacheKey(organizationId, issueKey), true, TRACKER_EPIC_CHANGED_TTL_SECONDS);
}

/** Сколько эпиков спрашиваем у трекера одновременно. */
const TRACKER_FETCH_CONCURRENCY = 8;

/** Задача трекера → то, что план показывает у привязанной строки. */
export function trackerEpicFromTask(task: Task, rules: SprintTaskCompletionRules): QuarterlyPlanTrackerEpic {
  const status = task.originalStatus ?? '';
  return {
    done: isTaskCompleted(task, rules),
    ...(task.statusColorKey || status ? { statusColorKey: task.statusColorKey || status } : {}),
    statusDisplay: task.originalStatusDisplay?.trim() || status,
    title: task.name,
  };
}

async function tasksFromTracker(
  issueTracker: IssueTrackerProviderClient,
  issueKeys: readonly string[],
  integration: Awaited<ReturnType<typeof loadTrackerIntegrationForOrganization>>,
  organizationId: string
): Promise<Map<string, Task>> {
  const tasks = new Map<string, Task>();
  const cacheKey = (key: string) => epicCacheKey(organizationId, key);
  const missing = issueKeys.filter((key) => {
    const cached = apiCache.get<Task>(cacheKey(key));
    if (cached) tasks.set(key, cached);
    return !cached;
  });
  for (let offset = 0; offset < missing.length; offset += TRACKER_FETCH_CONCURRENCY) {
    const chunk = missing.slice(offset, offset + TRACKER_FETCH_CONCURRENCY);
    const fetched = await Promise.all(
      chunk.map((key) =>
        issueTracker.getIssue(key).catch((error: unknown) => {
          console.warn(`[quarterly-plan] getIssue(${key}):`, error);
          return null;
        })
      )
    );
    fetched.forEach((issue, index) => {
      if (!issue) return;
      const task = issueTracker.mapIssueToTask(issue, integration);
      apiCache.set(cacheKey(chunk[index]!), task, TRACKER_EPIC_CACHE_TTL_SECONDS);
      tasks.set(chunk[index]!, task);
    });
  }
  return tasks;
}

/** Эпики по ключу; ключ, который не нашёлся ни в снимках, ни в трекере, в ответ не попадает. */
export async function loadQuarterlyPlanTrackerEpics(input: {
  issueKeys: readonly string[];
  issueTracker: IssueTrackerProviderClient;
  organizationId: string;
}): Promise<Record<string, QuarterlyPlanTrackerEpic>> {
  const issueKeys = [...new Set(input.issueKeys)];
  if (issueKeys.length === 0) return {};
  const { issueTracker, organizationId } = input;
  const [integration, rules, snapshots] = await Promise.all([
    loadTrackerIntegrationForOrganization(organizationId),
    loadSprintTaskCompletionRules(organizationId, issueTracker),
    findIssueSnapshotMetaByKeys(organizationId, issueKeys),
  ]);
  const web = issueTrackerClientWebContext(issueTracker);
  // Строку с только что сменённым статусом снимок ещё не знает — её читаем из трекера.
  const fresh = snapshots.filter((issue) => !apiCache.get<boolean>(changedCacheKey(organizationId, issue.key)));
  const tasks = new Map(fresh.map((issue) => [issue.key, mapTrackerIssueToTask(issue, web, integration)]));
  const fromTracker = await tasksFromTracker(
    issueTracker,
    issueKeys.filter((key) => !tasks.has(key)),
    integration,
    organizationId
  );
  return Object.fromEntries(
    [...tasks, ...fromTracker].map(([key, task]) => [key, trackerEpicFromTask(task, rules)])
  );
}
