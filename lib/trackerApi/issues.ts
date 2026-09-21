/**
 * Tracker API: задачи, поиск, маппинг (только сервер).
 */

import type { TrackerIntegrationStored } from '@/lib/trackerIntegration';
import type { Task, Developer } from '@/types';
import type { ChecklistItem, TrackerIssue } from '@/types/tracker';
import type { AxiosInstance } from 'axios';

import { applyTrackerIntegrationToTask } from '@/lib/trackerIntegration';

import { requireTrackerAxiosForApiRoute } from '../trackerAxiosFactory';

import { TRACKER_ISSUES_SEARCH_PER_PAGE_CAP } from './issuesFetchHelpers';
import {
  mapTrackerIssueToTaskBase,
  type MapTrackerIssueToTaskOptions,
} from './issuesMappingHelpers';
import {
  clampTrackerIssuesPerPage,
  collectPaginatedTrackerIssues,
  postTrackerIssueSearchPage,
} from './issuesPaginationHelpers';
import {
  getCachedSprintIssues,
  invalidateCachedSprintIssues,
  setCachedSprintIssues,
} from './sprintIssuesCache';
import { fetchSprintInfo } from './sprints';

/**
 * Дата/время для фильтров Tracker API v3 (как в теле задачи: `2017-07-18T13:33:44.291+0000`).
 */
export function formatTrackerApiDateTimeUtc(d: Date): string {
  return d.toISOString().replace(/\.(\d{3})Z$/, '.$1+0000');
}

/**
 * Issue → Task. Без `integration` — прежнее поведение; с конфигом организации — поверх базового маппинга.
 */
export function mapTrackerIssueToTask(
  issue: TrackerIssue,
  integration?: TrackerIntegrationStored | null,
  options?: MapTrackerIssueToTaskOptions
): Task {
  const base = mapTrackerIssueToTaskBase(issue, options);
  return applyTrackerIntegrationToTask(issue, base, integration ?? null);
}

const SEARCH_PER_PAGE = 300;

function uniqueTrimmedQueueKeys(queueKeys: string[]): string[] {
  return [...new Set(queueKeys.map((key) => key.trim()).filter(Boolean))];
}

/** Тело `POST /issues/_search`: все задачи очереди (официальный filter.queue, не query language). */
export function yandexQueueIssuesSearchBody(queueKey: string): { filter: { queue: string } } {
  return { filter: { queue: queueKey.trim() } };
}

/** Тело `POST /issues/_search` для инкрементальной синхронизации по `updatedAt`. */
export function yandexUpdatedAtSearchBody(
  since: Date,
  until: Date,
  options?: { queueKeys?: string[] }
): {
  filter: {
    queue?: string[] | string;
    updatedAt: { from: string; to: string };
  };
  order: '+updatedAt';
} {
  const queueKeys = options?.queueKeys != null ? uniqueTrimmedQueueKeys(options.queueKeys) : [];
  let queueFilter: { queue?: string[] | string } = {};
  if (queueKeys.length === 1) {
    queueFilter = { queue: queueKeys[0]! };
  } else if (queueKeys.length > 1) {
    queueFilter = { queue: queueKeys };
  }
  return {
    filter: {
      ...queueFilter,
      updatedAt: {
        from: formatTrackerApiDateTimeUtc(since),
        to: formatTrackerApiDateTimeUtc(until),
      },
    },
    order: '+updatedAt',
  };
}

/** Query language для полного синка задач доски. */
export function yandexBoardIssuesSearchQuery(boardId: number, queryExtra?: string): string {
  if (queryExtra != null && queryExtra.trim() !== '') {
    return `boards: ${boardId} AND (${queryExtra})`;
  }
  return `boards: ${boardId}`;
}

/**
 * Задачи с датой обновления в полуинтервале [since, until] (UTC).
 * В v3 для поля типа datetime нужен объект `{ from, to }`, а не строка диапазона (иначе 422).
 * Останавливается на maxIssues; при достижении лимита при наличии ещё страниц — truncated: true.
 */
