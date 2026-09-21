import type { AxiosInstance } from 'axios';

import { mapRawQueue } from '@/lib/trackerApi/queueMappingHelpers';
import { extractTrackerMetadataArray } from '@/lib/trackerIntegration/fetchTrackerOrgMetadataHelpers';

interface JiraBoardRef {
  id: number;
  name: string;
}

function jiraSiteOrigin(restApiBaseUrl: string): string {
  return new URL(restApiBaseUrl).origin;
}

export function jiraAgileBoardListUrl(restApiBaseUrl: string): string {
  return `${jiraSiteOrigin(restApiBaseUrl)}/rest/agile/1.0/board`;
}

function jiraAgileBoardByIdUrl(restApiBaseUrl: string, boardId: number): string {
  return `${jiraAgileBoardListUrl(restApiBaseUrl)}/${boardId}`;
}

export function jiraGreenhopperRapidViewsListUrl(restApiBaseUrl: string): string {
  return `${jiraSiteOrigin(restApiBaseUrl)}/rest/greenhopper/1.0/rapidviews/list`;
}

function jiraGreenhopperRapidViewCollectionUrl(restApiBaseUrl: string): string {
  return `${jiraSiteOrigin(restApiBaseUrl)}/rest/greenhopper/1.0/rapidview`;
}

export function jiraGreenhopperRapidViewByIdUrl(restApiBaseUrl: string, rapidViewId: number): string {
  return `${jiraGreenhopperRapidViewCollectionUrl(restApiBaseUrl)}/${rapidViewId}`;
}

export function jiraAgileBoardSprintsUrl(restApiBaseUrl: string, boardId: number): string {
  return `${jiraAgileBoardByIdUrl(restApiBaseUrl, boardId)}/sprint`;
}

export function jiraAgileBoardIssuesUrl(restApiBaseUrl: string, boardId: number): string {
  return `${jiraAgileBoardByIdUrl(restApiBaseUrl, boardId)}/issue`;
}

export function jiraAgileSprintCreateUrl(restApiBaseUrl: string): string {
  return `${jiraSiteOrigin(restApiBaseUrl)}/rest/agile/1.0/sprint`;
}

export function jiraAgileSprintIssuesUrl(restApiBaseUrl: string, sprintId: number): string {
  return `${jiraAgileSprintCreateUrl(restApiBaseUrl)}/${sprintId}/issue`;
}

export function jiraAgileSprintByIdUrl(restApiBaseUrl: string, sprintId: number): string {
  return `${jiraAgileSprintCreateUrl(restApiBaseUrl)}/${sprintId}`;
}

export function jiraAgileBacklogIssueUrl(restApiBaseUrl: string): string {
  return `${jiraSiteOrigin(restApiBaseUrl)}/rest/agile/1.0/backlog/issue`;
}

export function jiraAgileIssueUrl(restApiBaseUrl: string, issueIdOrKey: string): string {
  return `${jiraSiteOrigin(restApiBaseUrl)}/rest/agile/1.0/issue/${encodeURIComponent(issueIdOrKey)}`;
}

export function jiraAgileEpicIssuesUrl(restApiBaseUrl: string, epicIdOrKey: string): string {
  return `${jiraSiteOrigin(restApiBaseUrl)}/rest/agile/1.0/epic/${encodeURIComponent(epicIdOrKey)}/issue`;
}

export function jiraAgileEpicNoneIssuesUrl(restApiBaseUrl: string): string {
  return `${jiraSiteOrigin(restApiBaseUrl)}/rest/agile/1.0/epic/none/issue`;
}

export function jiraAgileIssueEstimationUrl(restApiBaseUrl: string, issueIdOrKey: string): string {
  return `${jiraAgileIssueUrl(restApiBaseUrl, issueIdOrKey)}/estimation`;
}

export function jiraGreenhopperSprintQueryUrl(restApiBaseUrl: string, rapidViewId: number): string {
  return `${jiraSiteOrigin(restApiBaseUrl)}/rest/greenhopper/1.0/sprintquery/${rapidViewId}`;
}

