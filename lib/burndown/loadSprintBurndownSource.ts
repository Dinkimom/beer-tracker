/**
 * Источник данных реплея спринта: спринт из трекера, задачи (трекер + issue_snapshots),
 * полный changelog задач. Общий для burndown и метрик спринтов.
 */

import type { IssueTrackerProviderClient } from '@/lib/issueTrackerProvider/types';
import type { TrackerIntegrationStored } from '@/lib/trackerIntegration';
import type { YtrackerBurndownIssue } from '@/lib/ytrackerRawIssues';
import type { SprintInfo, TrackerIssue } from '@/types/tracker';

import { mergeTrackerIssuesByKey } from '@/lib/burndown/mergeTrackerIssuesByKey';
import { stampBurndownIssueEstimates } from '@/lib/burndown/stampBurndownIssueEstimates';
import {
  normalizeYandexIssue,
  yandexIssueFromProviderIssue,
} from '@/lib/issueTrackerProvider/yandexTrackerProvider';
import { queryIssueSnapshotsMatchingSprint } from '@/lib/snapshots';
import { getTeamByBoardId } from '@/lib/staffTeams';

interface SprintIssuesBundle {
  issues: TrackerIssue[];
  sprintInfo: SprintInfo;
}

interface SprintBurndownSource extends SprintIssuesBundle {
  /** Changelog-задачи без QA-дублей; пусто, если в спринте нет реальных задач. */
  burndownIssues: YtrackerBurndownIssue[];
  /** Задачи без QA-дублей (functionalTeam с qa/tester). */
  realIssues: TrackerIssue[];
}

function isRealSprintTask(issue: TrackerIssue): boolean {
  const team = (issue.functionalTeam ?? '').toLowerCase();
  return !team.includes('qa') && !team.includes('tester');
}

/**
 * Спринт — из Tracker. Задачи — объединение Tracker + issue_snapshots по ключу
 * (снимки с совпадением спринта в payload; при boardId — фильтр по functionalTeam = title команды в PG).
 */
async function loadSprintInfoAndIssues(
  issueTracker: IssueTrackerProviderClient,
  organizationId: string,
  sprintId: number,
  boardId: number | undefined
): Promise<SprintIssuesBundle> {
  const sprintInfo = await issueTracker.getSprint(sprintId);

  let functionalTeamExact: string | null = null;
  if (boardId != null) {
    const teamRow = await getTeamByBoardId(organizationId, boardId);
    functionalTeamExact = teamRow?.title?.trim() || null;
  }

  const [fromTrackerProvider, fromSnapshots] = await Promise.all([
    issueTracker.listSprintIssues(sprintId),
    queryIssueSnapshotsMatchingSprint(organizationId, {
      functionalTeamExact,
      sprintId: sprintInfo.id != null ? String(sprintInfo.id) : null,
      sprintName: sprintInfo.name,
    }),
  ]);
  const fromTracker = fromTrackerProvider.map(yandexIssueFromProviderIssue);
  const issues = mergeTrackerIssuesByKey(fromTracker, fromSnapshots);
  return { issues, sprintInfo };
}

export async function loadSprintBurndownSource(input: {
  boardId: number | undefined;
  integration: TrackerIntegrationStored | null;
  issueTracker: IssueTrackerProviderClient;
  organizationId: string;
  sprintId: number;
}): Promise<SprintBurndownSource> {
  const { issueTracker, integration } = input;
  const { sprintInfo, issues } = await loadSprintInfoAndIssues(
    issueTracker,
    input.organizationId,
    input.sprintId,
    input.boardId
  );
  const realIssues = issues.filter(isRealSprintTask);
  if (realIssues.length === 0) {
    return { burndownIssues: [], issues, realIssues, sprintInfo };
  }

  const issueByKey = new Map(
    issues.map((issue) => [issue.key, normalizeYandexIssue(stampBurndownIssueEstimates(issue, integration))])
  );
  const burndownIssues = await issueTracker.getBurndownIssuesForKeys(
    realIssues.map((issue) => issue.key),
    {
      sprintId: sprintInfo.id != null ? String(sprintInfo.id) : undefined,
      sprintName: sprintInfo.name ?? '',
    },
    issueByKey
  );
  return { burndownIssues, issues, realIssues, sprintInfo };
}