export function fetchIssuesUpdatedInRange(
  axiosInstance: AxiosInstance,
  since: Date,
  until: Date,
  options?: { maxIssues?: number; perPage?: number; queueKeys?: string[] }
): Promise<{ issues: TrackerIssue[]; truncated: boolean }> {
  if (options?.queueKeys != null && options.queueKeys.length === 0) {
    return Promise.resolve({ issues: [], truncated: false });
  }
  const api = requireTrackerAxiosForApiRoute(axiosInstance);
  const maxIssues = options?.maxIssues ?? 10_000;
  const perPage = clampTrackerIssuesPerPage(options?.perPage);

  return collectPaginatedTrackerIssues(
    api,
    (page, pageSize) =>
      postTrackerIssueSearchPage(
        api,
        page,
        pageSize,
        yandexUpdatedAtSearchBody(since, until, { queueKeys: options?.queueKeys })
      ),
    perPage,
    { maxTotal: maxIssues }
  );
}

interface FetchAllIssuesOnBoardCheckpoint {
  boardId: number;
  page: number;
  totalIssues: number;
  totalPages: number;
}

interface FetchAllIssuesInQueueCheckpoint {
  page: number;
  queueKey: string;
  totalIssues: number;
  totalPages: number;
}

/**
 * Все задачи очереди (`filter.queue`), с пагинацией. Для initial_full / full_rescan.
 */
export async function fetchAllIssuesInQueue(
  queueKey: string,
  axiosInstance: AxiosInstance,
  options?: {
    maxTotalIssues?: number;
    onCheckpoint?: (info: FetchAllIssuesInQueueCheckpoint) => Promise<void> | void;
    perPage?: number;
  }
): Promise<{ issues: TrackerIssue[]; truncated: boolean }> {
  const key = queueKey.trim();
  if (!key) {
    return { issues: [], truncated: false };
  }
  const maxTotal = options?.maxTotalIssues ?? Number.POSITIVE_INFINITY;
  if (maxTotal <= 0) {
    return { issues: [], truncated: true };
  }
  const api = requireTrackerAxiosForApiRoute(axiosInstance);
  const perPage = clampTrackerIssuesPerPage(options?.perPage);
  const body = yandexQueueIssuesSearchBody(key);

  return await collectPaginatedTrackerIssues(
    api,
    (page, pageSize) => postTrackerIssueSearchPage(api, page, pageSize, body),
    perPage,
    {
      maxTotal,
      onCheckpoint: (checkpoint) =>
        options?.onCheckpoint?.({
          page: checkpoint.page,
          queueKey: key,
          totalIssues: checkpoint.totalIssues,
          totalPages: checkpoint.totalPages,
        }),
    }
  );
}

/**
 * Все задачи на доске (query `boards: <id>`), с пагинацией.
 */
export async function fetchAllIssuesOnBoard(
  boardId: number,
  axiosInstance: AxiosInstance,
  options?: {
    maxTotalIssues?: number;
    onCheckpoint?: (
      info: FetchAllIssuesOnBoardCheckpoint
    ) => Promise<void> | void;
    perPage?: number;
    queryExtra?: string;
  }
): Promise<{ issues: TrackerIssue[]; truncated: boolean }> {
  const api = requireTrackerAxiosForApiRoute(axiosInstance);
  const maxTotal = options?.maxTotalIssues ?? Number.POSITIVE_INFINITY;
  if (maxTotal <= 0) {
    return { issues: [], truncated: true };
  }
  const perPage = clampTrackerIssuesPerPage(options?.perPage);
  const queryString = yandexBoardIssuesSearchQuery(boardId, options?.queryExtra);

  return await collectPaginatedTrackerIssues(
    api,
    (page, pageSize) => postTrackerIssueSearchPage(api, page, pageSize, { query: queryString }),
    perPage,
    {
      maxTotal,
      onCheckpoint: (checkpoint) =>
        options?.onCheckpoint?.({
          boardId,
          page: checkpoint.page,
          totalIssues: checkpoint.totalIssues,
          totalPages: checkpoint.totalPages,
        }),
    }
  );
}

