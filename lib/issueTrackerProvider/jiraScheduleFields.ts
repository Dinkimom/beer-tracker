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

export function buildJiraSchedulePutFields(
  refs: JiraScheduleFieldRefs,
  input: { deadline?: string; start?: string }
): Record<string, string> {
  const deadline = trimmedDate(input.deadline);
  const start = trimmedDate(input.start);
  if (start && !refs.start) {
    throw new Error('Jira Start date field is not editable on this issue');
  }
  const fields: Record<string, string> = {};
  if (deadline) {
    fields[refs.due.id] = jiraDateFieldValue(deadline, refs.due.schemaType);
  }
  if (start && refs.start) {
    fields[refs.start.id] = jiraDateFieldValue(start, refs.start.schemaType);
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
  let refs: JiraScheduleFieldRefs = {
    due: { id: 'duedate', schemaType: 'date' },
    dueResolved: false,
    start: null,
  };
  try {
    const { data } = await api.get<unknown>(`/issue/${encodeURIComponent(issueKey)}/editmeta`);
    refs = pickJiraScheduleFieldsFromEditmeta(data);
  } catch {
    refs = {
      due: { id: 'duedate', schemaType: 'date' },
      dueResolved: false,
      start: null,
    };
  }
  if (!needsStart || refs.start) {
    return refs;
  }
  try {
    const { data } = await api.get<unknown>('/field');
    return mergeScheduleFieldRefs(refs, pickJiraScheduleFieldsFromCatalog(extractTrackerMetadataArray(data)));
  } catch {
    return refs;
  }
}

/** Maps Yandex `start` / `deadline` onto editable Jira date fields and drops the Yandex keys. */
export async function applyJiraScheduleFields(
  api: AxiosInstance,
  issueKey: string,
  fields: Record<string, unknown>
): Promise<Record<string, unknown>> {
  if (!Object.hasOwn(fields, 'deadline') && !Object.hasOwn(fields, 'start')) {
    return fields;
  }
  const { deadline, start, ...rest } = fields;
  const deadlineDate = trimmedDate(typeof deadline === 'string' ? deadline : undefined);
  const startDate = trimmedDate(typeof start === 'string' ? start : undefined);
  if (!deadlineDate && !startDate) {
    return rest;
  }
  const refs = await loadJiraScheduleFieldRefs(api, issueKey, Boolean(startDate));
  return {
    ...rest,
    ...buildJiraSchedulePutFields(refs, { deadline: deadlineDate, start: startDate }),
  };
}
