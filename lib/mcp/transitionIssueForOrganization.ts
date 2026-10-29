import type { IssueTrackerProviderClient } from '@/lib/issueTrackerProvider/types';
import type { FlowStatus, FlowStep, IssueStatusFlow } from '@/lib/mcp/issueStatusFlow';

import { completeIssueStatusChange, sprintIdsFromIssueSprint } from '@/lib/issues/issuesRouteHelpers';
import { getIssueTrackerProviderClientForOrganization } from '@/lib/issueTrackerProvider/clientFactory';
import { learnIssueStatusFlow, sameFlowStatus } from '@/lib/mcp/issueStatusFlow';
import { resolveMcpIssueStatusCategory } from '@/lib/mcp/resolveMcpIssueStatusCategory';
import { softLoadSprintContextMeta } from '@/lib/sprints/sprintContextSoftMeta';
import { TENANT_ORG_HEADER } from '@/lib/tenantHttpConstants';

type IssueFlowTarget = 'in_progress' | 'review';

/** Сколько соседних задач читать: история каждой — запрос к трекеру (батчами). */
const FLOW_SAMPLE_LIMIT = 25;

type TransitionOutcome =
  | { available?: string[]; detail?: string; reason: string; transitioned: false }
  | { from: string | null; to: string; transitioned: true };

/** Задачи текущего и предыдущего спринта доски из той же очереди, уже сдвинутые с «не начата». */
async function loadFlowSampleKeys(input: {
  issueKey: string;
  issueTracker: IssueTrackerProviderClient;
  organizationId: string;
  sprintId: number;
}): Promise<string[]> {
  const queue = input.issueKey.split('-')[0];
  const sprintIds = [input.sprintId];
  const { boardId } = await softLoadSprintContextMeta({
    organizationId: input.organizationId,
    request: null,
    sprintId: input.sprintId,
    useStoredTracker: true,
  });
  if (boardId != null) {
    const sprints = await input.issueTracker.listSprints(boardId).catch(() => []);
    const current = sprints.find((sprint) => sprint.id === input.sprintId);
    const previous = sprints
      .filter((sprint) => current && sprint.startDate < current.startDate)
      .sort((a, b) => b.startDate.localeCompare(a.startDate))[0];
    if (previous) {
      sprintIds.push(previous.id);
    }
  }
  const issues = (await Promise.all(sprintIds.map((id) => input.issueTracker.listSprintIssues(id)))).flat();
  const keys = issues
    .filter((issue) => issue.key !== input.issueKey && issue.key.split('-')[0] === queue)
    .filter((issue) => resolveMcpIssueStatusCategory({ statusKey: issue.status?.key, statusTypeKey: issue.statusType?.key }) !== 'todo')
    .map((issue) => issue.key);
  return [...new Set(keys)].slice(0, FLOW_SAMPLE_LIMIT);
}

async function learnFlow(issueTracker: IssueTrackerProviderClient, keys: string[]): Promise<IssueStatusFlow> {
  if (keys.length === 0) {
    return learnIssueStatusFlow([], () => 'todo');
  }
  const [changelogs, catalog] = await Promise.all([
    issueTracker.getIssuesChangelogBatch(keys),
    issueTracker.listStatuses(),
  ]);
  const typeById = new Map(catalog.map((status) => [status.id, status.statusType?.key]));
  const typeByKey = new Map(catalog.map((status) => [status.key, status.statusType?.key]));
  const categoryOf = (status: FlowStatus) =>
    resolveMcpIssueStatusCategory({
      statusKey: status.key,
      statusTypeKey: (status.id ? typeById.get(status.id) : undefined) ?? typeByKey.get(status.key),
    });
  return learnIssueStatusFlow(
    Object.values(changelogs).map((row) => row.changelog),
    categoryOf
  );
}

async function requiredTransitionFields(
  issueTracker: IssueTrackerProviderClient,
  issueKey: string,
  transitionId: string
): Promise<string[]> {
  try {
    const fields = await issueTracker.getTransitionFields(issueKey, transitionId);
    return fields.filter((field) => field.required).map((field) => field.display || field.id);
  } catch {
    // Экран перехода не прочитался — пусть решит сам трекер при переходе.
    return [];
  }
}