async function searchYandexTrackerIssuesInSprint(
  api: ReturnType<typeof requireTrackerAxiosForApiRoute>,
  sprintId: number
): Promise<TrackerIssue[]> {
  const allIssues: TrackerIssue[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const { data, headers } = await api.post<TrackerIssue[]>(
      `/issues/_search?expand=links&perPage=${SEARCH_PER_PAGE}&page=${page}`,
      {
        filter: {
          sprint: [{ id: sprintId.toString() }],
        },
      }
    );
    allIssues.push(...(data ?? []));
    totalPages = headers['x-total-pages']
      ? parseInt(String(headers['x-total-pages']), 10)
      : 1;
    page += 1;
  } while (page <= totalPages);

  return allIssues;
}

interface FetchTrackerIssuesOptions {
  /**
   * Не ходить в Tracker (только кэш). Для archived/released без записи в кэше — [].
   */
  cacheOnly?: boolean;
  /** Игнорировать кэш и загрузить все задачи спринта из Tracker заново. */
  forceRefresh?: boolean;
  /** Уже известен статус спринта — не дергаем GET /sprints для TTL кэша. */
  sprintStatus?: string;
}

async function resolveSprintStatusForCache(
  sprintId: number,
  api: ReturnType<typeof requireTrackerAxiosForApiRoute>,
  sprintStatus?: string
): Promise<string | undefined> {
  if (sprintStatus !== undefined) {
    return sprintStatus;
  }
  try {
    const info = await fetchSprintInfo(sprintId, api);
    return info.status;
  } catch {
    return undefined;
  }
}

export async function fetchTrackerIssues(
  sprintId: number,
  axiosInstance?: AxiosInstance,
  options?: FetchTrackerIssuesOptions
): Promise<TrackerIssue[]> {
  if (options?.forceRefresh) {
    invalidateCachedSprintIssues(sprintId);
  }

  const cached = getCachedSprintIssues(sprintId);
  if (cached) return cached;

  if (options?.cacheOnly) {
    return [];
  }

  const api = requireTrackerAxiosForApiRoute(axiosInstance);
  const [sprintStatus, allIssues] = await Promise.all([
    resolveSprintStatusForCache(sprintId, api, options?.sprintStatus),
    searchYandexTrackerIssuesInSprint(api, sprintId),
  ]);
  setCachedSprintIssues(sprintId, allIssues, sprintStatus);
  return allIssues;
}

/**
 * Все задачи (task/bug) в спринте с полем parent — для маппинга taskId → storyKey.
 * С пагинацией. Используем filter (как fetchTrackerIssues), тип отфильтруем на нашей стороне.
 */
export async function fetchTasksInSprintWithParents(
  sprintId: number,
  axiosInstance?: AxiosInstance,
  options?: FetchTrackerIssuesOptions
): Promise<TrackerIssue[]> {
  const allIssues = await fetchTrackerIssues(sprintId, axiosInstance, options);
  return allIssues.filter(
    (issue) => issue.type?.key === 'task' || issue.type?.key === 'bug'
  );
}

export async function fetchChildren(
  parentKey: string,
  boardId: number,
  axiosInstance?: AxiosInstance
): Promise<TrackerIssue[]> {
  const api = requireTrackerAxiosForApiRoute(axiosInstance);
  const queryString = `boards: ${boardId} AND (type: task OR type: bug OR type: story) AND "Is Subtask For": ${parentKey}`;

  try {
    const { issues } = await collectPaginatedTrackerIssues(
      api,
      (page, perPage) => postTrackerIssueSearchPage(api, page, perPage, { query: queryString }),
      SEARCH_PER_PAGE,
      { maxTotal: Number.POSITIVE_INFINITY }
    );
    return issues;
  } catch (error) {
    console.error('[fetchChildren] Error fetching children:', {
      parentKey,
      boardId,
      query: queryString,
      error: error instanceof Error ? error.message : String(error),
      response: (error as { response?: { data?: unknown } })?.response?.data,
    });
    throw error;
  }
}

