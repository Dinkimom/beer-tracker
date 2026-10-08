'use client';

import type { Task, TaskLink } from '@/types';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useIssueTrackerProviderCapabilities } from '@/contexts/IssueTrackerProviderKindContext';
import { getTaskTrackerDisplayKey } from '@/features/task/utils/taskUtils';
import { fetchIssueLinksBatch } from '@/lib/api/issues';
import { mapTrackerIssueLinkEdgesToTaskLinks } from '@/lib/planner/trackerLinkOverlay';

function buildIssueKeyToBoardTaskIdMap(tasks: Iterable<Task>): Map<string, string> {
  const map = new Map<string, string>();
  for (const task of tasks) {
    const key = getTaskTrackerDisplayKey(task);
    if (!key) {
      continue;
    }
    const existing = map.get(key);
    if (!existing || task.originalTaskId == null) {
      map.set(key, task.id);
    }
  }
  return map;
}

export function useSprintTrackerIssueLinks(input: {
  enabled: boolean;
  sprintId: number | null;
  tasks: Task[];
}): TaskLink[] {
  const { supportsIssueLinks } = useIssueTrackerProviderCapabilities();
  const issueKeyToTaskId = useMemo(
    () => buildIssueKeyToBoardTaskIdMap(input.tasks),
    [input.tasks]
  );
  const issueKeys = useMemo(() => [...issueKeyToTaskId.keys()], [issueKeyToTaskId]);

  const query = useQuery({
    queryKey: ['sprint-tracker-issue-links', input.sprintId, issueKeys],
    enabled:
      input.enabled &&
      supportsIssueLinks &&
      input.sprintId != null &&
      issueKeys.length > 0,
    queryFn: () => fetchIssueLinksBatch(issueKeys),
    // Matches server per-issue TTL; mutations invalidate this query key.
    staleTime: 30 * 60_000,
  });

  return useMemo(
    () => mapTrackerIssueLinkEdgesToTaskLinks(query.data ?? [], issueKeyToTaskId),
    [issueKeyToTaskId, query.data]
  );
}
