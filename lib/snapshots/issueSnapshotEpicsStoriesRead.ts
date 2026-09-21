/**
 * Эпики и стори из beer_tracker.issue_snapshots.
 */

import type { TrackerIssue } from '@/types/tracker';

import {
  findIssueSnapshotByKey,
  queryIssueSnapshotsByQueue,
} from '@/lib/snapshots/issueSnapshotReadDb';

export interface PagedTrackerIssues {
  issues: TrackerIssue[];
  totalCount: number;
  totalPages: number;
}

interface EpicDeepStoryBundle {
  story: TrackerIssue;
  tasks: TrackerIssue[];
}

interface EpicDeepSnapshotResult {
  epic: TrackerIssue | null;
  stories: EpicDeepStoryBundle[];
}

interface QueryStorySnapshotsParams {
  epicKey?: string;
  minYear?: number;
  /** Все стори с непустым parent (как CH requireParent). */
  requireParent?: boolean;
  /** Стори без родителя (как CH withoutParent). */
  withoutParent?: boolean;
}

function sortByCreatedAtDesc(issues: TrackerIssue[]): TrackerIssue[] {
  return [...issues].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
}

function filterByMinYear(issues: TrackerIssue[], minYear?: number): TrackerIssue[] {
  if (minYear === undefined) return issues;
  return issues.filter((issue) => {
    const created = issue.createdAt ?? '';
    const year = /^\d{4}-/.test(created)
      ? Number.parseInt(created.slice(0, 4), 10)
      : Number.NaN;
    return Number.isFinite(year) ? year >= minYear : true;
  });
}

function pageTrackerIssues(
  issues: TrackerIssue[],
  page: number,
  perPage: number
): PagedTrackerIssues {
  const p = Math.max(1, page);
  const n = Math.min(200, Math.max(1, perPage));
  const offset = (p - 1) * n;
  const sorted = sortByCreatedAtDesc(issues);
  const paged = sorted.slice(offset, offset + n);
  const totalCount = sorted.length;
  const totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / n);
  return { issues: paged, totalCount, totalPages };
}

function epicQueueKey(epic: TrackerIssue): string {
  const epicAny = epic as unknown as { queue?: string | { id?: string; key?: string } };
  return (
    (typeof epicAny.queue === 'object' && epicAny.queue
      ? (epicAny.queue.key ?? epicAny.queue.id)
      : undefined) ??
    (typeof epicAny.queue === 'string' ? epicAny.queue : '') ??
    ''
  ).trim();
}

/**
 * Эпики в очереди (type = epic), сортировка по дате создания убыв.
 */
export async function queryEpicSnapshotsForOrgQueue(
  organizationId: string,
  trackerQueueKey: string,
  page: number = 1,
  perPage: number = 100,
  minYear?: number
): Promise<PagedTrackerIssues> {
  const queueIssues = await queryIssueSnapshotsByQueue(organizationId, trackerQueueKey.trim());
  const epics = queueIssues.filter(
    (issue) => (issue.type?.key ?? '').toLowerCase() === 'epic'
  );
  return pageTrackerIssues(filterByMinYear(epics, minYear), page, perPage);
}

/**
 * Стори в очереди; фильтры parent/epic как в fetchStories.
 */
export async function queryStorySnapshotsForOrgQueue(
  organizationId: string,
  trackerQueueKey: string,
  page: number = 1,
  perPage: number = 100,
  options: QueryStorySnapshotsParams = {}
): Promise<PagedTrackerIssues> {
  const queueIssues = await queryIssueSnapshotsByQueue(organizationId, trackerQueueKey.trim());
  let stories = queueIssues.filter(
    (issue) => (issue.type?.key ?? '').toLowerCase() === 'story'
  );

  if (options.epicKey?.trim()) {
    const epicKey = options.epicKey.trim();
    stories = stories.filter((issue) => issue.parent?.key === epicKey);
  } else if (options.requireParent) {
    stories = stories.filter((issue) => Boolean(issue.parent?.key?.trim()));
  } else if (options.withoutParent) {
    stories = stories.filter((issue) => !issue.parent?.key?.trim());
  }

  return pageTrackerIssues(filterByMinYear(stories, options.minYear), page, perPage);
}

/**
 * Эпик + стори под ним + task/bug под стори.
 */
export async function fetchEpicDeepFromSnapshots(
  organizationId: string,
  epicKey: string
): Promise<EpicDeepSnapshotResult> {
  const key = epicKey.trim();
  const epic = await findIssueSnapshotByKey(organizationId, key);
  if (!epic) {
    return { epic: null, stories: [] };
  }

  const queueKey = epicQueueKey(epic);
  const queueIssues = queueKey
    ? await queryIssueSnapshotsByQueue(organizationId, queueKey)
    : [];
  const storiesRaw = queueIssues.filter(
    (issue) =>
      (issue.type?.key ?? '').toLowerCase() === 'story' && issue.parent?.key === key
  );
  const stories: EpicDeepStoryBundle[] = storiesRaw
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((story) => ({
      story,
      tasks: queueIssues.filter((issue) => {
        const t = (issue.type?.key ?? '').toLowerCase();
        return (t === 'task' || t === 'bug') && issue.parent?.key === story.key;
      }),
    }));

  return { epic, stories };
}