function jiraGreenhopperSprintByIdUrl(restApiBaseUrl: string, sprintId: number): string {
  return `${jiraSiteOrigin(restApiBaseUrl)}/rest/greenhopper/1.0/sprint/${sprintId}`;
}

export function jiraGreenhopperSprintStartUrl(restApiBaseUrl: string, sprintId: number): string {
  return `${jiraGreenhopperSprintByIdUrl(restApiBaseUrl, sprintId)}/start`;
}

export function jiraGreenhopperSprintCompleteUrl(restApiBaseUrl: string, sprintId: number): string {
  return `${jiraGreenhopperSprintByIdUrl(restApiBaseUrl, sprintId)}/complete`;
}

function unwrapBoardPayload(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') {
    return raw;
  }
  const row = raw as { rapidView?: unknown };
  if (row.rapidView && typeof row.rapidView === 'object') {
    return row.rapidView;
  }
  return raw;
}

export function extractJiraBoardRows(data: unknown): unknown[] {
  if (Array.isArray(data)) {
    return data;
  }
  if (!data || typeof data !== 'object') {
    return [];
  }
  const page = data as { rapidViews?: unknown; values?: unknown; views?: unknown };
  if (Array.isArray(page.views)) {
    return page.views;
  }
  if (Array.isArray(page.rapidViews)) {
    return page.rapidViews;
  }
  if (Array.isArray(page.values)) {
    return page.values;
  }
  return [];
}

export function mapJiraAgileBoard(raw: unknown): JiraBoardRef | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const row = raw as { id?: unknown; name?: unknown };
  const id = typeof row.id === 'number' ? row.id : Number.parseInt(String(row.id ?? ''), 10);
  if (!Number.isFinite(id)) {
    return null;
  }
  const name = typeof row.name === 'string' && row.name.trim() ? row.name.trim() : String(id);
  return { id, name };
}

export function mapJiraBoardPayload(raw: unknown): JiraBoardRef | null {
  const direct = mapJiraAgileBoard(unwrapBoardPayload(raw));
  if (direct) {
    return direct;
  }
  const first = extractJiraBoardRows(raw)[0];
  return first === undefined ? null : mapJiraAgileBoard(unwrapBoardPayload(first));
}

function jiraBoardPageHasMore(
  page: { isLast?: unknown; rapidViews?: unknown; total?: unknown; values?: unknown; views?: unknown },
  startAt: number,
  valueCount: number,
  requestedMax: number
): boolean {
  if (page.isLast === true) {
    return false;
  }
  if (typeof page.total === 'number') {
    return startAt + valueCount < page.total;
  }
  if (page.isLast === false) {
    return true;
  }
  if (Array.isArray(page.views) || Array.isArray(page.rapidViews)) {
    return false;
  }
  return valueCount >= requestedMax;
}

export function shouldStopJiraBoardPages(
  data: unknown,
  startAt: number,
  valueCount: number,
  requestedMax: number
): boolean {
  if (valueCount === 0 || Array.isArray(data) || !data || typeof data !== 'object') {
    return true;
  }
  return !jiraBoardPageHasMore(data, startAt, valueCount, requestedMax);
}

function mapBoardRows(rows: unknown[]): JiraBoardRef[] {
  const out: JiraBoardRef[] = [];
  for (const row of rows) {
    const mapped = mapJiraAgileBoard(unwrapBoardPayload(row));
    if (mapped) {
      out.push(mapped);
    }
  }
  return out;
}

function mergeJiraBoardLists(primary: JiraBoardRef[], extra: JiraBoardRef[]): JiraBoardRef[] {
  const byId = new Map<number, JiraBoardRef>();
  for (const board of primary) {
    byId.set(board.id, board);
  }
  for (const board of extra) {
    if (!byId.has(board.id)) {
      byId.set(board.id, board);
    }
  }
  return [...byId.values()];
}

export function mergeJiraBoardIntoList(
  boards: JiraBoardRef[],
  extra: JiraBoardRef | null
): JiraBoardRef[] {
  if (!extra || boards.some((board) => board.id === extra.id)) {
    return boards;
  }
  return [extra, ...boards];
}

