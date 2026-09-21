import type { IssueTrackerProviderClient } from '@/lib/issueTrackerProvider/types';

import { isTrackerSprintIssuesFrozen } from '@/lib/trackerApi/sprintIssuesCache';

async function collectTaskParentKeysForSprint(
  issueTracker: IssueTrackerProviderClient,
  sprintId: number,
  taskIdToStoryKey: Record<string, string>
): Promise<void> {
  try {
    const sprintInfo = await issueTracker.getSprint(sprintId);
    const frozen = isTrackerSprintIssuesFrozen(sprintInfo.status);
    const issues = await issueTracker.getTasksInSprintWithParents(sprintId, {
      sprintStatus: sprintInfo.status,
      cacheOnly: frozen,
    });
    for (const issue of issues) {
      const parentKey = issue.parent?.key;
      if (parentKey && issue.key) {
        taskIdToStoryKey[issue.key] = parentKey;
      }
    }
  } catch (err) {
    console.warn(`[task-parents] Failed to fetch sprint ${sprintId}:`, err);
  }
}

export async function collectBatchTaskParentKeys(
  issueTracker: IssueTrackerProviderClient,
  sprintIds: number[]
): Promise<Record<string, string>> {
  const taskIdToStoryKey: Record<string, string> = {};
  for (const sprintId of sprintIds) {
    await collectTaskParentKeysForSprint(issueTracker, sprintId, taskIdToStoryKey);
  }
  return taskIdToStoryKey;
}
