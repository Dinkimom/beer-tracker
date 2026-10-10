import type { TrackerIssue } from '@/types/tracker';
import type { AxiosInstance } from 'axios';

import { extractTrackerMetadataArray } from '@/lib/trackerIntegration/fetchTrackerOrgMetadataHelpers';

const START_DATE_NAMES = new Set(['start date', 'дата начала']);
const TARGET_START_NAMES = new Set(['target start', 'целевое начало']);
const END_DATE_NAMES = new Set([
  'due date',
  'end date',
  'target end',
  'дата выполнения',
  'дата завершения',
  'дата окончания',
  'срок исполнения',
  'целевое окончание',
]);

interface JiraDateFieldRef {
  id: string;
  schemaType?: string;
}

interface JiraScheduleFieldRefs {
  due: JiraDateFieldRef;
  dueResolved: boolean;
  start: JiraDateFieldRef | null;
}

const DEFAULT_SCHEDULE_REFS: JiraScheduleFieldRefs = {
  due: { id: 'duedate', schemaType: 'date' },
  dueResolved: false,
  start: null,
};

/**
 * Process-wide `/field` catalog cache. Axios instances are per-request in Next.js,
 * so WeakMap-on-api never hits and every planner load would call Jira `/field`.
 */
const scheduleRefsByBaseUrl = new Map<string, Promise<JiraScheduleFieldRefs>>();

function jiraApiCacheKey(api: AxiosInstance): string {
  const base = typeof api.defaults.baseURL === 'string' ? api.defaults.baseURL.trim() : '';
  return base || 'jira';
}

interface JiraNamedDateField {
  id: string;
  name: string;
  schemaType?: string;
  system?: string;
}

interface ScheduleFieldAccumulator {
  due: JiraDateFieldRef | null;
  namedDue: JiraDateFieldRef | null;
  start: JiraDateFieldRef | null;
  targetStart: JiraDateFieldRef | null;
}

