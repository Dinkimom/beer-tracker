import type { TrackerIssue } from '@/types/tracker';
import type { AxiosInstance } from 'axios';

import { requireTrackerAxiosForApiRoute } from '../trackerAxiosFactory';

import { TRACKER_ISSUES_SEARCH_PER_PAGE_CAP } from './issuesFetchHelpers';

function appendIssuesUntilCap(
  collected: TrackerIssue[],
  batch: TrackerIssue[],
  maxTotal: number
): boolean {
  for (const issue of batch) {
    if (collected.length >= maxTotal) {
      return true;
    }
    collected.push(issue);
  }
  return false;
}

function parseTrackerSearchTotalPages(headers: Record<string, unknown>): number {
  const raw = headers['x-total-pages'];
  return raw ? parseInt(String(raw), 10) : 1;
}

export function clampTrackerIssuesPerPage(perPage?: number): number {
  return Math.min(Math.max(perPage ?? TRACKER_ISSUES_SEARCH_PER_PAGE_CAP, 1), TRACKER_ISSUES_SEARCH_PER_PAGE_CAP);
}

interface CollectPaginatedIssuesOptions {
  maxTotal: number;
  onCheckpoint?: (info: { page: number; totalIssues: number; totalPages: number }) => Promise<void> | void;
}

export async function collectPaginatedTrackerIssues(
  api: ReturnType<typeof requireTrackerAxiosForApiRoute>,
  requestPage: (page: number, perPage: number) => Promise<{ batch: TrackerIssue[]; totalPages: number }>,
  perPage: number,
  options: CollectPaginatedIssuesOptions
): Promise<{ issues: TrackerIssue[]; truncated: boolean }> {
  const collected: TrackerIssue[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const { batch, totalPages: pagesFromResponse } = await requestPage(page, perPage);
    totalPages = pagesFromResponse;
    if (appendIssuesUntilCap(collected, batch, options.maxTotal)) {
      return { issues: collected, truncated: true };
    }
    await options.onCheckpoint?.({ page, totalIssues: collected.length, totalPages });
    page += 1;
  } while (page <= totalPages);

  return { issues: collected, truncated: false };
}

export async function postTrackerIssueSearchPage(
  api: AxiosInstance,
  page: number,
  perPage: number,
  body: Record<string, unknown>
): Promise<{ batch: TrackerIssue[]; totalPages: number }> {
  const client = requireTrackerAxiosForApiRoute(api);
  const { data, headers } = await client.post<TrackerIssue[]>(
    `/issues/_search?expand=links&perPage=${perPage}&page=${page}`,
    body
  );
  return {
    batch: data ?? [],
    totalPages: parseTrackerSearchTotalPages(headers as Record<string, unknown>),
  };
}
