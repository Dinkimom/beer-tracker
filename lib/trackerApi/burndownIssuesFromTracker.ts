/**
 * Данные для burndown: changelog из Tracker API + метаданные из снимков/Tracker (merged issues).
 */

import type { IssueTrackerBurndownIssue } from '@/lib/issueTrackerProvider/changelogTypes';
import type { IssueTrackerBurndownSprintContext } from '@/lib/issueTrackerProvider/types';
import type { TrackerIssue } from '@/types/tracker';

import axios, { type AxiosInstance } from 'axios';

import { buildIssueTrackerBurndownIssueFromPayloadAndLogs } from '@/lib/issueTrackerProvider/changelogNormalizer';

import { requireTrackerAxiosForApiRoute } from '../trackerAxiosFactory';

import { fetchTrackerIssueChangelogRawPages } from './issueChangelogFromTracker';

const BURNDOWN_CHANGELOG_CONCURRENCY = 6;

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

export function fetchBurndownIssuesFromTrackerApi(
  issueKeys: string[],
  sprint: IssueTrackerBurndownSprintContext | undefined,
  issueByKey: ReadonlyMap<string, TrackerIssue>,
  axiosInstance?: AxiosInstance
): Promise<IssueTrackerBurndownIssue[]> {
  if (issueKeys.length === 0) {
    return Promise.resolve([]);
  }
  const api = requireTrackerAxiosForApiRoute(axiosInstance);

  return mapInChunks(issueKeys, BURNDOWN_CHANGELOG_CONCURRENCY, async (key) => {
    const payload = issueByKey.get(key) ?? { key };
    let rawLogs: unknown[] = [];
    try {
      rawLogs = await fetchTrackerIssueChangelogRawPages(api, key);
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 404) {
        rawLogs = [];
      } else {
        throw e;
      }
    }
    return buildIssueTrackerBurndownIssueFromPayloadAndLogs(
      payload,
      rawLogs,
      sprint,
      key
    );
  });
}
