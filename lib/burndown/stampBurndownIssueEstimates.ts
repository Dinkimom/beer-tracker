import type { TrackerIntegrationStored } from '@/lib/trackerIntegration/schema';
import type { Task } from '@/types';
import type { TrackerIssue } from '@/types/tracker';

import { applyTestingFlowEstimates } from '@/lib/trackerIntegration/applyIntegrationTestingFlowHelpers';

function estimateTaskStub(issue: TrackerIssue): Task {
  return {
    id: issue.key,
    link: issue.self || '',
    name: issue.summary,
    storyPoints: issue.storyPoints,
    team: 'Web',
    testPoints: issue.testPoints,
  };
}

/**
 * Копирует оценки из полей интеграции (customfield_*) в storyPoints/testPoints.
 * Burndown читает только эти два поля, доска — уже смапленную Task.
 */
export function stampBurndownIssueEstimates(
  issue: TrackerIssue,
  integration: TrackerIntegrationStored | null | undefined
): TrackerIssue {
  const flow = integration?.testingFlow;
  if (!flow) return issue;

  const next = applyTestingFlowEstimates(issue, estimateTaskStub(issue), flow);
  if (next.storyPoints === issue.storyPoints && next.testPoints === issue.testPoints) {
    return issue;
  }

  return {
    ...issue,
    ...(next.storyPoints !== undefined ? { storyPoints: next.storyPoints } : {}),
    ...(next.testPoints !== undefined ? { testPoints: next.testPoints } : {}),
  };
}
