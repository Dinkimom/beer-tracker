import type {
  IssueTrackerCreateRelatedIssueInput,
  IssueTrackerIssue,
  IssueTrackerScreenField,
  IssueTrackerSprintMembershipUpdateResult,
  IssueTrackerSprintRef,
} from './types';
import type { TrackerIssue } from '@/types/tracker';
import type { AxiosInstance } from 'axios';

import { fetchScreen, getTransitionScreenFields } from '@/lib/trackerApi';

import {
  enrichYandexScreenFieldSeeds,
  loadResolutionOptionsForIssue,
  seedsNeedResolutionOptions,
} from './yandexTrackerProviderScreenFieldEnrichment';

const YANDEX_KNOWN_ISSUE_FIELDS = new Set([
  'assignee',
  'bizErpTeam',
  'checklistDone',
  'checklistItems',
  'checklistTotal',
  'createdAt',
  'dangerousRelease',
  'deadline',
  'description',
  'epic',
  'functionalTeam',
  'id',
  'incidentSeverity',
  'key',
  'MergeRequestLink',
  'parent',
  'priority',
  'qaEngineer',
  'self',
  'sprint',
  'stage',
  'start',
  'status',
  'statusType',
  'storyPoints',
  'summary',
  'testPoints',
  'type',
  'updatedAt',
]);

import {
  applyOptionalProductTeam,
  applyOptionalRefField,
  applyOptionalStringField,
  buildTrackerIssueFromProviderIssue,
  type YandexRelatedIssuePayload,
} from './yandexTrackerIssueMappingHelpers';

function extractYandexCustomFields(issue: TrackerIssue): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const rec = issue as unknown as Record<string, unknown>;
  for (const [key, value] of Object.entries(rec)) {
    if (!YANDEX_KNOWN_ISSUE_FIELDS.has(key)) {
      out[key] = value;
    }
  }
  return out;
}

export function normalizeYandexIssue(issue: TrackerIssue): IssueTrackerIssue {
  const customFields = extractYandexCustomFields(issue);
  return {
    assignee: issue.assignee,
    createdAt: issue.createdAt,
    customFields,
    dangerousRelease: issue.dangerousRelease,
    deadline: issue.deadline,
    description: issue.description,
    epic: issue.epic,
    functionalTeam: issue.functionalTeam,
    id: issue.id,
    incidentSeverity: issue.incidentSeverity,
    key: issue.key,
    mergeRequestLink: issue.MergeRequestLink,
    parent: issue.parent,
    priority: issue.priority,
    productTeam: issue.bizErpTeam,
    provider: 'yandex-tracker',
    qaEngineer: issue.qaEngineer,
    raw: issue,
    self: issue.self,
    sprint: issue.sprint,
    stage: issue.stage,
    start: issue.start,
    status: issue.status,
    statusType: issue.statusType,
    storyPoints: issue.storyPoints,
    summary: issue.summary,
    testPoints: issue.testPoints,
    type: issue.type,
    updatedAt: issue.updatedAt,
  };
}

export function yandexIssueFromProviderIssue(issue: IssueTrackerIssue): TrackerIssue {
  const raw = issue.raw;
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const rec = raw as Partial<TrackerIssue>;
    if (rec.key === issue.key) {
      return raw as TrackerIssue;
    }
  }

  return buildTrackerIssueFromProviderIssue(issue);
}

function parseYandexNumericId(raw: number | string | null | undefined): number | undefined {
  if (raw == null) {
    return undefined;
  }
  const n = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
  return Number.isFinite(n) ? n : undefined;
}

function yandexSprintRefsFromField(sprints: unknown): IssueTrackerSprintRef[] {
  if (!Array.isArray(sprints)) {
    return [];
  }
  return sprints
    .map((s): IssueTrackerSprintRef | null => {
      if (typeof s === 'string' || typeof s === 'number') {
        return { id: String(s) };
      }
      if (s && typeof s === 'object' && 'id' in s) {
        return { id: String((s as { id: unknown }).id) };
      }
      return null;
    })
    .filter((s): s is IssueTrackerSprintRef => Boolean(s?.id));
}

function uniqueNumbers(values: Array<number | undefined>): number[] {
  return [...new Set(values.filter((v): v is number => typeof v === 'number' && !Number.isNaN(v)))];
}

async function getYandexSprintBoardId(
  api: AxiosInstance,
  sprintId: string
): Promise<number | undefined> {
  try {
    const { data } = await api.get<{ board?: { id?: number | string } }>(`/sprints/${sprintId}`);
    return parseYandexNumericId(data.board?.id);
  } catch {
    return undefined;
  }
}

