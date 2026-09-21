import type { TrackerIntegrationStored } from './schema';
import type { IssueTrackerIssuePatch } from '@/lib/issueTrackerProvider/types';

interface IssueWorkBody {
  storyPoints?: number | null;
  testPoints?: number | null;
}

function assignEstimateField(
  patch: IssueTrackerIssuePatch,
  customFields: Record<string, unknown>,
  fieldId: string,
  canonical: 'storyPoints' | 'testPoints',
  value: number | null | undefined
): void {
  if (value === undefined) {
    return;
  }
  if (fieldId === canonical) {
    patch[canonical] = value;
    return;
  }
  customFields[fieldId] = value;
}

/**
 * Тело PATCH /issues/{key} для оценок с учётом имён полей из конфига.
 */
export function buildIssueWorkEstimatePatch(
  integration: TrackerIntegrationStored | null | undefined,
  body: IssueWorkBody
): IssueTrackerIssuePatch {
  const flow = integration?.testingFlow;
  const devKey = flow?.devEstimateFieldId?.trim() || 'storyPoints';
  const qaKey = flow?.qaEstimateFieldId?.trim() || 'testPoints';
  const patch: IssueTrackerIssuePatch = {};
  const customFields: Record<string, unknown> = {};
  assignEstimateField(patch, customFields, devKey, 'storyPoints', body.storyPoints);
  assignEstimateField(patch, customFields, qaKey, 'testPoints', body.testPoints);
  if (Object.keys(customFields).length > 0) {
    patch.customFields = customFields;
  }
  return patch;
}
