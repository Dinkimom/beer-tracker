import type { IssueTrackerCreateSprintInput, IssueTrackerSprintStatus } from './types';
import type { SprintInfo, SprintListItem } from '@/types/tracker';
import type { AxiosInstance } from 'axios';

import {
  jiraAgileBoardSprintsUrl,
  jiraAgileSprintByIdUrl,
  jiraAgileSprintCreateUrl,
  jiraGreenhopperSprintCompleteUrl,
  jiraGreenhopperSprintQueryUrl,
  jiraGreenhopperSprintStartUrl,
  shouldStopJiraBoardPages,
} from './jiraCatalog';
import { parseJiraSprintDate } from './jiraSprintDates';

const EMPTY_CREATED_BY = { cloudUid: '', display: '', id: '', passportUid: 0, self: '' };

interface JiraSprintRaw {
  completeDate?: unknown;
  endDate?: unknown;
  id?: unknown;
  name?: unknown;
  originBoardId?: unknown;
  rapidViewId?: unknown;
  self?: unknown;
  startDate?: unknown;
  state?: unknown;
}

export function extractJiraSprintRows(data: unknown): unknown[] {
  if (Array.isArray(data)) {
    return data;
  }
  if (!data || typeof data !== 'object') {
    return [];
  }
  const page = data as { sprints?: unknown; values?: unknown };
  if (Array.isArray(page.sprints)) {
    return page.sprints;
  }
  if (Array.isArray(page.values)) {
    return page.values;
  }
  return [];
}

export function mapJiraSprintState(state: unknown): { archived: boolean; status: string } {
  const key = typeof state === 'string' ? state.trim().toLowerCase() : '';
  if (key === 'active') {
    return { archived: false, status: 'in_progress' };
  }
  if (key === 'closed' || key === 'complete') {
    return { archived: true, status: 'archived' };
  }
  return { archived: false, status: 'draft' };
}

export function mapJiraSprintToPlannerListItem(
  raw: unknown,
  boardId: number
): SprintListItem | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const row = raw as JiraSprintRaw;
  const id = typeof row.id === 'number' ? row.id : Number.parseInt(String(row.id ?? ''), 10);
  if (!Number.isFinite(id)) {
    return null;
  }
  const start = parseJiraSprintDate(row.startDate);
  const end = parseJiraSprintDate(row.endDate);
  const { archived, status } = mapJiraSprintState(row.state);
  const name = typeof row.name === 'string' && row.name.trim() ? row.name.trim() : `Sprint ${id}`;
  const self = typeof row.self === 'string' ? row.self : '';
  return {
    archived,
    board: {
      display: '',
      id: String(boardId),
      self: '',
    },
    createdAt: start.dateTime,
    createdBy: EMPTY_CREATED_BY,
    endDate: end.date,
    endDateTime: end.dateTime,
    id,
    name,
    self,
    startDate: start.date,
    startDateTime: start.dateTime,
    status,
    version: 1,
  };
}

async function fetchAgileSprintRows(
  api: AxiosInstance,
  boardId: number
): Promise<unknown[]> {
  const baseUrl = typeof api.defaults.baseURL === 'string' ? api.defaults.baseURL : '';
  if (!baseUrl) {
    return [];
  }
  const url = jiraAgileBoardSprintsUrl(baseUrl, boardId);
  const out: unknown[] = [];
  const maxResults = 50;
  let startAt = 0;
  try {
    for (let page = 0; page < 40; page += 1) {
      const { data } = await api.get<unknown>(url, {
        params: { maxResults, startAt, state: 'active,closed,future' },
      });
      const rows = extractJiraSprintRows(data);
      out.push(...rows);
      if (shouldStopJiraBoardPages(data, startAt, rows.length, maxResults)) {
        break;
      }
      startAt += rows.length;
    }
  } catch {
    return [];
  }
  return out;
}

