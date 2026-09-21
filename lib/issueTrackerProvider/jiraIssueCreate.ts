import type { IssueTrackerCreateIssueInput, IssueTrackerCreateIssueResult } from './types';
import type { AxiosInstance } from 'axios';

import { addJiraIssueToSprint } from './jiraIssueSprintMembership';
import { jiraAssigneePutBody } from './jiraIssueUpdate';
import { fetchJiraQueueWorkflows } from './jiraQueues';

interface JiraCreateIssueTypeOption {
  display?: string;
  id: string;
  key: string;
}

const TYPE_ALIASES: Record<string, readonly string[]> = {
  bug: ['bug', 'баг', 'defect', 'ошибка'],
  story: ['story', 'история', 'userstory'],
  task: ['task', 'задача', 'todo'],
  баг: ['bug', 'баг'],
  задача: ['task', 'задача'],
  история: ['story', 'история'],
};

function normalizeTypeKey(value: string): string {
  return value.toLowerCase().replaceAll(/\s+/g, '');
}

function typeKeys(type: JiraCreateIssueTypeOption): string[] {
  return [type.key, type.display]
    .filter((value): value is string => Boolean(value?.trim()))
    .map((value) => normalizeTypeKey(value));
}

function typeMatchesRequested(type: JiraCreateIssueTypeOption, want: string): boolean {
  const keys = typeKeys(type);
  if (keys.includes(want)) {
    return true;
  }
  const aliases = TYPE_ALIASES[want];
  return aliases != null && keys.some((key) => aliases.includes(key));
}

export function pickJiraCreateIssueType(
  types: JiraCreateIssueTypeOption[],
  requested?: string
): { id?: string; name?: string } {
  const raw = requested?.trim();
  if (raw && /^\d+$/.test(raw)) {
    return { id: raw };
  }
  const want = raw ? normalizeTypeKey(raw) : '';
  const match = want ? types.find((type) => typeMatchesRequested(type, want)) : undefined;
  if (match) {
    return { id: match.id };
  }
  if (types[0]) {
    return { id: types[0].id };
  }
  return { name: raw || 'Task' };
}

function jiraCreateAssigneeField(assignee?: string): Record<string, string> | undefined {
  const raw = assignee?.trim();
  if (!raw || raw.startsWith('staff:')) {
    return undefined;
  }
  const body = jiraAssigneePutBody(raw);
  if (body.accountId) {
    return { accountId: body.accountId };
  }
  if (typeof body.name === 'string' && body.name.trim() !== '') {
    return { name: body.name };
  }
  return undefined;
}

function jiraCreatePriorityField(priority?: string): { id: string } | { name: string } | undefined {
  const raw = priority?.trim();
  if (!raw) {
    return undefined;
  }
  return /^\d+$/.test(raw) ? { id: raw } : { name: raw };
}

export function buildJiraCreateIssueFields(
  input: IssueTrackerCreateIssueInput,
  types: JiraCreateIssueTypeOption[]
): Record<string, unknown> {
  const fields: Record<string, unknown> = {
    issuetype: pickJiraCreateIssueType(types, input.type),
    project: { key: input.queue.trim() },
    summary: input.summary.trim(),
  };
  if (input.description?.trim()) {
    fields.description = input.description.trim();
  }
  if (input.parent?.trim()) {
    fields.parent = { key: input.parent.trim() };
  }
  const priority = jiraCreatePriorityField(input.priority);
  if (priority) {
    fields.priority = priority;
  }
  const assignee = jiraCreateAssigneeField(input.assignee);
  if (assignee) {
    fields.assignee = assignee;
  }
  return fields;
}

export async function createJiraIssue(
  api: AxiosInstance,
  input: IssueTrackerCreateIssueInput
): Promise<IssueTrackerCreateIssueResult> {
  const projectKey = input.queue.trim();
  const summary = input.summary.trim();
  if (!projectKey || !summary) {
    throw new Error('Jira createIssue requires project key and summary');
  }
  const workflows = await fetchJiraQueueWorkflows(api, projectKey);
  const fields = buildJiraCreateIssueFields(
    { ...input, queue: projectKey, summary },
    workflows[projectKey] ?? []
  );
  const { data } = await api.post<{ id?: string; key?: string; self?: string }>('/issue', {
    fields,
  });
  const key = data?.key?.trim();
  if (!key) {
    throw new Error('Jira createIssue returned no issue key');
  }
  if (input.sprint != null && Number.isInteger(input.sprint) && input.sprint > 0) {
    await addJiraIssueToSprint(api, key, input.sprint);
  }
  return { id: data.id, key, self: data.self };
}