/**
 * Почему трекер отклонил переход: тексты Jira (`errorMessages`, `errors`) или Трекера (`errorMessages`),
 * иначе сообщение ошибки — агенту понятно, что не так, а не просто «400».
 */
function trackerErrorDetail(error: unknown): string {
  const data = (error as { response?: { data?: { errorMessages?: unknown; errors?: unknown } } }).response?.data;
  const messages = Array.isArray(data?.errorMessages) ? data.errorMessages.map(String) : [];
  const fields =
    data?.errors && typeof data.errors === 'object'
      ? Object.entries(data.errors as Record<string, unknown>).map(([field, text]) => `${field}: ${String(text)}`)
      : [];
  const detail = [...messages, ...fields].join('; ');
  return detail || (error instanceof Error ? error.message : String(error));
}

async function moveIssueTo(input: {
  issueKey: string;
  issueTracker: IssueTrackerProviderClient;
  organizationId: string;
  status: FlowStatus;
}): Promise<TransitionOutcome> {
  const { issueKey, issueTracker } = input;
  const issue = await issueTracker.getIssue(issueKey);
  if (!issue) {
    return { reason: 'issue_not_found', transitioned: false };
  }
  const current = issue.status ? { id: issue.status.id ?? null, key: issue.status.key } : null;
  if (current && sameFlowStatus(current, input.status)) {
    return { reason: 'already_in_status', transitioned: false };
  }
  const transitions = await issueTracker.getIssueTransitions(issueKey);
  const transition = transitions.find((row) => sameFlowStatus({ id: row.to.id ?? null, key: row.to.key }, input.status));
  if (!transition) {
    const available = transitions.map((row) => row.to.display ?? row.to.key);
    return { available, reason: 'no_transition_from_current_status', transitioned: false };
  }
  const required = await requiredTransitionFields(issueTracker, issueKey, transition.id);
  if (required.length > 0) {
    return { detail: required.join(', '), reason: 'transition_requires_fields', transitioned: false };
  }
  try {
    await issueTracker.transitionIssue(issueKey, transition.id, {});
  } catch (error) {
    return { detail: trackerErrorDetail(error), reason: 'transition_rejected', transitioned: false };
  }
  // Тот же хвост, что у смены статуса из UI: кэш спринта, burndown и realtime для открытых планеров.
  completeIssueStatusChange({
    issueKey,
    request: new Request('http://localhost/api/mcp', { headers: { [TENANT_ORG_HEADER]: input.organizationId } }),
    sprintIds: sprintIdsFromIssueSprint(issue.sprint),
    statusDisplay: input.status.display,
    statusKey: transition.to.key,
  });
  return { from: issue.status?.display ?? issue.status?.key ?? null, to: input.status.display, transitioned: true };
}

/**
 * Переводит задачу на шаг флоу команды («в работу» / «на ревью»), выведенный из истории соседних задач.
 * Не уверен в шаге или переход недоступен — статус не трогает. Комментарий пишется в любом случае.
 */
export async function transitionIssueByTeamFlow(input: {
  comment?: string;
  issueKey: string;
  organizationId: string;
  sprintId: number;
  target: IssueFlowTarget;
}): Promise<{ commented: boolean; flowStep: FlowStep; outcome: TransitionOutcome; sampleSize: number }> {
  const issueKey = input.issueKey.trim();
  const issueTracker = await getIssueTrackerProviderClientForOrganization(input.organizationId);
  const keys = await loadFlowSampleKeys({ ...input, issueKey, issueTracker });
  const flow = await learnFlow(issueTracker, keys);
  const flowStep = input.target === 'review' ? flow.review : flow.inProgress;
  const outcome: TransitionOutcome =
    'status' in flowStep
      ? await moveIssueTo({ issueKey, issueTracker, organizationId: input.organizationId, status: flowStep.status })
      : { reason: flowStep.reason, transitioned: false };
  const comment = input.comment?.trim();
  if (comment) {
    await issueTracker.addIssueComment(issueKey, comment);
  }
  return { commented: Boolean(comment), flowStep, outcome, sampleSize: flow.sampleSize };
}