async function fetchGreenhopperSprintRows(
  api: AxiosInstance,
  boardId: number
): Promise<unknown[]> {
  const baseUrl = typeof api.defaults.baseURL === 'string' ? api.defaults.baseURL : '';
  if (!baseUrl) {
    return [];
  }
  try {
    const { data } = await api.get<unknown>(jiraGreenhopperSprintQueryUrl(baseUrl, boardId), {
      params: { includeFutureSprints: true, includeHistoricSprints: true },
    });
    return extractJiraSprintRows(data);
  } catch {
    return [];
  }
}

function jiraSprintInfoFromRaw(raw: unknown): SprintInfo | null {
  const mapped = mapJiraSprintToPlannerListItem(raw, 0);
  if (!mapped) {
    return null;
  }
  return {
    endDate: mapped.endDate,
    endDateTime: mapped.endDateTime,
    id: mapped.id,
    name: mapped.name,
    startDate: mapped.startDate,
    startDateTime: mapped.startDateTime,
    status: mapped.status,
    version: mapped.version,
  };
}

export async function fetchJiraSprintInfo(
  api: AxiosInstance,
  sprintId: number
): Promise<SprintInfo> {
  const baseUrl = typeof api.defaults.baseURL === 'string' ? api.defaults.baseURL : '';
  if (!baseUrl) {
    throw new Error('Jira getSprint requires API base URL');
  }
  const { data } = await api.get<unknown>(jiraAgileSprintByIdUrl(baseUrl, sprintId));
  const info = jiraSprintInfoFromRaw(data);
  if (!info) {
    throw new Error(`Jira getSprint returned no sprint for ${sprintId}`);
  }
  return info;
}

export async function listJiraSprints(api: AxiosInstance, boardId: number): Promise<SprintListItem[]> {
  const agile = await fetchAgileSprintRows(api, boardId);
  const rows = agile.length > 0 ? agile : await fetchGreenhopperSprintRows(api, boardId);
  const out: SprintListItem[] = [];
  for (const row of rows) {
    const mapped = mapJiraSprintToPlannerListItem(row, boardId);
    if (mapped) {
      out.push(mapped);
    }
  }
  return out;
}

const YMD = /^\d{4}-\d{2}-\d{2}$/;

function jiraCreateSprintDateTime(ymd: string, endOfDay: boolean): string {
  return endOfDay ? `${ymd}T23:59:59.000+00:00` : `${ymd}T00:00:00.000+00:00`;
}

export async function createJiraSprint(
  api: AxiosInstance,
  input: IssueTrackerCreateSprintInput
): Promise<SprintListItem> {
  const name = input.name.trim();
  const startDate = input.startDate.trim();
  const endDate = input.endDate.trim();
  if (!name || !Number.isInteger(input.boardId) || input.boardId <= 0) {
    throw new Error('Jira createSprint requires name and positive board id');
  }
  if (!YMD.test(startDate) || !YMD.test(endDate)) {
    throw new Error('Jira createSprint requires startDate and endDate as YYYY-MM-DD');
  }
  const baseUrl = typeof api.defaults.baseURL === 'string' ? api.defaults.baseURL : '';
  if (!baseUrl) {
    throw new Error('Jira createSprint requires API base URL');
  }
  const { data } = await api.post<unknown>(jiraAgileSprintCreateUrl(baseUrl), {
    endDate: jiraCreateSprintDateTime(endDate, true),
    name,
    originBoardId: input.boardId,
    startDate: jiraCreateSprintDateTime(startDate, false),
  });
  const mapped = mapJiraSprintToPlannerListItem(data, input.boardId);
  if (!mapped) {
    throw new Error('Jira createSprint returned no sprint id');
  }
  return mapped;
}

type JiraSprintAgileState = 'active' | 'closed' | 'future';

export function mapPlannerStatusToJiraSprintState(
  status: IssueTrackerSprintStatus
): JiraSprintAgileState {
  if (status === 'in_progress') {
    return 'active';
  }
  if (status === 'draft') {
    return 'future';
  }
  return 'closed';
}