async function getYandexSprintBoardIds(
  api: AxiosInstance,
  sprintIds: string[]
): Promise<number[]> {
  const boardIds = await Promise.all(sprintIds.map((id) => getYandexSprintBoardId(api, id)));
  return uniqueNumbers(boardIds);
}

function sprintMembershipResult(
  affectedSprintRefs: Array<IssueTrackerSprintRef | string>,
  backlogBoardIds: number[]
): IssueTrackerSprintMembershipUpdateResult {
  return {
    affectedSprintIds: uniqueNumbers(
      affectedSprintRefs.map((s) => parseYandexNumericId(typeof s === 'string' ? s : s.id))
    ),
    backlogBoardIds: uniqueNumbers(backlogBoardIds),
  };
}

export async function addYandexIssueToSprint(
  api: AxiosInstance,
  issueKey: string,
  sprintId: number
): Promise<IssueTrackerSprintMembershipUpdateResult> {
  const [issueResponse, newSprintResponse] = await Promise.all([
    api.get<{ sprint?: unknown }>(`/issues/${issueKey}`),
    api.get<{ board?: { id?: number | string } }>(`/sprints/${sprintId}`),
  ]);

  const currentSprints = yandexSprintRefsFromField(issueResponse.data.sprint);
  const currentSprintIds = currentSprints.map((s) => s.id);
  const nextSprintId = String(sprintId);
  if (currentSprintIds.includes(nextSprintId)) {
    return sprintMembershipResult([], []);
  }

  const newSprintBoardId = parseYandexNumericId(newSprintResponse.data.board?.id);
  let sprintsToKeep: IssueTrackerSprintRef[] = [];

  if (currentSprintIds.length > 0 && newSprintBoardId != null) {
    const sprintInfos = await Promise.all(
      currentSprintIds.map(async (id) => ({ id, boardId: await getYandexSprintBoardId(api, id) }))
    );
    sprintsToKeep = sprintInfos
      .filter((info) => info.boardId !== newSprintBoardId)
      .map((info) => ({ id: info.id }));
  }

  sprintsToKeep.push({ id: nextSprintId });
  await api.patch(`/issues/${issueKey}`, { sprint: sprintsToKeep });

  return sprintMembershipResult(
    [...sprintsToKeep, ...currentSprintIds],
    newSprintBoardId == null ? [] : [newSprintBoardId]
  );
}

export async function removeYandexIssueFromSprint(
  api: AxiosInstance,
  issueKey: string,
  sprintId: string
): Promise<IssueTrackerSprintMembershipUpdateResult> {
  const backlogBoardId = await getYandexSprintBoardId(api, sprintId);
  const { data: issue } = await api.get<{ sprint?: unknown }>(`/issues/${issueKey}`);
  const currentSprints = yandexSprintRefsFromField(issue.sprint);
  const updatedSprints = currentSprints.filter((s) => s.id !== String(sprintId));

  await api.patch(`/issues/${issueKey}`, { sprint: updatedSprints });

  return sprintMembershipResult(
    [sprintId, ...updatedSprints],
    backlogBoardId == null ? [] : [backlogBoardId]
  );
}

export async function replaceYandexIssueSprints(
  api: AxiosInstance,
  issueKey: string,
  sprints: IssueTrackerSprintRef[]
): Promise<IssueTrackerSprintMembershipUpdateResult> {
  const { data: issue } = await api.get<{ sprint?: unknown }>(`/issues/${issueKey}`);
  const currentSprints = yandexSprintRefsFromField(issue.sprint);
  await api.patch(`/issues/${issueKey}`, { sprint: sprints });

  const affectedIds = [...currentSprints.map((s) => s.id), ...sprints.map((s) => s.id)];
  const backlogBoardIds = await getYandexSprintBoardIds(api, [...new Set(affectedIds)]);
  return sprintMembershipResult(affectedIds, backlogBoardIds);
}

function extractYandexStringOrKey(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value;
  }
  if (value && typeof value === 'object') {
    const obj = value as { id?: string; key?: string };
    return obj.key || obj.id;
  }
  return undefined;
}

function requireYandexSourceField(
  sourceIssue: Record<string, unknown>,
  field: 'queue' | 'type'
): string {
  const value = extractYandexStringOrKey(sourceIssue[field]);
  if (!value) {
    throw new Error(`Source issue has no ${field}`);
  }
  return value;
}

function applyOptionalPointsFields(
  payload: YandexRelatedIssuePayload,
  input: IssueTrackerCreateRelatedIssueInput
): void {
  if (input.storyPoints !== undefined && input.storyPoints !== null) {
    payload.storyPoints = input.storyPoints;
  }
  if (input.testPoints !== undefined && input.testPoints !== null) {
    payload.testPoints = input.testPoints;
  }
}

