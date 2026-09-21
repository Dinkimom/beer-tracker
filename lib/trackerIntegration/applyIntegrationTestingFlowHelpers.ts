import type { TrackerIntegrationStored } from './schema';
import type { Task } from '@/types';
import type { TrackerIssue } from '@/types/tracker';

import { readNumericEstimateFromIssue } from './issueFieldUtils';

type TestingFlow = NonNullable<TrackerIntegrationStored['testingFlow']>;

function standaloneQaTypeKeys(flow: TestingFlow): string[] {
  const raw = (flow.standaloneClassification as { typeKeys?: unknown } | undefined)?.typeKeys;
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter((value): value is string => typeof value === 'string');
}

function isStandaloneQaTask(issue: TrackerIssue, flow: TestingFlow): boolean {
  if (flow.mode !== 'standalone_qa_tasks') {
    return false;
  }
  const typeKey = issue.type?.key?.trim();
  return Boolean(typeKey && standaloneQaTypeKeys(flow).includes(typeKey));
}

function applyEstimateField(
  issue: TrackerIssue,
  task: Task,
  fieldId: string,
  key: 'storyPoints' | 'testPoints'
): Task {
  const value = readNumericEstimateFromIssue(issue, fieldId);
  return value === undefined ? task : { ...task, [key]: value };
}

function applyOptionalEstimateField(
  issue: TrackerIssue,
  task: Task,
  fieldId: string | undefined,
  key: 'storyPoints' | 'testPoints'
): Task {
  return fieldId ? applyEstimateField(issue, task, fieldId, key) : task;
}

function applyEmbeddedEstimates(
  issue: TrackerIssue,
  task: Task,
  devField: string | undefined,
  qaField: string | undefined
): Task {
  return applyOptionalEstimateField(
    issue,
    applyOptionalEstimateField(issue, task, devField, 'storyPoints'),
    qaField,
    'testPoints'
  );
}

function applyStandaloneQaEstimates(issue: TrackerIssue, task: Task, flow: TestingFlow): Task {
  let next = task;
  if (isStandaloneQaTask(issue, flow)) {
    next = applyEstimateField(issue, next, flow.devEstimateFieldId ?? 'storyPoints', 'storyPoints');
  }
  if (!flow.zeroDevPositiveQaRule || !flow.qaEstimateFieldId) {
    return next;
  }
  const devVal = readNumericEstimateFromIssue(issue, flow.devEstimateFieldId ?? 'storyPoints') ?? 0;
  const qaVal = readNumericEstimateFromIssue(issue, flow.qaEstimateFieldId) ?? 0;
  return devVal === 0 && qaVal > 0 ? { ...next, testPoints: qaVal } : next;
}

export function applyTestingFlowEstimates(
  issue: TrackerIssue,
  task: Task,
  flow: TestingFlow
): Task {
  if (flow.mode === 'embedded_in_dev' || flow.mode === undefined) {
    return applyEmbeddedEstimates(issue, task, flow.devEstimateFieldId, flow.qaEstimateFieldId);
  }
  if (flow.mode === 'standalone_qa_tasks') {
    return applyStandaloneQaEstimates(issue, task, flow);
  }
  return task;
}
