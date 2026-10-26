/**
 * Задачи спринта для GET /api/tracker: память → issue_snapshots → Tracker.
 * На холодной доске in-memory кэш пуст; снимок PG закрывает TTFB без живого поиска.
 * `skipSnapshots` (фоновое обновление планера): память → Tracker, без снимка PG,
 * который может отставать от уже показанных клиенту данных.
 */

import type { IssueTrackerProviderClient, IssueTrackerSprintIssuesOptions } from '@/lib/issueTrackerProvider/types';
import type { TrackerIssue } from '@/types/tracker';

import { rememberHarvestedIssueLinks } from '@/lib/issues/trackerIssueLinksRouteHelpers';
import { buildTrackerIssueFromProviderIssue } from '@/lib/issueTrackerProvider/yandexTrackerIssueMappingHelpers';
import { queryIssueSnapshotsMatchingSprint } from '@/lib/snapshots';
import { getTeamByBoardId } from '@/lib/staffTeams';
import {
  getCachedSprintIssues,
  setCachedSprintIssues,
} from '@/lib/trackerApi/sprintIssuesCache';

interface LoadSprintIssuesForPlannerParams {
  boardId: string | null;
  forceRefresh: boolean;
  issueTracker: IssueTrackerProviderClient;
  organizationId: string;
  skipSnapshots?: boolean;
  sprintId: number;
  sprintStatus?: string;
}

type ScheduleTrackerRefreshFn = (
  sprintId: number,
  issueTracker: IssueTrackerProviderClient,
  organizationId: string
) => void;

type FetchPlannerSprintIssuesFn = (
  issueTracker: IssueTrackerProviderClient,
  sprintId: number,
  options: IssueTrackerSprintIssuesOptions | undefined,
  organizationId: string
) => Promise<TrackerIssue[]>;

interface LoadSprintIssuesForPlannerDeps {
  fetchFromTracker: FetchPlannerSprintIssuesFn;
  getCached: typeof getCachedSprintIssues;
  getTeamTitleByBoardId: typeof getTeamByBoardId;
  querySnapshots: typeof queryIssueSnapshotsMatchingSprint;
  scheduleTrackerRefresh: ScheduleTrackerRefreshFn;
  setCached: typeof setCachedSprintIssues;
}

async function fetchPlannerSprintIssuesFromProvider(
  issueTracker: IssueTrackerProviderClient,
  sprintId: number,
  options: IssueTrackerSprintIssuesOptions | undefined,
  organizationId: string
): Promise<TrackerIssue[]> {
  const issues = await issueTracker.listSprintIssues(sprintId, options);
  rememberHarvestedIssueLinks(organizationId, issues);
  return issues.map(buildTrackerIssueFromProviderIssue);
}

function scheduleDefaultTrackerRefresh(
  sprintId: number,
  issueTracker: IssueTrackerProviderClient,
  organizationId: string
): void {
  fetchPlannerSprintIssuesFromProvider(
    issueTracker,
    sprintId,
    { forceRefresh: true },
    organizationId
  )
    .then((issues) => {
      setCachedSprintIssues(sprintId, issues, undefined);
    })
    .catch((error: unknown) => {
      console.warn('[GET /api/tracker] background Tracker refresh failed:', error);
    });
}

const defaultDeps: LoadSprintIssuesForPlannerDeps = {
  fetchFromTracker: fetchPlannerSprintIssuesFromProvider,
  getCached: getCachedSprintIssues,
  getTeamTitleByBoardId: getTeamByBoardId,
  querySnapshots: queryIssueSnapshotsMatchingSprint,
  scheduleTrackerRefresh: scheduleDefaultTrackerRefresh,
  setCached: setCachedSprintIssues,
};

async function resolveFunctionalTeamTitle(
  organizationId: string,
  boardId: string | null,
  getTeamTitleByBoardId: LoadSprintIssuesForPlannerDeps['getTeamTitleByBoardId']
): Promise<string | null> {
  if (boardId == null || boardId.trim() === '') {
    return null;
  }
  const boardIdNum = Number.parseInt(boardId, 10);
  if (!Number.isFinite(boardIdNum)) {
    return null;
  }
  try {
    const team = await getTeamTitleByBoardId(organizationId, boardIdNum);
    return team?.title?.trim() || null;
  } catch (error) {
    console.warn('[GET /api/tracker] team lookup for snapshot filter failed:', error);
    return null;
  }
}

async function loadSprintIssuesFromSnapshots(
  params: LoadSprintIssuesForPlannerParams,
  deps: LoadSprintIssuesForPlannerDeps
): Promise<TrackerIssue[]> {
  const functionalTeamExact = await resolveFunctionalTeamTitle(
    params.organizationId,
    params.boardId,
    deps.getTeamTitleByBoardId
  );
  if (params.boardId && !functionalTeamExact) {
    return [];
  }
  try {
    return await deps.querySnapshots(params.organizationId, {
      functionalTeamExact,
      omitLogsAndComments: true,
      sprintId: String(params.sprintId),
      sprintName: '',
    });
  } catch (error) {
    console.warn('[GET /api/tracker] issue snapshot query failed, falling back to Tracker:', error);
    return [];
  }
}

function compareTrackerRank(a: string | undefined, b: string | undefined): number {
  if (a === b) {
    return 0;
  }
  if (a == null || a === '') {
    return 1;
  }
  if (b == null || b === '') {
    return -1;
  }
  return a < b ? -1 : 1;
}

/**
 * Порядок трекера (ранг) — канон списка задач спринта: по нему сайдбар и расстановка по человеку.
 * Кэш и снимки PG приходят без порядка, поэтому сортируем на выходе. Ранг сравниваем
 * посимвольно (LexoRank), не `localeCompare`. Задачи без ранга — после ранжированных, в исходном порядке.
 */
function sortIssuesByTrackerRank(issues: TrackerIssue[]): TrackerIssue[] {
  if (!issues.some((issue) => issue.rank)) {
    return issues;
  }
  return [...issues].sort((a, b) => compareTrackerRank(a.rank, b.rank));
}

export async function loadSprintIssuesForPlanner(
  params: LoadSprintIssuesForPlannerParams,
  deps: LoadSprintIssuesForPlannerDeps = defaultDeps
): Promise<TrackerIssue[]> {
  return sortIssuesByTrackerRank(await loadUnorderedSprintIssues(params, deps));
}

async function loadUnorderedSprintIssues(
  params: LoadSprintIssuesForPlannerParams,
  deps: LoadSprintIssuesForPlannerDeps
): Promise<TrackerIssue[]> {
  if (!params.forceRefresh) {
    const cached = deps.getCached(params.sprintId);
    if (cached) {
      return cached;
    }
  }
  if (!params.forceRefresh && !params.skipSnapshots) {
    const fromPg = await loadSprintIssuesFromSnapshots(params, deps);
    if (fromPg.length > 0) {
      deps.setCached(params.sprintId, fromPg, params.sprintStatus);
      deps.scheduleTrackerRefresh(params.sprintId, params.issueTracker, params.organizationId);
      return fromPg;
    }
  }
  const issues = await deps.fetchFromTracker(
    params.issueTracker,
    params.sprintId,
    {
      forceRefresh: params.forceRefresh,
      ...(params.sprintStatus !== undefined ? { sprintStatus: params.sprintStatus } : {}),
    },
    params.organizationId
  );
  deps.setCached(params.sprintId, issues, params.sprintStatus);
  return issues;
}
