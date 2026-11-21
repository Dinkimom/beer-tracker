import type { IssueTrackerIssue } from './types';
import type { TrackerIssue } from '@/types/tracker';

/**
 * Общие поля задачи в формате провайдера. Jira и Yandex отдают их одинаково после своего
 * разбора ответа; различаются только кастомные поля и метка провайдера.
 */
export function normalizeTrackerIssue(
  issue: TrackerIssue,
  input: Pick<IssueTrackerIssue, 'customFields' | 'provider'>
): IssueTrackerIssue {
  return {
    assignee: issue.assignee,
    createdAt: issue.createdAt,
    customFields: input.customFields,
    deadline: issue.deadline,
    description: issue.description,
    epic: issue.epic,
    functionalTeam: issue.functionalTeam,
    id: issue.id,
    key: issue.key,
    mergeRequestLink: issue.MergeRequestLink,
    parent: issue.parent,
    priority: issue.priority,
    productTeam: issue.bizErpTeam,
    provider: input.provider,
    qaEngineer: issue.qaEngineer,
    raw: issue,
    self: issue.self,
    sprint: issue.sprint,
    stage: issue.stage,
    start: issue.start,
    status: issue.status,
    statusType: issue.statusType,
    storyPoints: issue.storyPoints,
    summary: issue.summary,
    testPoints: issue.testPoints,
    type: issue.type,
    updatedAt: issue.updatedAt,
  };
}
