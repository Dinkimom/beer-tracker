/**
 * Полная выгрузка снимков по очередям команд org (initial_full / full_rescan).
 */

import type {
  IssueTrackerIssue,
  IssueTrackerProviderClient,
} from '@/lib/issueTrackerProvider/types';
import type { TeamRow } from '@/lib/staffTeams/types';

import { uniqueIssueTrackerQueueKeysFromTeams } from '@/lib/issueTrackerProvider/storageAliases';

import { scanSingleQueueForFullSync } from './fullOrgBoardScanHelpers';

interface FullQueueScanResult {
  issues: IssueTrackerIssue[];
  queuesProcessed: number;
  truncated: boolean;
}

export function uniqueQueueKeysFromTeams(teams: TeamRow[]): string[] {
  return uniqueIssueTrackerQueueKeysFromTeams(teams);
}

function mergeIssuesIntoMap(
  byKey: Map<string, IssueTrackerIssue>,
  issues: IssueTrackerIssue[]
): void {
  for (const issue of issues) {
    byKey.set(issue.key, issue);
  }
}

async function scanQueueAtIndex(params: {
  byKey: Map<string, IssueTrackerIssue>;
  issueTracker: IssueTrackerProviderClient;
  maxTotalIssues: number;
  mergeStats?: (patch: Record<string, unknown>) => Promise<void>;
  perPage: number;
  queueIndex: number;
  queueKey: string;
  queueTotal: number;
}): Promise<{ nextIssueCount: number; truncated: boolean }> {
  const { issues, nextIssueCount, truncated } = await scanSingleQueueForFullSync({
    currentIssueCount: params.byKey.size,
    issueTracker: params.issueTracker,
    maxTotalIssues: params.maxTotalIssues,
    mergeStats: params.mergeStats,
    perPage: params.perPage,
    queueIndex: params.queueIndex,
    queueKey: params.queueKey,
    queueTotal: params.queueTotal,
  });
  mergeIssuesIntoMap(params.byKey, issues);
  return { nextIssueCount, truncated };
}

export async function collectIssuesFullSyncAcrossQueues(params: {
  issueTracker: IssueTrackerProviderClient;
  maxTotalIssues: number;
  mergeStats?: (patch: Record<string, unknown>) => Promise<void>;
  perPage: number;
  queueKeys: string[];
}): Promise<FullQueueScanResult> {
  if (params.queueKeys.length === 0) {
    return { issues: [], queuesProcessed: 0, truncated: false };
  }

  const byKey = new Map<string, IssueTrackerIssue>();
  const queueTotal = params.queueKeys.length;

  for (let i = 0; i < params.queueKeys.length; i++) {
    const { nextIssueCount, truncated } = await scanQueueAtIndex({
      byKey,
      issueTracker: params.issueTracker,
      maxTotalIssues: params.maxTotalIssues,
      mergeStats: params.mergeStats,
      perPage: params.perPage,
      queueIndex: i,
      queueKey: params.queueKeys[i]!,
      queueTotal,
    });

    if (truncated || nextIssueCount >= params.maxTotalIssues) {
      await params.mergeStats?.({
        full_sync_stopped: true,
        issues_total_so_far: byKey.size,
      });
      return {
        issues: [...byKey.values()],
        queuesProcessed: i + 1,
        truncated: true,
      };
    }
  }

  return {
    issues: [...byKey.values()],
    queuesProcessed: queueTotal,
    truncated: false,
  };
}
