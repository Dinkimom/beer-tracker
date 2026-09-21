import type { TrackerIssue } from '@/types/tracker';

import { apiCache, cacheKeys } from '@/lib/cache';

/** Активный спринт — короткий TTL (задачи могут добавляться в Tracker вне приложения). */
export const SPRINT_ISSUES_CACHE_TTL_ACTIVE_SEC = 60;
/** Архив / released — задачи в спринте не меняются. */
export const SPRINT_ISSUES_CACHE_TTL_ARCHIVED_SEC = 60 * 60;

export function isTrackerSprintIssuesFrozen(status: string | undefined): boolean {
  const s = (status ?? '').trim().toLowerCase();
  return s === 'archived' || s === 'released';
}

export function sprintIssuesCacheTtlSeconds(status: string | undefined): number {
  return isTrackerSprintIssuesFrozen(status)
    ? SPRINT_ISSUES_CACHE_TTL_ARCHIVED_SEC
    : SPRINT_ISSUES_CACHE_TTL_ACTIVE_SEC;
}

export function getCachedSprintIssues(sprintId: number): TrackerIssue[] | null {
  return apiCache.get<TrackerIssue[]>(cacheKeys.sprintIssues(sprintId));
}

export function setCachedSprintIssues(
  sprintId: number,
  issues: TrackerIssue[],
  status: string | undefined
): void {
  apiCache.set(cacheKeys.sprintIssues(sprintId), issues, sprintIssuesCacheTtlSeconds(status));
}

/** Сброс кэша задач спринта (кнопка «Обновить», смена состава спринта и т.п.). */
export function invalidateCachedSprintIssues(sprintId: number): void {
  apiCache.delete(cacheKeys.sprintIssues(sprintId));
}

function optionalEstimateValue(value: number | null | undefined): number | undefined {
  return value === null || value === undefined ? undefined : value;
}

function patchCachedSprintIssue(
  sprintId: number,
  issueKey: string,
  patch: (issue: TrackerIssue) => TrackerIssue
): void {
  const cached = getCachedSprintIssues(sprintId);
  if (!cached) return;

  let changed = false;
  const next = cached.map((issue) => {
    if (issue.key !== issueKey) return issue;
    changed = true;
    return patch(issue);
  });
  if (!changed) return;
  setCachedSprintIssues(sprintId, next, undefined);
}

function withPatchedEstimates(
  issue: TrackerIssue,
  estimates: { storyPoints?: number | null; testPoints?: number | null }
): TrackerIssue {
  const next = { ...issue };
  if (estimates.storyPoints !== undefined) {
    next.storyPoints = optionalEstimateValue(estimates.storyPoints);
  }
  if (estimates.testPoints !== undefined) {
    next.testPoints = optionalEstimateValue(estimates.testPoints);
  }
  return next;
}

/**
 * После PATCH оценки не ходим в search Tracker (индекс отстаёт) —
 * правим уже закэшированный снимок, чтобы ближайший refetch не откатил SP/TP.
 */
export function patchCachedSprintIssueEstimates(
  sprintId: number,
  issueKey: string,
  estimates: { storyPoints?: number | null; testPoints?: number | null }
): void {
  patchCachedSprintIssue(sprintId, issueKey, (issue) => withPatchedEstimates(issue, estimates));
}

/**
 * После перехода статуса search Tracker тоже отстаёт —
 * подменяем status в кэше, чтобы соседние вкладки не читали старый снимок.
 */
export function patchCachedSprintIssueStatus(
  sprintId: number,
  issueKey: string,
  patch: {
    status?: TrackerIssue['status'];
    statusType?: TrackerIssue['statusType'];
  }
): void {
  if (!patch.status && !patch.statusType) {
    return;
  }
  patchCachedSprintIssue(sprintId, issueKey, (issue) => ({
    ...issue,
    ...(patch.status ? { status: patch.status } : {}),
    ...(patch.statusType ? { statusType: patch.statusType } : {}),
  }));
}

/**
 * После смены родителя search Tracker и снимок в памяти отстают —
 * иначе после перезагрузки карточка попадает в «Без родителя», пока не истечёт TTL.
 */
export function patchCachedSprintIssueParent(
  sprintId: number,
  issueKey: string,
  parent: TrackerIssue['parent'] | null
): void {
  patchCachedSprintIssue(sprintId, issueKey, (issue) => {
    if (parent == null) {
      const next = { ...issue };
      delete next.parent;
      return next;
    }
    return { ...issue, parent };
  });
}

export function upsertCachedSprintIssue(sprintId: number, issue: TrackerIssue): void {
  const cached = getCachedSprintIssues(sprintId);
  if (!cached) {
    return;
  }
  const index = cached.findIndex((row) => row.key === issue.key);
  if (index < 0) {
    setCachedSprintIssues(sprintId, [...cached, issue], undefined);
    return;
  }
  const next = [...cached];
  next[index] = issue;
  setCachedSprintIssues(sprintId, next, undefined);
}

export function removeCachedSprintIssue(sprintId: number, issueKey: string): void {
  const cached = getCachedSprintIssues(sprintId);
  if (!cached) {
    return;
  }
  const next = cached.filter((issue) => issue.key !== issueKey);
  if (next.length === cached.length) {
    return;
  }
  setCachedSprintIssues(sprintId, next, undefined);
}