export async function fetchEpicStories(
  epicKey: string,
  boardId: number,
  axiosInstance?: AxiosInstance
): Promise<TrackerIssue[]> {
  const api = requireTrackerAxiosForApiRoute(axiosInstance);
  const allIssues: TrackerIssue[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const { data, headers } = await api.post<TrackerIssue[]>(
      `/issues/_search?expand=links&perPage=${SEARCH_PER_PAGE}&page=${page}`,
      {
        query: `boards: ${boardId} AND type: story AND "Is Subtask For": ${epicKey}`,
      }
    );
    allIssues.push(...data);
    totalPages = headers['x-total-pages']
      ? parseInt(String(headers['x-total-pages']), 10)
      : 1;
    page += 1;
  } while (page <= totalPages);

  return allIssues;
}

function addDeveloperFromIssue(
  developersMap: Map<string, { id: string; name: string; role: 'developer' | 'tester' }>,
  id: string,
  name: string,
  role: 'developer' | 'tester'
): void {
  if (!developersMap.has(id)) {
    developersMap.set(id, { id, name, role });
  }
}

export function extractDevelopers(issues: TrackerIssue[]): Developer[] {
  const developersMap = new Map<
    string,
    { id: string; name: string; role: 'developer' | 'tester' }
  >();

  for (const issue of issues) {
    if (issue.assignee) {
      addDeveloperFromIssue(
        developersMap,
        issue.assignee.id,
        issue.assignee.display,
        'developer'
      );
    }
    if (issue.qaEngineer) {
      addDeveloperFromIssue(
        developersMap,
        issue.qaEngineer.id,
        issue.qaEngineer.display,
        'tester'
      );
    }
  }

  return Array.from(developersMap.values());
}

export async function fetchIssueFromTracker(
  issueKey: string,
  axiosInstance?: AxiosInstance
): Promise<TrackerIssue | null> {
  try {
    const api = requireTrackerAxiosForApiRoute(axiosInstance);
    const { data } = await api.get<TrackerIssue>(`/issues/${issueKey}`);
    return data ?? null;
  } catch (error) {
    console.error(`Failed to fetch issue ${issueKey} from Tracker:`, error);
    return null;
  }
}

export async function fetchIssueChecklist(
  issueKey: string,
  axiosInstance?: AxiosInstance
): Promise<ChecklistItem[]> {
  try {
    const api = requireTrackerAxiosForApiRoute(axiosInstance);
    const { data } = await api.get<ChecklistItem[]>(
      `/issues/${issueKey}/checklistItems`
    );
    return data || [];
  } catch (error) {
    console.error(`Failed to fetch checklist for issue ${issueKey}:`, error);
    return [];
  }
}

const ISSUE_SEARCH_ON_BOARD_PER_PAGE = 20;

function escapeTrackerQueryQuotedValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/** Значение поля Tracker «Продуктовая команда» / bizErpTeam из slug команды в БД. */
export function toTrackerProductTeamValue(teamSlug: string): string {
  const slug = teamSlug.trim();
  if (!slug) {
    return '';
  }
  return slug.startsWith('team-') ? slug : `team-${slug}`;
}

/** Query language: открытые баги продуктовой команды (поле «Продуктовая команда» / bizErpTeam). */
export function buildSlaBugsQueryForProductTeam(productTeamSlug: string): string {
  return `${buildProductTeamBugBaseQuery(productTeamSlug)} AND Status: !closed`;
}

