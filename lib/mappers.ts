import type { TrackerIssue } from '@/types/tracker';

import { issueFieldsFromStoredSnapshot } from '@/lib/issueTrackerProvider/snapshotEnvelope';

/**
 * Маппинг задачи (issue) в формат стори для API ответа
 * Используется как для /api/stories, так и для /api/stories/[storyKey]
 */
export function mapIssueToStoryResponse(stored: unknown) {
  const fields = issueFieldsFromStoredSnapshot(stored);
  const issue = (fields ?? stored) as TrackerIssue;
  return {
    key: issue.key,
    summary: issue.summary,
    description: issue.description || null,
    status: issue.status || null,
    statusKey: issue.status?.key || issue.statusType?.key || null,
    priority: issue.priority || null,
    assignee: issue.assignee || null,
    qaEngineer: issue.qaEngineer || null,
    storyPoints: issue.storyPoints || null,
    testPoints: issue.testPoints || null,
    createdAt: issue.createdAt || null,
    functionalTeam: issue.functionalTeam || null,
    bizErpTeam: issue.bizErpTeam || null,
    stage: issue.stage || null,
    parent: issue.parent || null,
    type: issue.type?.key || issue.type?.display || null,
  };
}

