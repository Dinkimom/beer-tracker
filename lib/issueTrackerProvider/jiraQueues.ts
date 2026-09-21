import type { AxiosInstance } from 'axios';

import { mapRawQueue } from '@/lib/trackerApi/queueMappingHelpers';

import { fetchJiraProjectsAsQueues } from './jiraCatalog';

interface JiraQueueWorkflowIssueType {
  display?: string;
  id: string;
  key: string;
}

function jiraIssueTypeKey(name: string): string {
  return name.toLowerCase().replaceAll(/\s+/g, '');
}

function isHttpNotFound(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }
  return (error as { response?: { status?: number } }).response?.status === 404;
}

export async function fetchJiraQueueByKey(
  api: AxiosInstance,
  queueKey: string
): Promise<{ id?: number; key: string; name: string } | null> {
  const key = queueKey.trim();
  if (!key) {
    return null;
  }
  try {
    const { data } = await api.get<unknown>(`/project/${encodeURIComponent(key)}`);
    return mapRawQueue(data);
  } catch (error) {
    if (isHttpNotFound(error)) {
      return null;
    }
    throw error;
  }
}

export async function searchJiraQueues(
  api: AxiosInstance,
  query: string
): Promise<Array<{ key: string; name: string }>> {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }
  const needle = trimmed.toLowerCase();
  const queues = await fetchJiraProjectsAsQueues(api);
  return queues.filter(
    (queue) =>
      queue.key.toLowerCase().includes(needle) || queue.name.toLowerCase().includes(needle)
  );
}

export function extractJiraProjectIssueTypeRows(data: unknown): unknown[] {
  return Array.isArray(data) ? data : [];
}

export function mapJiraProjectIssueType(raw: unknown): JiraQueueWorkflowIssueType | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const row = raw as { id?: unknown; name?: string; subtask?: boolean };
  if (row.subtask === true) {
    return null;
  }
  const display = row.name?.trim();
  if (!display) {
    return null;
  }
  const id = row.id != null && String(row.id).trim() !== '' ? String(row.id).trim() : display;
  return {
    display,
    id,
    key: jiraIssueTypeKey(display),
  };
}

async function fetchJiraQueueWorkflowsFromCreateMeta(
  api: AxiosInstance,
  projectKey: string
): Promise<JiraQueueWorkflowIssueType[]> {
  const { data } = await api.get<unknown>('/issue/createmeta', {
    params: {
      expand: 'projects.issuetypes',
      projectKeys: projectKey,
    },
  });
  if (!data || typeof data !== 'object') {
    return [];
  }
  const projects = (data as { projects?: unknown }).projects;
  if (!Array.isArray(projects) || projects.length === 0) {
    return [];
  }
  const project = projects[0];
  if (!project || typeof project !== 'object') {
    return [];
  }
  const issueTypes = (project as { issuetypes?: unknown }).issuetypes;
  if (!Array.isArray(issueTypes)) {
    return [];
  }
  const out: JiraQueueWorkflowIssueType[] = [];
  for (const row of issueTypes) {
    const mapped = mapJiraProjectIssueType(row);
    if (mapped) {
      out.push(mapped);
    }
  }
  return out;
}

async function fetchJiraQueueWorkflowsFromStatuses(
  api: AxiosInstance,
  projectKey: string
): Promise<JiraQueueWorkflowIssueType[]> {
  const { data } = await api.get<unknown>(`/project/${encodeURIComponent(projectKey)}/statuses`);
  return extractJiraProjectIssueTypeRows(data)
    .map(mapJiraProjectIssueType)
    .filter((row): row is JiraQueueWorkflowIssueType => row != null);
}

async function loadJiraQueueWorkflowIssueTypes(
  api: AxiosInstance,
  projectKey: string
): Promise<JiraQueueWorkflowIssueType[]> {
  try {
    return await fetchJiraQueueWorkflowsFromStatuses(api, projectKey);
  } catch (error) {
    if (isHttpNotFound(error)) {
      return fetchJiraQueueWorkflowsFromCreateMeta(api, projectKey);
    }
    try {
      return await fetchJiraQueueWorkflowsFromCreateMeta(api, projectKey);
    } catch {
      throw error;
    }
  }
}

/** Issue types проекта в формате Yandex queue workflows (один workflow bucket на project key). */
export async function fetchJiraQueueWorkflows(
  api: AxiosInstance,
  queueKey: string
): Promise<Record<string, JiraQueueWorkflowIssueType[]>> {
  const key = queueKey.trim();
  if (!key) {
    return {};
  }

  let types: JiraQueueWorkflowIssueType[] = [];
  try {
    types = await loadJiraQueueWorkflowIssueTypes(api, key);
  } catch {
    return {};
  }

  if (types.length === 0) {
    try {
      types = await fetchJiraQueueWorkflowsFromCreateMeta(api, key);
    } catch {
      return {};
    }
  }

  return types.length > 0 ? { [key]: types } : {};
}