function buildYandexRelatedIssuePayload(
  sourceIssue: Record<string, unknown>,
  input: IssueTrackerCreateRelatedIssueInput
): YandexRelatedIssuePayload {
  const payload: YandexRelatedIssuePayload = {
    summary: input.title,
    queue: requireYandexSourceField(sourceIssue, 'queue'),
    type: input.type || requireYandexSourceField(sourceIssue, 'type'),
  };

  applyOptionalStringField(
    payload,
    'description',
    typeof sourceIssue.description === 'string' ? sourceIssue.description : undefined
  );
  applyOptionalRefField(
    payload,
    'priority',
    input.priority || extractYandexStringOrKey(sourceIssue.priority)
  );
  applyOptionalRefField(
    payload,
    'assignee',
    input.assignee || extractYandexStringOrKey(sourceIssue.assignee)
  );
  applyOptionalStringField(
    payload,
    'functionalTeam',
    input.functionalTeam ||
      (typeof sourceIssue.functionalTeam === 'string' ? sourceIssue.functionalTeam : undefined)
  );
  applyOptionalProductTeam(payload, input.productTeam || sourceIssue.bizErpTeam);
  applyOptionalStringField(
    payload,
    'stage',
    input.stage || (typeof sourceIssue.stage === 'string' ? sourceIssue.stage : undefined)
  );
  applyOptionalRefField(
    payload,
    'parent',
    input.parent || extractYandexStringOrKey(sourceIssue.parent)
  );
  applyOptionalPointsFields(payload, input);

  return payload;
}

async function addYandexRelatedIssueToSprintIfNeeded(
  api: AxiosInstance,
  newIssue: Record<string, unknown>,
  sprintId: number | null | undefined
): Promise<void> {
  if (!sprintId) {
    return;
  }
  try {
    const currentSprints = yandexSprintRefsFromField(newIssue.sprint);
    const nextSprintId = sprintId.toString();
    if (currentSprints.some((s) => s.id === nextSprintId)) {
      return;
    }
    await api.patch(`/issues/${String(newIssue.key)}`, {
      sprint: [...currentSprints, { id: nextSprintId }],
    });
  } catch (error) {
    console.error('Failed to add issue to sprint:', error);
  }
}

async function createYandexRelatedIssueLink(
  api: AxiosInstance,
  sourceIssueKey: string,
  newIssueKey: string
): Promise<void> {
  try {
    await api.post(`/issues/${sourceIssueKey}/links`, {
      relationship: 'relates',
      issue: newIssueKey,
    });
  } catch (error) {
    console.error('Failed to create link:', error);
  }
}

export async function createYandexRelatedIssue(
  api: AxiosInstance,
  sourceIssueKey: string,
  input: IssueTrackerCreateRelatedIssueInput
): Promise<unknown> {
  const { data: sourceIssue } = await api.get<Record<string, unknown>>(`/issues/${sourceIssueKey}`);
  const payload = buildYandexRelatedIssuePayload(sourceIssue, input);
  const { data: newIssue } = await api.post<Record<string, unknown>>('/issues', payload);
  const newIssueKey = String(newIssue.key);

  await addYandexRelatedIssueToSprintIfNeeded(api, newIssue, input.sprintId);
  await createYandexRelatedIssueLink(api, sourceIssueKey, newIssueKey);

  return newIssue;
}

export async function getYandexScreenFields(
  screenId: string,
  api: AxiosInstance
): Promise<IssueTrackerScreenField[]> {
  const screen = await fetchScreen(screenId, api);
  const elements = screen.elements ?? [];

  const fieldIds: Array<{ display: string; id: string; required: boolean }> =
    elements.length > 0
      ? elements.map((el) => ({
          id: el.field.id,
          display: el.field.display || el.field.id,
          required: el.required,
        }))
      : [{ id: 'comment', display: 'Комментарий', required: true }];

  return enrichYandexScreenFieldSeeds(fieldIds, api);
}

export async function getYandexTransitionFields(
  issueKey: string,
  transitionId: string,
  api: AxiosInstance
): Promise<IssueTrackerScreenField[]> {
  const raw = await getTransitionScreenFields(issueKey, transitionId, api);
  if (!raw) {
    return [];
  }

  const resolutionOptions = seedsNeedResolutionOptions(raw)
    ? await loadResolutionOptionsForIssue(issueKey, api)
    : undefined;

  return enrichYandexScreenFieldSeeds(raw, api, resolutionOptions);
}
