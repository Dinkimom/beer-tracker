import type { IssueTrackerIssue } from './types';
import type { TrackerIssue } from '@/types/tracker';

function yandexSprintFieldFromProviderIssue(
  sprint: IssueTrackerIssue['sprint']
): TrackerIssue['sprint'] {
  if (Array.isArray(sprint)) {
    return sprint.map((s) => ({ id: s.id, display: s.display ?? s.id }));
  }
  if (sprint && typeof sprint === 'object') {
    return { id: sprint.id, display: sprint.display ?? sprint.id };
  }
  return sprint;
}

function yandexKeyDisplayRef(
  ref: { display?: string; id?: string; key: string } | undefined
): { display: string; id?: string; key: string } | undefined {
  if (!ref) {
    return undefined;
  }
  const id = ref.id?.trim();
  return {
    key: ref.key,
    display: ref.display ?? ref.key,
    ...(id ? { id } : {}),
  };
}

function yandexEpicRef(issue: IssueTrackerIssue): TrackerIssue['epic'] {
  if (!issue.epic) {
    return undefined;
  }
  return {
    display: issue.epic.display ?? issue.epic.key ?? issue.epic.id,
    id: issue.epic.id,
    key: issue.epic.key ?? issue.epic.id,
    self: issue.epic.self ?? '',
  };
}

function yandexParentRef(issue: IssueTrackerIssue): TrackerIssue['parent'] {
  if (!issue.parent) {
    return undefined;
  }
  return {
    display: issue.parent.display ?? issue.parent.key ?? issue.parent.id,
    id: issue.parent.id,
    key: issue.parent.key ?? issue.parent.id,
    self: issue.parent.self ?? '',
  };
}

export function buildTrackerIssueFromProviderIssue(issue: IssueTrackerIssue): TrackerIssue {
  return {
    ...(issue.customFields ?? {}),
    assignee: issue.assignee
      ? { id: issue.assignee.id, display: issue.assignee.display ?? issue.assignee.id }
      : undefined,
    bizErpTeam: issue.productTeam,
    createdAt: issue.createdAt,
    dangerousRelease: issue.dangerousRelease,
    deadline: issue.deadline,
    description: issue.description,
    epic: yandexEpicRef(issue),
    functionalTeam: issue.functionalTeam,
    id: issue.id,
    incidentSeverity: issue.incidentSeverity,
    key: issue.key,
    MergeRequestLink: issue.mergeRequestLink,
    parent: yandexParentRef(issue),
    priority: issue.priority?.key
      ? { key: issue.priority.key, display: issue.priority.display ?? issue.priority.key }
      : undefined,
    qaEngineer: issue.qaEngineer
      ? { id: issue.qaEngineer.id, display: issue.qaEngineer.display ?? issue.qaEngineer.id }
      : undefined,
    self: issue.self ?? '',
    sprint: yandexSprintFieldFromProviderIssue(issue.sprint),
    stage: issue.stage,
    start: issue.start,
    status: yandexKeyDisplayRef(issue.status),
    statusType: yandexKeyDisplayRef(issue.statusType),
    storyPoints: issue.storyPoints,
    summary: issue.summary,
    testPoints: issue.testPoints,
    type: issue.type?.key
      ? { key: issue.type.key, display: issue.type.display ?? issue.type.key }
      : undefined,
    updatedAt: issue.updatedAt,
  };
}

interface YandexRelatedIssuePayload {
  assignee?: string;
  bizErpTeam?: string[];
  description?: string;
  functionalTeam?: string;
  parent?: string;
  priority?: string;
  queue?: string;
  stage?: string;
  storyPoints?: number;
  summary: string;
  testPoints?: number;
  type?: string;
}

type OptionalStringPayloadKey = 'description' | 'functionalTeam' | 'stage';
type OptionalRefPayloadKey = 'assignee' | 'parent' | 'priority';

function applyOptionalPayloadString(
  payload: YandexRelatedIssuePayload,
  key: OptionalRefPayloadKey | OptionalStringPayloadKey,
  value: string | undefined
): void {
  if (value) {
    payload[key] = value;
  }
}

export function applyOptionalStringField(
  payload: YandexRelatedIssuePayload,
  key: OptionalStringPayloadKey,
  value: string | undefined
): void {
  applyOptionalPayloadString(payload, key, value);
}

export function applyOptionalRefField(
  payload: YandexRelatedIssuePayload,
  key: OptionalRefPayloadKey,
  value: string | undefined
): void {
  applyOptionalPayloadString(payload, key, value);
}

export function applyOptionalProductTeam(
  payload: YandexRelatedIssuePayload,
  productTeam: unknown
): void {
  if (Array.isArray(productTeam)) {
    payload.bizErpTeam = productTeam.filter((x): x is string => typeof x === 'string');
  }
}

export type { YandexRelatedIssuePayload };