export async function fetchJiraProjectsAsQueues(
  api: AxiosInstance
): Promise<Array<{ key: string; name: string }>> {
  const { data } = await api.get<unknown>('/project');
  const out: Array<{ key: string; name: string }> = [];
  for (const row of extractTrackerMetadataArray(data)) {
    const mapped = mapRawQueue(row);
    if (mapped) {
      out.push({ key: mapped.key, name: mapped.name });
    }
  }
  return out;
}

async function fetchPagedJiraBoards(
  api: AxiosInstance,
  boardsUrl: string
): Promise<JiraBoardRef[]> {
  const out: JiraBoardRef[] = [];
  const maxResults = 50;
  let startAt = 0;
  for (let page = 0; page < 40; page += 1) {
    const { data } = await api.get<unknown>(boardsUrl, { params: { maxResults, startAt } });
    const rows = extractJiraBoardRows(data);
    out.push(...mapBoardRows(rows));
    if (shouldStopJiraBoardPages(data, startAt, rows.length, maxResults)) {
      break;
    }
    startAt += rows.length;
  }
  return out;
}

async function fetchPagedJiraBoardsOrEmpty(
  api: AxiosInstance,
  boardsUrl: string
): Promise<JiraBoardRef[]> {
  try {
    return await fetchPagedJiraBoards(api, boardsUrl);
  } catch {
    return [];
  }
}

export async function fetchJiraAgileBoards(api: AxiosInstance): Promise<JiraBoardRef[]> {
  const baseUrl = typeof api.defaults.baseURL === 'string' ? api.defaults.baseURL : '';
  if (!baseUrl) {
    return [];
  }
  return await fetchPagedJiraBoardsOrEmpty(api, jiraAgileBoardListUrl(baseUrl));
}

async function fetchJiraRapidViews(api: AxiosInstance): Promise<JiraBoardRef[]> {
  const baseUrl = typeof api.defaults.baseURL === 'string' ? api.defaults.baseURL : '';
  if (!baseUrl) {
    return [];
  }
  const fromList = await fetchPagedJiraBoardsOrEmpty(api, jiraGreenhopperRapidViewsListUrl(baseUrl));
  if (fromList.length) {
    return fromList;
  }
  return fetchPagedJiraBoardsOrEmpty(api, jiraGreenhopperRapidViewCollectionUrl(baseUrl));
}

export async function fetchJiraBoardsForCatalog(api: AxiosInstance): Promise<JiraBoardRef[]> {
  const [rapidViews, agileBoards] = await Promise.all([
    fetchJiraRapidViews(api),
    fetchJiraAgileBoards(api),
  ]);
  return mergeJiraBoardLists(rapidViews, agileBoards);
}

async function getMappedBoardByUrl(
  api: AxiosInstance,
  url: string
): Promise<JiraBoardRef | null> {
  try {
    const { data } = await api.get<unknown>(url);
    return mapJiraBoardPayload(data);
  } catch {
    return null;
  }
}

export async function fetchJiraBoardById(
  api: AxiosInstance,
  boardId: number
): Promise<JiraBoardRef | null> {
  const baseUrl = typeof api.defaults.baseURL === 'string' ? api.defaults.baseURL : '';
  if (!baseUrl) {
    return null;
  }
  const rapidView = await getMappedBoardByUrl(api, jiraGreenhopperRapidViewByIdUrl(baseUrl, boardId));
  if (rapidView) {
    return rapidView;
  }
  return getMappedBoardByUrl(api, jiraAgileBoardByIdUrl(baseUrl, boardId));
}

export async function fetchJiraBoardProjectKey(
  api: AxiosInstance,
  boardId: number
): Promise<string | null> {
  const baseUrl = typeof api.defaults.baseURL === 'string' ? api.defaults.baseURL : '';
  if (!baseUrl) {
    return null;
  }
  try {
    const { data } = await api.get<unknown>(jiraAgileBoardByIdUrl(baseUrl, boardId));
    if (!data || typeof data !== 'object') {
      return null;
    }
    const projectKey = (data as { location?: { projectKey?: unknown } }).location?.projectKey;
    return typeof projectKey === 'string' && projectKey.trim() ? projectKey.trim() : null;
  } catch {
    return null;
  }
}