function emptyAccumulator(): ScheduleFieldAccumulator {
  return { due: null, namedDue: null, start: null, targetStart: null };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function readSchemaType(schema: Record<string, unknown> | null): string | undefined {
  const type = schema?.type;
  return typeof type === 'string' ? type : undefined;
}

function toDateFieldRef(field: JiraNamedDateField, id = field.id): JiraDateFieldRef {
  return {
    id,
    ...(field.schemaType ? { schemaType: field.schemaType } : {}),
  };
}

function readNamedDateField(id: string, raw: unknown): JiraNamedDateField | null {
  const row = asRecord(raw);
  if (!row || !id) {
    return null;
  }
  const schema = asRecord(row.schema);
  const schemaType = readSchemaType(schema);
  if (schemaType && schemaType !== 'date' && schemaType !== 'datetime') {
    return null;
  }
  const name = typeof row.name === 'string' ? row.name.trim().toLowerCase() : '';
  const system = schema?.system;
  return {
    id,
    name,
    ...(schemaType ? { schemaType } : {}),
    ...(typeof system === 'string' ? { system } : {}),
  };
}

function absorbScheduleField(field: JiraNamedDateField, acc: ScheduleFieldAccumulator): void {
  if (field.system === 'duedate' || field.id === 'duedate') {
    acc.due ??= toDateFieldRef(field, 'duedate');
    return;
  }
  if (START_DATE_NAMES.has(field.name)) {
    acc.start ??= toDateFieldRef(field);
  }
  if (TARGET_START_NAMES.has(field.name)) {
    acc.targetStart ??= toDateFieldRef(field);
  }
  if (END_DATE_NAMES.has(field.name)) {
    acc.namedDue ??= toDateFieldRef(field);
  }
}

function refsFromAccumulator(acc: ScheduleFieldAccumulator): JiraScheduleFieldRefs {
  const due = acc.due ?? acc.namedDue;
  return {
    due: due ?? { id: 'duedate', schemaType: 'date' },
    dueResolved: due != null,
    start: acc.start ?? acc.targetStart,
  };
}

function collectNamedDateFields(fields: JiraNamedDateField[]): JiraScheduleFieldRefs {
  const acc = emptyAccumulator();
  for (const field of fields) {
    absorbScheduleField(field, acc);
  }
  return refsFromAccumulator(acc);
}

export function pickJiraScheduleFieldsFromEditmeta(editmeta: unknown): JiraScheduleFieldRefs {
  const fields = asRecord(asRecord(editmeta)?.fields) ?? {};
  const named: JiraNamedDateField[] = [];
  for (const [id, raw] of Object.entries(fields)) {
    const field = readNamedDateField(id, raw);
    if (field) {
      named.push(field);
    }
  }
  return collectNamedDateFields(named);
}

function catalogFieldId(row: Record<string, unknown>): string {
  if (typeof row.id === 'string' && row.id.trim()) {
    return row.id.trim();
  }
  if (typeof row.key === 'string' && row.key.trim()) {
    return row.key.trim();
  }
  return '';
}

export function pickJiraScheduleFieldsFromCatalog(catalog: unknown[]): JiraScheduleFieldRefs {
  const named: JiraNamedDateField[] = [];
  for (const raw of catalog) {
    const row = asRecord(raw);
    const field = row ? readNamedDateField(catalogFieldId(row), raw) : null;
    if (field) {
      named.push(field);
    }
  }
  return collectNamedDateFields(named);
}

export function jiraDateFieldValue(isoDate: string, schemaType: string | undefined): string {
  const date = isoDate.trim().slice(0, 10);
  if (schemaType === 'datetime') {
    return `${date}T00:00:00.000+0000`;
  }
  return date;
}

function trimmedDate(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function dateOnlyFromFieldValue(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value.trim());
  return match?.[1];
}

function fieldValueFromTrackerIssue(issue: TrackerIssue, fieldId: string): unknown {
  return (issue as unknown as Record<string, unknown>)[fieldId];
}

/**
 * Maps Jira `duedate` / Start date (or Target start) custom fields onto Yandex-shaped
 * `start` / `deadline` so planner fallbacks and patches share one model.
 */
export function applyJiraScheduleFieldRefsToTrackerIssue(
  issue: TrackerIssue,
  refs: JiraScheduleFieldRefs
): TrackerIssue {
  const start =
    trimmedDate(issue.start) ??
    (refs.start ? dateOnlyFromFieldValue(fieldValueFromTrackerIssue(issue, refs.start.id)) : undefined);
  const deadline =
    trimmedDate(issue.deadline) ?? dateOnlyFromFieldValue(fieldValueFromTrackerIssue(issue, refs.due.id));
  if (!start && !deadline) {
    return issue;
  }
  if (start === issue.start && deadline === issue.deadline) {
    return issue;
  }
  return {
    ...issue,
    ...(deadline ? { deadline } : {}),
    ...(start ? { start } : {}),
  };
}

async function fetchJiraScheduleFieldRefsFromCatalog(
  api: AxiosInstance,
  cacheKey: string
): Promise<JiraScheduleFieldRefs> {
  try {
    const { data } = await api.get<unknown>('/field');
    return pickJiraScheduleFieldsFromCatalog(extractTrackerMetadataArray(data));
  } catch {
    scheduleRefsByBaseUrl.delete(cacheKey);
    return DEFAULT_SCHEDULE_REFS;
  }
}

export function loadJiraScheduleFieldRefsFromCatalog(
  api: AxiosInstance
): Promise<JiraScheduleFieldRefs> {
  const cacheKey = jiraApiCacheKey(api);
  const cached = scheduleRefsByBaseUrl.get(cacheKey);
  if (cached) {
    return cached;
  }
  const pending = fetchJiraScheduleFieldRefsFromCatalog(api, cacheKey);
  scheduleRefsByBaseUrl.set(cacheKey, pending);
  return pending;
}

/** Vitest: process-wide `/field` cache must not leak between cases. */
export function clearJiraScheduleFieldRefsCacheForTests(): void {
  scheduleRefsByBaseUrl.clear();
}

/** `string` → write date; `null` → clear field; `undefined` → leave unchanged. */
function scheduleOptionalDate(
  value: string | null | undefined
): string | null | undefined {
  if (value === null) {
    return null;
  }
  if (typeof value === 'string') {
    return trimmedDate(value);
  }
  return undefined;
}

function assertStartFieldEditable(
  refs: JiraScheduleFieldRefs,
  start: string | null | undefined
): void {
  if (start === undefined || refs.start) {
    return;
  }
  throw new Error('Jira Start date field is not editable on this issue');
}

function putScheduleDateField(
  fields: Record<string, string | null>,
  fieldId: string,
  schemaType: string | undefined,
  value: string | null
): void {
  fields[fieldId] = value === null ? null : jiraDateFieldValue(value, schemaType);
}

export function buildJiraSchedulePutFields(
  refs: JiraScheduleFieldRefs,
  input: { deadline?: string | null; start?: string | null }
): Record<string, string | null> {
  const deadline = scheduleOptionalDate(input.deadline);
  const start = scheduleOptionalDate(input.start);
  assertStartFieldEditable(refs, start);
  const fields: Record<string, string | null> = {};
  if (deadline !== undefined) {
    putScheduleDateField(fields, refs.due.id, refs.due.schemaType, deadline);
  }
  if (start !== undefined && refs.start) {
    putScheduleDateField(fields, refs.start.id, refs.start.schemaType, start);
  }
  return fields;
}

function mergeScheduleFieldRefs(
  primary: JiraScheduleFieldRefs,
  fallback: JiraScheduleFieldRefs
): JiraScheduleFieldRefs {
  return {
    due: primary.dueResolved ? primary.due : fallback.due,
    dueResolved: primary.dueResolved || fallback.dueResolved,
    start: primary.start ?? fallback.start,
  };
}

async function loadJiraScheduleFieldRefs(
  api: AxiosInstance,
  issueKey: string,
  needsStart: boolean
): Promise<JiraScheduleFieldRefs> {
  let refs: JiraScheduleFieldRefs = { ...DEFAULT_SCHEDULE_REFS };
  try {
    const { data } = await api.get<unknown>(`/issue/${encodeURIComponent(issueKey)}/editmeta`);
    refs = pickJiraScheduleFieldsFromEditmeta(data);
  } catch {
    refs = { ...DEFAULT_SCHEDULE_REFS };
  }
  if (!needsStart || refs.start) {
    return refs;
  }
  return mergeScheduleFieldRefs(refs, await loadJiraScheduleFieldRefsFromCatalog(api));
}

function schedulePatchDate(value: unknown): string | null | undefined {
  if (value === null || typeof value === 'string') {
    return scheduleOptionalDate(value);
  }
  return undefined;
}

/** Maps Yandex `start` / `deadline` onto editable Jira date fields and drops the Yandex keys. */
export async function applyJiraScheduleFields(
  api: AxiosInstance,
  issueKey: string,
  fields: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const hasDeadline = Object.hasOwn(fields, 'deadline');
  const hasStart = Object.hasOwn(fields, 'start');
  if (!hasDeadline && !hasStart) {
    return fields;
  }
  const { deadline, start, ...rest } = fields;
  const deadlineDate = hasDeadline ? schedulePatchDate(deadline) : undefined;
  const startDate = hasStart ? schedulePatchDate(start) : undefined;
  if (deadlineDate === undefined && startDate === undefined) {
    return rest;
  }
  const needsStart = startDate !== undefined;
  const refs = await loadJiraScheduleFieldRefs(api, issueKey, needsStart);
  return {
    ...rest,
    ...buildJiraSchedulePutFields(refs, {
      ...(deadlineDate !== undefined ? { deadline: deadlineDate } : {}),
      ...(startDate !== undefined ? { start: startDate } : {}),
    }),
  };
}
