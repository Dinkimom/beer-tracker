import type { TrackerIntegrationStored } from './schema';
import type { Task, Team } from '@/types';
import type { TrackerIssue } from '@/types/tracker';

import { applyTestingFlowEstimates } from './applyIntegrationTestingFlowHelpers';
import {
  evaluateEmbeddedTestingOnlyPredicate,
  padEmbeddedTestingOnlyJoins,
} from './evaluateEmbeddedTestingOnlyRules';
import {
  readMergeRequestLinkFromIssue,
  readUserRefFromIssue,
} from './issueFieldUtils';
import { resolvePlatformFromIntegration } from './resolvePlatform';
import { resolveEffectiveStatusCategory } from './resolveStatus';
import { resolveStatusColorKey } from './statusPalette';

function applyQaEngineerField(
  issue: TrackerIssue,
  task: Task,
  fieldId: string | undefined
): Task {
  if (!fieldId) {
    return task;
  }
  const ref = readUserRefFromIssue(issue, fieldId);
  if (!ref) {
    return task;
  }
  return { ...task, qaEngineer: ref.id, qaEngineerName: ref.display };
}

function applyTestingFlowSection(
  issue: TrackerIssue,
  task: Task,
  config: TrackerIntegrationStored
): Task {
  if (!config.testingFlow) {
    return task;
  }
  let next =
    config.testingFlow.mode === 'standalone_qa_tasks'
      ? { ...task, hideTestPointsByIntegration: true }
      : { ...task, hideTestPointsByIntegration: undefined };
  next = applyTestingFlowEstimates(issue, next, config.testingFlow);
  next = applyQaEngineerField(issue, next, config.testingFlow.qaEngineerFieldId);
  const rules = config.testingFlow.embeddedTestingOnlyRules ?? [];
  const joins = padEmbeddedTestingOnlyJoins(rules.length, config.testingFlow.embeddedTestingOnlyJoins);
  if (rules.length > 0 && evaluateEmbeddedTestingOnlyPredicate(issue, rules, joins)) {
    next = { ...next, testingOnlyByIntegrationRules: true };
  }
  return next;
}

/**
 * Накладывает org-конфиг на уже смапленную базовую `Task` (legacy map).
 */
export function applyTrackerIntegrationToTask(
  issue: TrackerIssue,
  task: Task,
  config: TrackerIntegrationStored | null | undefined
): Task {
  if (!config) {
    return task;
  }

  let next: Task = { ...task };

  const platform = resolvePlatformFromIntegration(issue, config.platform);
  if (platform) {
    next = { ...next, team: platform as Team };
  }

  const statusKey = issue.status?.key || issue.statusType?.key;
  const statusTypeKey = issue.statusType?.key;
  const statusId = issue.status?.id?.trim();
  // Overrides are keyed by unique status id; name key is legacy fallback.
  const alternateStatusKeys = statusId && statusId !== statusKey ? [statusId] : undefined;
  const cat = resolveEffectiveStatusCategory(
    statusKey ?? '',
    statusTypeKey,
    config.statuses,
    alternateStatusKeys
  );
  if (cat) {
    next = {
      ...next,
      status: cat,
      ...(statusTypeKey ? { statusTypeKey } : {}),
    };
  } else if (statusTypeKey) {
    next = { ...next, statusTypeKey };
  }

  next = {
    ...next,
    statusColorKey: resolveStatusColorKey(
      statusKey,
      statusTypeKey,
      config.statuses?.overridesByStatusKey,
      alternateStatusKeys
    ),
  };
  next = applyTestingFlowSection(issue, next, config);

  const mrField = config.releaseReadiness?.mergeRequestFieldId?.trim();
  if (mrField) {
    const link = readMergeRequestLinkFromIssue(issue, mrField);
    next = {
      ...next,
      MergeRequestLink: link || next.MergeRequestLink,
    };
  }

  return next;
}
