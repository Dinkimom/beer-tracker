import type { IssueTrackerIssue, IssueTrackerProviderClient } from '@/lib/issueTrackerProvider/types';

export async function scanSingleQueueForFullSync(input: {
  currentIssueCount: number;
  issueTracker: IssueTrackerProviderClient;
  maxTotalIssues: number;
  mergeStats?: (patch: Record<string, unknown>) => Promise<void>;
  perPage: number;
  queueIndex: number;
  queueKey: string;
  queueTotal: number;
}): Promise<{
  issues: IssueTrackerIssue[];
  nextIssueCount: number;
  truncated: boolean;
}> {
  const remaining = input.maxTotalIssues - input.currentIssueCount;
  const { issues, truncated: queueTruncated } = await input.issueTracker.listIssuesForQueue(
    input.queueKey,
    {
      maxTotalIssues: remaining,
      onCheckpoint: async (c) => {
        await input.mergeStats?.({
          full_sync_checkpoint: {
            page: c.page,
            queue_index: input.queueIndex + 1,
            queue_key: input.queueKey,
            queue_total: input.queueTotal,
            total_pages: c.totalPages,
          },
          issues_total_so_far: input.currentIssueCount + c.totalIssues,
        });
      },
      perPage: input.perPage,
    }
  );
  return {
    issues,
    nextIssueCount: input.currentIssueCount + issues.length,
    truncated: queueTruncated,
  };
}
