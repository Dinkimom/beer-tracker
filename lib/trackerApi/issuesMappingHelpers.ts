import type { Task } from '@/types';
import type { SprintObject, TrackerIssue } from '@/types/tracker';

import { getIssueTrackerProviderKind, getTrackerConfig } from '@/lib/env';
import { issueTrackerIssueWebUrl } from '@/lib/issueTrackerProvider/issueTrackerUi';
import { parseSlaBugFieldsFromIssue } from '@/lib/slaBugs/parseSlaBugFields';
import { readIssueTagTokens } from '@/lib/trackerIntegration/issueFieldUtils';
import { mapStatus } from '@/utils/statusMapper';

function mapTeam(functionalTeam?: string): 'Back' | 'DevOps' | 'QA' | 'Web' {
  const teamStr = (functionalTeam || '').toLowerCase();

  if (teamStr.includes('backend') || teamStr.includes('back')) {
    return 'Back';
  }
  if (
    teamStr.includes('frontend') ||
    teamStr.includes('vue') ||
    teamStr.includes('angular')
  ) {
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

function isSprintObject(value: unknown): value is SprintObject {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'display' in value
  );
}

function isSprintString(value: unknown): value is string {
  return typeof value === 'string';
}

function isSprintArray(value: unknown): value is Array<SprintObject | string> {
  return Array.isArray(value);
}

function mapSprintArrayItem(s: SprintObject | string): { display: string; id: string } {
  if (isSprintString(s)) {
    return { id: s, display: s };
  }
  if (isSprintObject(s)) {
    return { id: s.id, display: s.display };
  }
  return { id: String(s), display: String(s) };
}

function normalizeSprintField(
  sprint: TrackerIssue['sprint']
): Array<{ display: string; id: string }> | undefined {
  if (!sprint) {
    return undefined;
  }

  if (isSprintArray(sprint)) {
    return sprint.map(mapSprintArrayItem);
  }

  if (isSprintObject(sprint)) {
    return [{ id: sprint.id, display: sprint.display }];
  }

  if (isSprintString(sprint)) {
    return [{ id: sprint, display: sprint }];
  }

  return undefined;
}

function parseIncidentSeverity(
  v: string | { display?: string; key?: string } | undefined
): string | undefined {
  if (!v) return undefined;
  return typeof v === 'string' ? v : v.display ?? v.key ?? undefined;
}

function parseDangerousReleaseFromObject(v: object): string | undefined {
  const obj = v as { display?: string; key?: string };
  const display = typeof obj.display === 'string' ? obj.display.trim() : '';
  if (display) {
    return display;
  }
  const key = typeof obj.key === 'string' ? obj.key.trim() : '';
  return key || undefined;
}

function parseDangerousRelease(
  v: TrackerIssue['dangerousRelease']
): string | undefined {
  if (v == null) {
    return undefined;
  }
  if (typeof v === 'string') {
    const trimmed = v.trim();
    return trimmed || undefined;
  }
  if (typeof v === 'boolean' || typeof v === 'number') {
    return String(v);
  }
  if (typeof v === 'object') {
    return parseDangerousReleaseFromObject(v);
  }
  return undefined;
}

function optionalPoints(value: number | null | undefined): number | undefined {
  return value !== undefined && value !== null ? value : undefined;
}

function trackerRefToken(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return '';
}

function mapTrackerIssueParentRef(
  ref: TrackerIssue['epic'] | TrackerIssue['parent']
): Task['parent'] {
  if (!ref) {
    return undefined;
  }
  const rec = ref as unknown as Record<string, unknown>;
  const key = trackerRefToken(rec.key) || trackerRefToken(rec.id);
  if (!key) {
    return undefined;
  }
  const self = typeof rec.self === 'string' ? rec.self : undefined;
  return {
    display: trackerRefToken(rec.display) || trackerRefToken(rec.name) || key,
    id: trackerRefToken(rec.id) || key,
    key,
    ...(self ? { self } : {}),
  };
}

function mapTrackerIssueParent(issue: TrackerIssue): Task['parent'] {
  return mapTrackerIssueParentRef(issue.parent);
}

function mapTrackerIssueEpic(issue: TrackerIssue): Task['epic'] {
  return mapTrackerIssueParentRef(issue.epic);
}

function mapTrackerIssueQueue(
  issue: TrackerIssue
): Pick<Task, 'trackerQueue' | 'trackerQueueName'> {
  const queue = issue.queue;
  if (!queue) {
    return {};
  }
  if (typeof queue === 'string') {
    const key = queue.trim();
    return key ? { trackerQueue: key, trackerQueueName: key } : {};
  }
  const key = queue.key?.trim() || queue.id?.trim() || '';
  if (!key) {
    return {};
  }
  const name = queue.display?.trim() || key;
  return { trackerQueue: key, trackerQueueName: name };
}

export interface MapTrackerIssueToTaskOptions {
  /** Список планера: описание грузит GET /api/issues/:key при открытии сайдбара. */
  omitDescription?: boolean;
}

export function mapTrackerIssueToTaskBase(
  issue: TrackerIssue,
  options?: MapTrackerIssueToTaskOptions
): Task {
  const statusKey = issue.status?.key || issue.statusType?.key;
  const team = mapTeam(issue.functionalTeam);
  const sprints = normalizeSprintField(issue.sprint);
  const slaFields = parseSlaBugFieldsFromIssue(issue);
  const queueFields = mapTrackerIssueQueue(issue);

  return {
    id: issue.key,
    name: issue.summary,
    MergeRequestLink: issue.MergeRequestLink,
    link: issueTrackerIssueWebUrl(
      getIssueTrackerProviderKind(),
      issue.key,
      getTrackerConfig().apiUrl
    ),
    ...(options?.omitDescription ? {} : { description: issue.description }),
    createdAt: issue.createdAt,
    storyPoints: optionalPoints(issue.storyPoints),
    testPoints: optionalPoints(issue.testPoints),
    team,
    assignee: issue.assignee?.id,
    assigneeName: issue.assignee?.display,
    qaEngineer: issue.qaEngineer?.id,
    qaEngineerName: issue.qaEngineer?.display,
    status: statusKey ? mapStatus(statusKey) : undefined,
    originalStatus: statusKey,
    statusTypeKey: issue.statusType?.key,
    priority: issue.priority?.key || issue.priority?.display,
    type: issue.type?.key || issue.type?.display || 'task',
    parent: mapTrackerIssueParent(issue),
    epic: mapTrackerIssueEpic(issue),
    functionalTeam: issue.functionalTeam || undefined,
    productTeam:
      issue.bizErpTeam && issue.bizErpTeam.length > 0 ? issue.bizErpTeam : undefined,
    stage: issue.stage || undefined,
    sprints,
    incidentSeverity: parseIncidentSeverity(
      (issue as { incidentSeverity?: string | { display?: string; key?: string } }).incidentSeverity
    ),
    dangerousRelease: parseDangerousRelease(issue.dangerousRelease),
    hdCount: slaFields.hdCount,
    hdGrowth24h: slaFields.hdGrowth24h,
    hdGrowth7d: slaFields.hdGrowth7d,
    keyClient: slaFields.keyClient,
    supPriority: slaFields.supPriority,
    slaDeadline: slaFields.slaDeadline,
    lastHdAt: slaFields.lastHdAt,
    trackerTags: readIssueTagTokens(issue),
    updatedAt: issue.updatedAt,
    resolvedAt: issue.resolvedAt,
    ...queueFields,
  };
}
