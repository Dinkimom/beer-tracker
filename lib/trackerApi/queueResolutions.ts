/**
 * Резолюции очереди из issueTypesConfig (привязка к workflow / типу задачи).
 */

import type { AxiosInstance } from 'axios';

import { apiCache, cacheKeys } from '../cache';
import { requireTrackerAxiosForApiRoute } from '../trackerAxiosFactory';

import { TRACKER_V3_BASE, WORKFLOW_CACHE_TTL } from './constants';

interface QueueResolutionOption {
  display: string;
  key: string;
}

interface IssueTypesConfigEntry {
  issueType?: { key?: string };
  resolutions?: Array<{ display?: string; key?: string }>;
}

function mapResolutionRows(
  rows: Array<{ display?: string; key?: string }> | undefined
): QueueResolutionOption[] {
  if (!Array.isArray(rows)) {
    return [];
  }
  const out: QueueResolutionOption[] = [];
  for (const row of rows) {
    if (!row?.key) continue;
    out.push({
      key: row.key,
      display: row.display?.trim() || row.key,
    });
  }
  return out;
}

function resolutionsFromIssueTypesConfig(
  configs: IssueTypesConfigEntry[],
  issueTypeKey: string | undefined
): QueueResolutionOption[] {
  if (issueTypeKey) {
    const matched = configs.find((c) => c.issueType?.key === issueTypeKey);
    const fromType = mapResolutionRows(matched?.resolutions);
    if (fromType.length > 0) {
      return fromType;
    }
  }

  const seen = new Set<string>();
  const union: QueueResolutionOption[] = [];
  for (const config of configs) {
    for (const resolution of mapResolutionRows(config.resolutions)) {
      if (seen.has(resolution.key)) continue;
      seen.add(resolution.key);
      union.push(resolution);
    }
  }
  return union;
}

async function fetchQueueIssueTypesConfig(
  queueKey: string,
  axiosInstance?: AxiosInstance
): Promise<IssueTypesConfigEntry[]> {
  const key = queueKey.trim();
  if (!key) {
    return [];
  }
  const cacheKey = cacheKeys.queueIssueTypesConfig(key);
  const cached = apiCache.get<IssueTypesConfigEntry[]>(cacheKey);
  if (cached) {
    return cached;
  }

  const api = requireTrackerAxiosForApiRoute(axiosInstance);
  try {
    const { data } = await api.get<{ issueTypesConfig?: IssueTypesConfigEntry[] }>(
      `${TRACKER_V3_BASE}/queues/${encodeURIComponent(key)}`,
      { params: { expand: 'issueTypesConfig' } }
    );
    const configs = Array.isArray(data?.issueTypesConfig) ? data.issueTypesConfig : [];
    apiCache.set(cacheKey, configs, WORKFLOW_CACHE_TTL);
    return configs;
  } catch {
    return [];
  }
}

/** Резолюции для типа задачи в очереди (из workflow/issueTypesConfig). */
export async function fetchQueueIssueTypeResolutions(
  queueKey: string,
  issueTypeKey: string | undefined,
  axiosInstance?: AxiosInstance
): Promise<QueueResolutionOption[]> {
  const configs = await fetchQueueIssueTypesConfig(queueKey, axiosInstance);
  return resolutionsFromIssueTypesConfig(configs, issueTypeKey);
}

export function resolutionOptionsForSelect(
  resolutions: QueueResolutionOption[]
): Array<{ label: string; value: string }> {
  return resolutions.map((r) => ({ label: r.display, value: r.key }));
}
