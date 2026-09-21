import type { IssueTrackerIssue } from './types';
import type { TrackerIntegrationStored } from '@/lib/trackerIntegration';
import type { Task } from '@/types';
import type { TrackerIssue } from '@/types/tracker';

import { getIssueTrackerProviderKind, getTrackerConfig } from '@/lib/env';
import { parseSlaBugFieldsFromIssue } from '@/lib/slaBugs/parseSlaBugFields';
import { applyTrackerIntegrationToTask } from '@/lib/trackerIntegration';
import { readIssueTagTokens } from '@/lib/trackerIntegration/issueFieldUtils';
import { mapStatus } from '@/utils/statusMapper';

import { issueTrackerIssueWebUrl } from './issueTrackerUi';

function optionalPoints(value: number | null | undefined): number | undefined {
  return value === undefined || value === null ? undefined : value;
}

function mapTeam(functionalTeam?: string): Task['team'] {
  const teamStr = (functionalTeam || '').toLowerCase();
  if (teamStr.includes('backend') || teamStr.includes('back')) {
    return 'Back';
  }
  if (teamStr.includes('frontend') || teamStr.includes('vue') || teamStr.includes('angular')) {
    return 'Web';
  }
  if (teamStr.includes('qa') || teamStr.includes('tester')) {
    return 'QA';
  }
  if (teamStr.includes('devops')) {
    return 'DevOps';
  }
  return 'Back';
}

function mapEntityRef(
  ref: IssueTrackerIssue['epic'] | IssueTrackerIssue['parent']
): Task['parent'] {
  if (!ref) {
    return undefined;
  }
  const key = ref.key?.trim() || ref.id.trim();
  if (!key) {
    return undefined;
  }
  return {
    display: ref.display?.trim() || key,
    id: ref.id.trim() || key,
    key,
    ...(ref.self ? { self: ref.self } : {}),
  };
}

function mapSprintItem(sprint: string | { display?: string; id: string }): {
  display: string;
  id: string;
} {
  if (typeof sprint === 'string') {
    return { display: sprint, id: sprint };
  }
  return { display: sprint.display ?? sprint.id, id: sprint.id };
}

function mapSprints(sprint: IssueTrackerIssue['sprint']): Task['sprints'] {
  if (!sprint) {
    return undefined;
  }
  if (Array.isArray(sprint)) {
    return sprint.map(mapSprintItem);
  }
  return [mapSprintItem(sprint)];
}

function parseIncidentSeverity(value: IssueTrackerIssue['incidentSeverity']): string | undefined {
  if (!value) {
    return undefined;
  }
  return typeof value === 'string' ? value : value.display ?? value.key ?? undefined;
}

function parseDangerousReleaseFromObject(value: object): string | undefined {
  const obj = value as { display?: string; key?: string };
  const display = typeof obj.display === 'string' ? obj.display.trim() : '';
  if (display) {
    return display;
  }
  const key = typeof obj.key === 'string' ? obj.key.trim() : '';
  return key || undefined;
}

function parseDangerousRelease(value: IssueTrackerIssue['dangerousRelease']): string | undefined {
  if (value == null) {
    return undefined;
  }
  if (typeof value === 'string') {
    return value.trim() || undefined;
  }
  if (typeof value === 'boolean' || typeof value === 'number') {
    return String(value);
  }
  if (typeof value === 'object') {
    return parseDangerousReleaseFromObject(value);
  }
  return undefined;
}

function queueFromCustomFields(
  customFields: Record<string, unknown> | undefined
): Pick<Task, 'trackerQueue' | 'trackerQueueName'> {
  const queue = customFields?.queue;
  if (typeof queue === 'string') {
    const key = queue.trim();
    return key ? { trackerQueue: key, trackerQueueName: key } : {};
  }
  if (!queue || typeof queue !== 'object' || Array.isArray(queue)) {
    return {};
  }
  const rec = queue as { display?: string; id?: string; key?: string };
  const key = rec.key?.trim() || rec.id?.trim() || '';
  if (!key) {
    return {};
  }
  return { trackerQueue: key, trackerQueueName: rec.display?.trim() || key };
}

function resolvedAtFromCustomFields(customFields: Record<string, unknown> | undefined): string | undefined {
  const value = customFields?.resolvedAt;
  return typeof value === 'string' ? value : undefined;
}

/** Нормализует дату трекера к YYYY-MM-DD (берёт префикс даты из ISO/datetime). */
function trackerDateOnly(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(trimmed);
  return match?.[1];
}

function customFieldDateString(custom: Record<string, unknown>, key: string): string | undefined {
  const value = custom[key];
  return typeof value === 'string' ? value : undefined;
}