function buildProductTeamBugBaseQuery(productTeamSlug: string): string {
  const value = toTrackerProductTeamValue(productTeamSlug);
  const escaped = escapeTrackerQueryQuotedValue(value);
  return `"Продуктовая команда": "${escaped}" AND Type: bug`;
}

/** Дата для query language Tracker (YYYY-MM-DD). */
function formatTrackerQueryDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Баги команды, созданные начиная с даты (включительно). */
export function buildSlaBugsArrivedSinceQuery(productTeamSlug: string, since: Date): string {
  const date = formatTrackerQueryDate(since);
  return `${buildProductTeamBugBaseQuery(productTeamSlug)} AND Created: >= "${date}"`;
}

/** Баги команды, закрытые (resolved) начиная с даты (включительно). */
export function buildSlaBugsClosedSinceQuery(productTeamSlug: string, since: Date): string {
  const date = formatTrackerQueryDate(since);
  return `${buildProductTeamBugBaseQuery(productTeamSlug)} AND Status: closed AND Resolved: >= "${date}"`;
}

interface FetchIssuesByQueryCheckpoint {
  page: number;
  totalIssues: number;
  totalPages: number;
}

/**
 * Задачи по произвольному query language (без привязки к доске), с пагинацией.
 */
export async function fetchIssuesByQuery(
  queryString: string,
  axiosInstance: AxiosInstance,
  options?: {
    maxTotalIssues?: number;
    onCheckpoint?: (
      info: FetchIssuesByQueryCheckpoint
    ) => Promise<void> | void;
    perPage?: number;
  }
): Promise<{ issues: TrackerIssue[]; truncated: boolean }> {
  const api = requireTrackerAxiosForApiRoute(axiosInstance);
  const query = queryString.trim();
  if (!query) {
    return { issues: [], truncated: false };
  }
  const maxTotal = options?.maxTotalIssues ?? Number.POSITIVE_INFINITY;
  if (maxTotal <= 0) {
    return { issues: [], truncated: true };
  }
  const perPage = clampTrackerIssuesPerPage(options?.perPage);

  return await collectPaginatedTrackerIssues(
    api,
    (page, pageSize) => postTrackerIssueSearchPage(api, page, pageSize, { query }),
    perPage,
    {
      maxTotal,
      onCheckpoint: (checkpoint) =>
        options?.onCheckpoint?.({
          page: checkpoint.page,
          totalIssues: checkpoint.totalIssues,
          totalPages: checkpoint.totalPages,
        }),
    }
  );
}

/** Query language для поиска задач на доске по ключу или названию. */
export function buildIssueSearchQueryOnBoard(boardId: number, queryText: string): string {
  const trimmed = queryText.trim();
  const escaped = trimmed.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  if (!escaped) {
    return `boards: ${boardId}`;
  }
  // Summary: префиксный текстовый поиск; Key: только точное совпадение (wildcard в Key не поддерживается).
  const escapedKey = escaped.toUpperCase();
  return `boards: ${boardId} AND (Summary: "${escaped}*" OR Key: "${escapedKey}")`;
}

/** Поиск задач на доске в Tracker (первая страница). */
export async function searchTrackerIssuesOnBoard(
  boardId: number,
  queryText: string,
  axiosInstance?: AxiosInstance,
  options?: { perPage?: number }
): Promise<TrackerIssue[]> {
  const q = queryText.trim();
  if (!q) {
    return [];
  }
  const api = requireTrackerAxiosForApiRoute(axiosInstance);
  const perPage = Math.min(
    Math.max(options?.perPage ?? ISSUE_SEARCH_ON_BOARD_PER_PAGE, 1),
    TRACKER_ISSUES_SEARCH_PER_PAGE_CAP
  );
  const { data } = await api.post<TrackerIssue[]>(
    `/issues/_search?expand=links&perPage=${perPage}&page=1`,
    { query: buildIssueSearchQueryOnBoard(boardId, q) }
  );
  return data ?? [];
}
