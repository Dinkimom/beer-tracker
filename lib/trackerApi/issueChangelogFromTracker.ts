import type { IssueChangelogWithComments, IssueComment } from '@/types/tracker';

import axios, { type AxiosInstance } from 'axios';

import { changelogEntriesFromRawIssueLogs } from '@/lib/issueTrackerProvider/changelogNormalizer';

import { requireTrackerAxiosForApiRoute } from '../trackerAxiosFactory';

import { fetchPaginatedTrackerPages } from './trackerPaginationHelpers';

const CHANGELOG_PAGE = 100;
const COMMENTS_PAGE = 100;
const BATCH_CONCURRENCY = 8;

function decodeCommentText(text: string): string {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

interface TrackerCommentRow {
  createdAt: string;
  createdBy?: {
    cloudUid?: string;
    display?: string;
    id?: string;
    passportUid?: number;
  };
  id: number;
  text: string;
  textHtml?: string;
  updatedAt: string;
  updatedBy?: {
    display: string;
    id: string;
  };
}

function isTrackerCommentRow(value: unknown): value is TrackerCommentRow {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === 'number' &&
    typeof row.text === 'string' &&
    typeof row.createdAt === 'string'
  );
}

function issueCommentsFromTrackerApiResponse(raw: unknown): IssueComment[] {
  const arr = Array.isArray(raw) ? raw : [];
  return arr
    .filter(isTrackerCommentRow)
    .map((comment) => ({
      createdAt: comment.createdAt,
      createdBy: {
        cloudUid: comment.createdBy?.cloudUid,
        display: comment.createdBy?.display || 'Unknown',
        id: comment.createdBy?.id || '',
        passportUid: comment.createdBy?.passportUid,
      },
      id: comment.id,
      text: decodeCommentText(comment.text),
      textHtml: comment.textHtml,
      updatedAt: comment.updatedAt,
      updatedBy: comment.updatedBy
        ? {
            display: comment.updatedBy.display,
            id: comment.updatedBy.id,
          }
        : undefined,
    }))
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

/** Все записи changelog задачи (пагинация Tracker API). */
export function fetchTrackerIssueChangelogRawPages(
  api: AxiosInstance,
  issueKey: string
): Promise<unknown[]> {
  return fetchPaginatedTrackerPages<{ id?: string }>(
    api,
    (cursor) =>
      cursor
        ? `/issues/${encodeURIComponent(issueKey)}/changelog?perPage=${CHANGELOG_PAGE}&id=${encodeURIComponent(cursor)}`
        : `/issues/${encodeURIComponent(issueKey)}/changelog?perPage=${CHANGELOG_PAGE}`,
    CHANGELOG_PAGE
  );
}

function fetchAllCommentsPages(api: AxiosInstance, issueKey: string): Promise<unknown[]> {
  const expand = 'expand=all';
  return fetchPaginatedTrackerPages<{ id?: number }>(
    api,
    (cursor) =>
      cursor
        ? `/issues/${encodeURIComponent(issueKey)}/comments?${expand}&perPage=${COMMENTS_PAGE}&id=${encodeURIComponent(cursor)}`
        : `/issues/${encodeURIComponent(issueKey)}/comments?${expand}&perPage=${COMMENTS_PAGE}`,
    COMMENTS_PAGE
  );
}

export async function fetchIssueChangelogWithCommentsFromTracker(
  issueKey: string,
  axiosInstance?: AxiosInstance
): Promise<IssueChangelogWithComments> {
  const api = requireTrackerAxiosForApiRoute(axiosInstance);
  try {
    const [rawLogs, rawComments] = await Promise.all([
      fetchTrackerIssueChangelogRawPages(api, issueKey),
      fetchAllCommentsPages(api, issueKey),
    ]);
    return {
      changelog: changelogEntriesFromRawIssueLogs(rawLogs),
      comments: issueCommentsFromTrackerApiResponse(rawComments),
    };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return { changelog: [], comments: [] };
    }
    throw error;
  }
}

async function mapInChunks<T, R>(
  items: T[],
  chunkSize: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const part = await Promise.all(chunk.map(fn));
    out.push(...part);
  }
  return out;
}

export async function fetchIssuesChangelogBatchFromTracker(
  issueKeys: string[],
  axiosInstance?: AxiosInstance
): Promise<Map<string, IssueChangelogWithComments>> {
  const api = requireTrackerAxiosForApiRoute(axiosInstance);
  const uniqueKeys = [...new Set(issueKeys)];
  const results = await mapInChunks(uniqueKeys, BATCH_CONCURRENCY, async (key) => {
    const data = await fetchIssueChangelogWithCommentsFromTracker(key, api);
    return { key, data };
  });
  const map = new Map<string, IssueChangelogWithComments>();
  for (const { key, data } of results) {
    map.set(key, data);
  }
  for (const key of issueKeys) {
    if (!map.has(key)) {
      map.set(key, { changelog: [], comments: [] });
    }
  }
  return map;
}
