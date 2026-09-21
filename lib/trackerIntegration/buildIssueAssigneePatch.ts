import type { TrackerIntegrationStored } from './schema';
import type { IssueTrackerIssuePatch } from '@/lib/issueTrackerProvider/types';

function assigneeFieldFromTestingFlow(
  isQa: boolean,
  integration: TrackerIntegrationStored | null | undefined
): string | undefined {
  const flow = integration?.testingFlow;
  const field = isQa ? flow?.qaEngineerFieldId?.trim() : flow?.devAssigneeFieldId?.trim();
  return field || undefined;
}

/**
 * Тело updateIssue для назначения исполнителя.
 * Адаптер провайдера мапит `assigneeId` на поле Tracker (Yandex `{ id }`, Jira name/accountId).
 */
export function buildIssueAssigneePatch(
  assigneeId: string,
  isQa: boolean,
  integration: TrackerIntegrationStored | null | undefined
): IssueTrackerIssuePatch {
  const assigneeField = assigneeFieldFromTestingFlow(isQa, integration);
  return {
    assigneeId,
    isQa,
    ...(assigneeField ? { assigneeField } : {}),
  };
}
