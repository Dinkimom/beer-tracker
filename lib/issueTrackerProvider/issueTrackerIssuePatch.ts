import type { IssueTrackerIssuePatch } from './types';

export function splitIssueTrackerIssuePatch(patch: IssueTrackerIssuePatch): {
  assigneeField?: string;
  assigneeId?: string;
  isQa?: boolean;
  rest: Record<string, unknown>;
} {
  const { assigneeField, assigneeId, isQa, customFields, ...known } = patch;
  const rest: Record<string, unknown> = { ...known };
  if (customFields) {
    Object.assign(rest, customFields);
  }
  return {
    rest,
    ...(typeof assigneeField === 'string' ? { assigneeField } : {}),
    ...(typeof assigneeId === 'string' ? { assigneeId } : {}),
    ...(typeof isQa === 'boolean' ? { isQa } : {}),
  };
}

/** Yandex Tracker PATCH body: domain assignee keys become `{ assignee|qaEngineer|custom: { id } }`. */
export function yandexIssueUpdateBody(patch: IssueTrackerIssuePatch): Record<string, unknown> {
  const { assigneeField, assigneeId, isQa, rest } = splitIssueTrackerIssuePatch(patch);
  if (typeof assigneeId !== 'string' || !assigneeId.trim()) {
    return rest;
  }
  const fieldKey =
    (typeof assigneeField === 'string' && assigneeField.trim()) ||
    (isQa ? 'qaEngineer' : 'assignee');
  return { ...rest, [fieldKey]: { id: assigneeId.trim() } };
}