function trackerScheduleDates(issue: IssueTrackerIssue): Pick<Task, 'deadline' | 'start'> {
  const custom = issue.customFields ?? {};
  const start =
    trackerDateOnly(issue.start) ?? trackerDateOnly(customFieldDateString(custom, 'start'));
  const deadline =
    trackerDateOnly(issue.deadline) ??
    trackerDateOnly(customFieldDateString(custom, 'deadline')) ??
    trackerDateOnly(customFieldDateString(custom, 'duedate'));
  return {
    ...(start ? { start } : {}),
    ...(deadline ? { deadline } : {}),
  };
}

function trackerStatusRef(
  status: { display?: string; key: string } | undefined
): { display: string; key: string } | undefined {
  return status ? { display: status.display ?? status.key, key: status.key } : undefined;
}

/**
 * Field bag for SLA/integration lookups. Spreads `customFields` only — never `issue.raw`.
 */
function issueTrackerIssueFieldBag(issue: IssueTrackerIssue): TrackerIssue {
  return {
    ...(issue.customFields ?? {}),
    assignee: issue.assignee
      ? { display: issue.assignee.display ?? issue.assignee.id, id: issue.assignee.id }
      : undefined,
    createdAt: issue.createdAt,
    dangerousRelease: issue.dangerousRelease,
    description: issue.description,
    functionalTeam: issue.functionalTeam,
    id: issue.id,
    incidentSeverity: issue.incidentSeverity,
    key: issue.key,
    MergeRequestLink: issue.mergeRequestLink,
    qaEngineer: issue.qaEngineer
      ? { display: issue.qaEngineer.display ?? issue.qaEngineer.id, id: issue.qaEngineer.id }
      : undefined,
    self: issue.self ?? '',
    status: trackerStatusRef(issue.status),
    statusType: trackerStatusRef(issue.statusType),
    storyPoints: issue.storyPoints,
    summary: issue.summary,
    testPoints: issue.testPoints,
    updatedAt: issue.updatedAt,
    ...(issue.start ? { start: issue.start } : {}),
    ...(issue.deadline ? { deadline: issue.deadline } : {}),
  };
}

function mapIssueTrackerIssueToTaskBase(
  issue: IssueTrackerIssue,
  fieldBag: TrackerIssue,
  options?: { omitDescription?: boolean }
): Task {
  const statusKey = issue.status?.key || issue.statusType?.key;
  const appStatusKey = issue.statusType?.key || statusKey;
  const sla = parseSlaBugFieldsFromIssue(fieldBag);
  return {
    id: issue.key,
    name: issue.summary,
    MergeRequestLink: issue.mergeRequestLink,
    link: issueTrackerIssueWebUrl(
      getIssueTrackerProviderKind(),
      issue.key,
      getTrackerConfig().apiUrl
    ),
    ...(options?.omitDescription ? {} : { description: issue.description }),
    createdAt: issue.createdAt,
    storyPoints: optionalPoints(issue.storyPoints),
    testPoints: optionalPoints(issue.testPoints),
    team: mapTeam(issue.functionalTeam),
    assignee: issue.assignee?.id,
    assigneeName: issue.assignee?.display,
    qaEngineer: issue.qaEngineer?.id,
    qaEngineerName: issue.qaEngineer?.display,
    status: appStatusKey ? mapStatus(appStatusKey) : undefined,
    originalStatus: statusKey,
    statusTypeKey: issue.statusType?.key,
    priority: issue.priority?.key || issue.priority?.display,
    type: issue.type?.key || issue.type?.display || 'task',
    parent: mapEntityRef(issue.parent),
    epic: mapEntityRef(issue.epic),
    functionalTeam: issue.functionalTeam || undefined,
    productTeam: issue.productTeam && issue.productTeam.length > 0 ? issue.productTeam : undefined,
    stage: issue.stage || undefined,
    sprints: mapSprints(issue.sprint),
    incidentSeverity: parseIncidentSeverity(issue.incidentSeverity),
    dangerousRelease: parseDangerousRelease(issue.dangerousRelease),
    hdCount: sla.hdCount,
    hdGrowth24h: sla.hdGrowth24h,
    hdGrowth7d: sla.hdGrowth7d,
    keyClient: sla.keyClient,
    supPriority: sla.supPriority,
    slaDeadline: sla.slaDeadline,
    lastHdAt: sla.lastHdAt,
    trackerTags: readIssueTagTokens(fieldBag),
    updatedAt: issue.updatedAt,
    resolvedAt: resolvedAtFromCustomFields(issue.customFields),
    ...queueFromCustomFields(issue.customFields),
    ...trackerScheduleDates(issue),
  };
}

export function mapIssueTrackerIssueToTask(
  issue: IssueTrackerIssue,
  integration?: TrackerIntegrationStored | null,
  options?: { omitDescription?: boolean }
): Task {
  const fieldBag = issueTrackerIssueFieldBag(issue);
  return applyTrackerIntegrationToTask(
    fieldBag,
    mapIssueTrackerIssueToTaskBase(issue, fieldBag, options),
    integration ?? null
  );
}
