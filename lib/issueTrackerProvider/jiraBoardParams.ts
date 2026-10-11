import type { BoardColumn, BoardParams } from '@/types/tracker';
import type { AxiosInstance } from 'axios';

import { axiosErrorStatusAndDetails } from './jiraAgileAuthError';
import { fetchJiraBoardById, jiraAgileBoardListUrl } from './jiraCatalog';
import { fetchJiraOrganizationStatuses } from './jiraOrgMetadata';
import { jiraNameKey } from './jiraStatusKeys';

export function jiraAgileBoardConfigurationUrl(restApiBaseUrl: string, boardId: number): string {
  return `${jiraAgileBoardListUrl(restApiBaseUrl)}/${boardId}/configuration`;
}

interface JiraBoardConfigStatusRef {
  id?: unknown;
  self?: string;
}

interface JiraBoardConfigColumn {
  name?: string;
  statuses?: JiraBoardConfigStatusRef[];
}

function extractJiraBoardConfigColumns(data: unknown): JiraBoardConfigColumn[] {
  if (!data || typeof data !== 'object') {
    return [];
  }
  const columns = (data as { columnConfig?: { columns?: unknown } }).columnConfig?.columns;
  return Array.isArray(columns) ? (columns as JiraBoardConfigColumn[]) : [];
}

function jiraStatusId(raw: JiraBoardConfigStatusRef | undefined): string | null {
  if (!raw) {
    return null;
  }
  const id = raw.id != null && String(raw.id).trim() !== '' ? String(raw.id).trim() : '';
  return id || null;
}

function addJiraColumnStatusKeys(
  statusKeys: Set<string>,
  status: JiraBoardConfigStatusRef | undefined,
  statusDisplayById: Map<string, string>
): void {
  const id = jiraStatusId(status);
  if (!id) {
    return;
  }
  statusKeys.add(id);
  const name = statusDisplayById.get(id);
  if (!name) {
    return;
  }
  statusKeys.add(name);
  statusKeys.add(jiraNameKey(name));
}

export function mapJiraBoardConfigColumns(
  columns: JiraBoardConfigColumn[],
  statusDisplayById: Map<string, string>,
  boardSelf: string
): BoardColumn[] {
  const out: BoardColumn[] = [];
  for (let index = 0; index < columns.length; index += 1) {
    const column = columns[index];
    const display =
      typeof column.name === 'string' && column.name.trim() ? column.name.trim() : `Column ${index + 1}`;
    const statusKeys = new Set<string>();
    for (const status of column.statuses ?? []) {
      addJiraColumnStatusKeys(statusKeys, status, statusDisplayById);
    }
    out.push({
      display,
      id: String(index + 1),
      self: `${boardSelf}/columns/${index + 1}`,
      statusKeys: [...statusKeys],
    });
  }
  return out;
}

async function loadJiraStatusDisplayById(api: AxiosInstance): Promise<Map<string, string>> {
  const statuses = await fetchJiraOrganizationStatuses(api);
  const byId = new Map<string, string>();
  for (const status of statuses) {
    if (status.id && status.display) {
      byId.set(status.id, status.display);
    }
  }
  return byId;
}

function readJiraBoardConfigIdentity(data: unknown): { id: number; name: string } | null {
  if (!data || typeof data !== 'object') {
    return null;
  }
  const row = data as { id?: unknown; name?: unknown };
  const id = typeof row.id === 'number' ? row.id : Number.parseInt(String(row.id ?? ''), 10);
  const name = typeof row.name === 'string' ? row.name.trim() : '';
  if (!Number.isFinite(id) || id <= 0 || !name) {
    return null;
  }
  return { id, name };
}

async function loadJiraBoardColumnConfig(
  api: AxiosInstance,
  baseUrl: string,
  boardId: number,
  boardSelf: string
): Promise<{ columns: BoardColumn[]; id: number | null; name: string } | null> {
  const url = jiraAgileBoardConfigurationUrl(baseUrl, boardId);
  try {
    const { data } = await api.get<unknown>(url);
    const identity = readJiraBoardConfigIdentity(data);
    const statusDisplayById = await loadJiraStatusDisplayById(api);
    return {
      columns: mapJiraBoardConfigColumns(
        extractJiraBoardConfigColumns(data),
        statusDisplayById,
        boardSelf
      ),
      id: identity?.id ?? null,
      name: identity?.name ?? '',
    };
  } catch (error) {
    const { details, status } = axiosErrorStatusAndDetails(error);
    console.error('[jira] board configuration failed', { boardId, details, status, url });
    return null;
  }
}

export async function fetchJiraBoardParams(
  api: AxiosInstance,
  boardId: number
): Promise<BoardParams | null> {
  const baseUrl = typeof api.defaults.baseURL === 'string' ? api.defaults.baseURL : '';
  if (!baseUrl) {
    return null;
  }

  const boardSelf = jiraAgileBoardConfigurationUrl(baseUrl, boardId).replace(/\/configuration$/, '');
  const [board, configured] = await Promise.all([
    fetchJiraBoardById(api, boardId),
    loadJiraBoardColumnConfig(api, baseUrl, boardId, boardSelf),
  ]);
  const id = board?.id ?? configured?.id ?? null;
  const name = board?.name || configured?.name || '';
  if (id == null || !name) {
    return null;
  }

  return {
    columns: configured?.columns ?? [],
    id,
    name,
    self: boardSelf,
  };
}