function jiraPositiveInt(value: unknown): number | undefined {
  const n = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
  return Number.isInteger(n) && n > 0 ? n : undefined;
}

function jiraOriginBoardId(raw: unknown): number | undefined {
  if (!raw || typeof raw !== 'object') {
    return undefined;
  }
  const row = raw as JiraSprintRaw;
  return jiraPositiveInt(row.originBoardId ?? row.rapidViewId);
}

function jiraSprintNumericId(raw: unknown): number | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  return jiraPositiveInt((raw as JiraSprintRaw).id) ?? null;
}

async function findSprintStateOnBoard(
  api: AxiosInstance,
  boardId: number,
  sprintId: number
): Promise<unknown> {
  const rows = await fetchAgileSprintRows(api, boardId);
  for (const row of rows) {
    if (jiraSprintNumericId(row) === sprintId) {
      return jiraRawState(row);
    }
  }
  return undefined;
}

async function readJiraSprintState(
  api: AxiosInstance,
  raw: unknown,
  sprintId: number,
  boardId: number | undefined
): Promise<unknown> {
  if (boardId == null) {
    return jiraRawState(raw);
  }
  const onBoard = await findSprintStateOnBoard(api, boardId, sprintId);
  return onBoard ?? jiraRawState(raw);
}

function jiraRawState(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') {
    return undefined;
  }
  return (raw as JiraSprintRaw).state;
}

function isSameJiraSprintState(current: unknown, target: JiraSprintAgileState): boolean {
  const key = typeof current === 'string' ? current.trim().toLowerCase() : '';
  if (key === target) {
    return true;
  }
  return target === 'closed' && key === 'complete';
}

function jiraSprintStatusWriteBody(
  sprintId: number,
  current: unknown,
  state: JiraSprintAgileState
): Record<string, unknown> {
  const row = (current && typeof current === 'object' ? current : {}) as JiraSprintRaw;
  const body: Record<string, unknown> = { id: sprintId, state };
  const name = typeof row.name === 'string' ? row.name.trim() : '';
  if (name) {
    body.name = name;
  }
  const boardId = jiraOriginBoardId(current);
  if (state === 'closed') {
    body.completeDate = new Date().toISOString();
  } else if (boardId != null) {
    body.originBoardId = boardId;
  }
  const start = typeof row.startDate === 'string' ? row.startDate.trim() : '';
  const end = typeof row.endDate === 'string' ? row.endDate.trim() : '';
  if (start) {
    body.startDate = start;
  }
  if (end) {
    body.endDate = end;
  }
  return body;
}

function httpResponseStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') {
    return undefined;
  }
  const status = (error as { response?: { status?: number } }).response?.status;
  return typeof status === 'number' ? status : undefined;
}

function isSprintWriteFallbackError(error: unknown): boolean {
  const status = httpResponseStatus(error);
  return status === 400 || status === 404 || status === 405;
}

function isGreenhopperFallbackError(error: unknown): boolean {
  const status = httpResponseStatus(error);
  return status != null && status !== 401 && status !== 403;
}

async function applyJiraSprintState(
  api: AxiosInstance,
  url: string,
  body: Record<string, unknown>,
  state: JiraSprintAgileState
): Promise<unknown> {
  try {
    await api.put(url, body);
  } catch (error) {
    if (!isSprintWriteFallbackError(error)) {
      throw error;
    }
  }
  const afterPut = await api.get<unknown>(url);
  if (isSameJiraSprintState(jiraRawState(afterPut.data), state)) {
    return afterPut.data;
  }
  await api.post(url, body);
  const { data } = await api.get<unknown>(url);
  return data;
}

function sprintStatusUpdateFromRaw(raw: unknown): (SprintInfo & { boardId?: number }) | null {
  const info = jiraSprintInfoFromRaw(raw);
  if (!info) {
    return null;
  }
  const boardId = jiraOriginBoardId(raw);
  return boardId != null ? { ...info, boardId } : info;
}

