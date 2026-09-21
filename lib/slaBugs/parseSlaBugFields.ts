import type { SlaBugInput, SlaPriority } from './types';
import type { Task } from '@/types';
import type { TrackerIssue } from '@/types/tracker';

import { readIssueTagTokens } from '@/lib/trackerIntegration/issueFieldUtils';
import { mapStatus } from '@/utils/statusMapper';

import { asBoolean, asDateString, asNumber } from './parseSlaBugCoercionHelpers';
import { parseSlaPriorityFromSeverity } from './parseSlaPriorityHelpers';
import { resolveLastHdAt } from './slaBugMetrics';

interface SlaBugFieldIds {
  hdCountFieldId?: string;
  hdGrowth7dFieldId?: string;
  hdGrowth24hFieldId?: string;
  keyClientFieldId?: string;
  lastHdAtFieldId?: string;
  slaDeadlineFieldId?: string;
  supPriorityFieldId?: string;
}

const HD_COUNT_ALIASES = [
  'HD_count',
  'hd_count',
  'hdCount',
  'HDCount',
  'helpdeskCount',
  'helpDeskCount',
] as const;

const HD_GROWTH_24H_ALIASES = [
  'HD_growth24h',
  'hd_growth24h',
  'HD_growth_24h',
  'hd_growth_24h',
  'HD_count24h',
  'hdCount24h',
  'hdCountGrowth24h',
] as const;

const HD_GROWTH_7D_ALIASES = [
  'HD_growth7d',
  'hd_growth7d',
  'HD_growth_7d',
  'hd_growth_7d',
  'HD_count7d',
  'hdCount7d',
  'hdCountGrowth7d',
] as const;

const KEY_CLIENT_ALIASES = ['key_client', 'keyClient', 'KeyClient', 'key-client'] as const;

const SUP_PRIORITY_ALIASES = ['sup_priority', 'supPriority', 'SupPriority', 'sup-priority'] as const;

const SLA_DEADLINE_ALIASES = [
  'slaDeadline',
  'sla_deadline',
  'slaDate',
  'sla_date',
  'SLADate',
  'slaAt',
  'sla',
  'SLA',
  'deadline',
] as const;

const LAST_HD_ALIASES = ['lastHDAt', 'last_hd_at', 'lastHdAt', 'lastHDDate', 'lastHdDate'] as const;

const KEY_CLIENT_TAGS = new Set(['key_client', 'keyclient', 'key-client', 'ключевой', 'keyclient']);
const SUP_PRIORITY_TAGS = new Set([
  'sup_priority',
  'suppriority',
  'sup-priority',
  'пуш_поддержки',
  'пушподдержки',
  'supprioritypush',
]);

function readCustomFieldValue(rec: Record<string, unknown>, fieldId: string, snake: string): unknown {
  const customFields = rec.customFields;
  if (!customFields || typeof customFields !== 'object' || Array.isArray(customFields)) {
    return undefined;
  }
  const cf = customFields as Record<string, unknown>;
  if (Object.prototype.hasOwnProperty.call(cf, fieldId)) {
    return cf[fieldId];
  }
  if (snake !== fieldId && Object.prototype.hasOwnProperty.call(cf, snake)) {
    return cf[snake];
  }
  return undefined;
}

function readRawFieldValue(issue: TrackerIssue, fieldId: string): unknown {
  const rec = issue as unknown as Record<string, unknown>;
  if (Object.prototype.hasOwnProperty.call(rec, fieldId)) {
    return rec[fieldId];
  }
  const snake = fieldId.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
  if (snake !== fieldId && Object.prototype.hasOwnProperty.call(rec, snake)) {
    return rec[snake];
  }
  return readCustomFieldValue(rec, fieldId, snake);
}

function readFirstMatchingField(issue: TrackerIssue, aliases: readonly string[]): unknown {
  for (const alias of aliases) {
    const value = readRawFieldValue(issue, alias);
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }
  return undefined;
}

function readConfiguredField(
  issue: TrackerIssue,
  configuredId: string | undefined,
  aliases: readonly string[]
): unknown {
  if (configuredId) {
    const direct = readRawFieldValue(issue, configuredId);
    if (direct !== undefined && direct !== null && direct !== '') {
      return direct;
    }
  }
  return readFirstMatchingField(issue, aliases);
}

function hasMatchingTag(issue: TrackerIssue, tagSet: Set<string>): boolean {
  return readIssueTagTokens(issue).some((tag) => tagSet.has(tag));
}

export function parseSlaPriority(incidentSeverity: string | undefined): SlaPriority | null {
  return parseSlaPriorityFromSeverity(incidentSeverity);
}

export function parseSlaBugFieldsFromIssue(
  issue: TrackerIssue,
  fieldIds?: SlaBugFieldIds
): Omit<SlaBugInput, 'id' | 'priority'> {
  const hdCountRaw = readConfiguredField(issue, fieldIds?.hdCountFieldId, HD_COUNT_ALIASES);
  const hdGrowth24hRaw = readConfiguredField(
    issue,
    fieldIds?.hdGrowth24hFieldId,
    HD_GROWTH_24H_ALIASES
  );
  const hdGrowth7dRaw = readConfiguredField(issue, fieldIds?.hdGrowth7dFieldId, HD_GROWTH_7D_ALIASES);
  const keyClientRaw = readConfiguredField(issue, fieldIds?.keyClientFieldId, KEY_CLIENT_ALIASES);
  const supPriorityRaw = readConfiguredField(
    issue,
    fieldIds?.supPriorityFieldId,
    SUP_PRIORITY_ALIASES
  );
  const slaDeadlineRaw = readConfiguredField(
    issue,
    fieldIds?.slaDeadlineFieldId,
    SLA_DEADLINE_ALIASES
  );
  const lastHdRaw = readConfiguredField(issue, fieldIds?.lastHdAtFieldId, LAST_HD_ALIASES);
  const statusKey = issue.status?.key || issue.statusType?.key;
  const inActiveWork = statusKey ? mapStatus(statusKey) === 'in-progress' : false;

  return {
    createdAt: issue.createdAt,
    hdCount: asNumber(hdCountRaw),
    hdGrowth24h: asNumber(hdGrowth24hRaw),
    hdGrowth7d: asNumber(hdGrowth7dRaw),
    inActiveWork,
    keyClient: asBoolean(keyClientRaw) || hasMatchingTag(issue, KEY_CLIENT_TAGS),
    lastHdAt: asDateString(lastHdRaw),
    slaDeadline: asDateString(slaDeadlineRaw),
    supPriority: asBoolean(supPriorityRaw) || hasMatchingTag(issue, SUP_PRIORITY_TAGS),
    updatedAt: issue.updatedAt,
  };
}

export function taskToSlaBugInput(task: Task): SlaBugInput | null {
  const priority = parseSlaPriority(task.incidentSeverity);
  if (!priority) {
    return null;
  }
  return {
    id: task.id,
    priority,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    hdCount: task.hdCount ?? 0,
    hdGrowth24h: task.hdGrowth24h ?? 0,
    hdGrowth7d: task.hdGrowth7d ?? 0,
    inActiveWork: task.status === 'in-progress',
    keyClient: task.keyClient === true,
    supPriority: task.supPriority === true,
    slaDeadline: task.slaDeadline,
    lastHdAt: resolveLastHdAt(task.hdCount ?? 0, task.lastHdAt, task.createdAt),
  };
}

export function isSlaBugTask(task: Task): boolean {
  if ((task.type ?? '').toLowerCase() !== 'bug') {
    return false;
  }
  return parseSlaPriority(task.incidentSeverity) !== null;
}