function mappedSprintOrThrow(
  raw: unknown,
  sprintId: number
): SprintInfo & { boardId?: number } {
  const mapped = sprintStatusUpdateFromRaw(raw);
  if (!mapped) {
    throw new Error(`Jira updateSprintStatus returned no sprint for ${sprintId}`);
  }
  return mapped;
}

async function tryGreenhopperPut(
  api: AxiosInstance,
  url: string,
  body: Record<string, unknown>
): Promise<boolean> {
  try {
    await api.put(url, body);
    return true;
  } catch (error) {
    if (isGreenhopperFallbackError(error)) {
      return false;
    }
    throw error;
  }
}

function greenhopperStartBody(
  current: unknown,
  boardId: number
): Record<string, unknown> {
  const row = (current && typeof current === 'object' ? current : {}) as JiraSprintRaw;
  const body: Record<string, unknown> = { rapidViewId: boardId };
  const name = typeof row.name === 'string' ? row.name.trim() : '';
  if (name) {
    body.name = name;
  }
  if (typeof row.startDate === 'string' && row.startDate.trim()) {
    body.startDate = row.startDate.trim();
  }
  if (typeof row.endDate === 'string' && row.endDate.trim()) {
    body.endDate = row.endDate.trim();
  }
  return body;
}

async function tryWriteGreenhopperSprintState(
  api: AxiosInstance,
  baseUrl: string,
  sprintId: number,
  current: unknown,
  state: JiraSprintAgileState,
  boardId: number | undefined
): Promise<boolean> {
  if (boardId == null) {
    return false;
  }
  if (state === 'active') {
    return tryGreenhopperPut(
      api,
      jiraGreenhopperSprintStartUrl(baseUrl, sprintId),
      greenhopperStartBody(current, boardId)
    );
  }
  if (state === 'closed') {
    await tryGreenhopperPut(
      api,
      jiraGreenhopperSprintCompleteUrl(baseUrl, sprintId),
      { rapidViewId: boardId, sprintId }
    );
  }
  return false;
}

async function writeJiraSprintState(
  api: AxiosInstance,
  baseUrl: string,
  sprintId: number,
  current: unknown,
  state: JiraSprintAgileState
): Promise<void> {
  const boardId = jiraOriginBoardId(current);
  if (await tryWriteGreenhopperSprintState(api, baseUrl, sprintId, current, state, boardId)) {
    return;
  }
  await applyJiraSprintState(
    api,
    jiraAgileSprintByIdUrl(baseUrl, sprintId),
    jiraSprintStatusWriteBody(sprintId, current, state),
    state
  );
}

export async function updateJiraSprintStatus(
  api: AxiosInstance,
  sprintId: number,
  status: IssueTrackerSprintStatus
): Promise<SprintInfo & { boardId?: number }> {
  const baseUrl = typeof api.defaults.baseURL === 'string' ? api.defaults.baseURL : '';
  if (!baseUrl) {
    throw new Error('Jira updateSprintStatus requires API base URL');
  }
  const url = jiraAgileSprintByIdUrl(baseUrl, sprintId);
  const { data: current } = await api.get<unknown>(url);
  const state = mapPlannerStatusToJiraSprintState(status);
  const boardId = jiraOriginBoardId(current);
  if (isSameJiraSprintState(await readJiraSprintState(api, current, sprintId, boardId), state)) {
    return mappedSprintOrThrow(current, sprintId);
  }
  await writeJiraSprintState(api, baseUrl, sprintId, current, state);
  const { data } = await api.get<unknown>(url);
  const confirmedBoardId = boardId ?? jiraOriginBoardId(data);
  if (!isSameJiraSprintState(await readJiraSprintState(api, data, sprintId, confirmedBoardId), state)) {
    throw new Error(`Jira did not accept sprint ${sprintId} state ${state}`);
  }
  const mapped = mappedSprintOrThrow(data, sprintId);
  const resolvedBoardId = mapped.boardId ?? confirmedBoardId;
  return resolvedBoardId != null ? { ...mapped, boardId: resolvedBoardId } : mapped;
}
