import type { AxiosInstance } from 'axios';

import { apiCache } from '@/lib/cache';
import { extractTrackerMetadataArray } from '@/lib/trackerIntegration/fetchTrackerOrgMetadataHelpers';

const JIRA_FIELD_CATALOG_TTL_SECONDS = 10 * 60;

/**
 * Process-wide кэш Jira `GET /field` по base URL. Каталог нужен Story/Test Points,
 * полям расписания и фильтру доски; без кэша каждое действие в планере платит
 * лишний round-trip в Jira Cloud. Параллельные запросы делят один in-flight промис.
 */
const inFlightByCacheKey = new Map<string, Promise<unknown[]>>();

export function jiraApiBaseUrl(api: AxiosInstance): string {
  return typeof api.defaults.baseURL === 'string' ? api.defaults.baseURL.trim() : '';
}

function fieldCatalogCacheKey(api: AxiosInstance): string {
  return `jira:field-catalog:${jiraApiBaseUrl(api) || 'jira'}`;
}

async function fetchJiraFieldCatalog(api: AxiosInstance, cacheKey: string): Promise<unknown[]> {
  try {
    const { data } = await api.get<unknown>('/field');
    const catalog = extractTrackerMetadataArray(data);
    apiCache.set(cacheKey, catalog, JIRA_FIELD_CATALOG_TTL_SECONDS);
    return catalog;
  } finally {
    inFlightByCacheKey.delete(cacheKey);
  }
}

export function loadJiraFieldCatalog(api: AxiosInstance): Promise<unknown[]> {
  const cacheKey = fieldCatalogCacheKey(api);
  const cached = apiCache.get<unknown[]>(cacheKey);
  if (cached) {
    return Promise.resolve(cached);
  }
  const pending = inFlightByCacheKey.get(cacheKey) ?? fetchJiraFieldCatalog(api, cacheKey);
  inFlightByCacheKey.set(cacheKey, pending);
  return pending;
}

/** Vitest: process-wide кэш не должен протекать между кейсами. */
export function clearJiraFieldCatalogCacheForTests(): void {
  inFlightByCacheKey.clear();
  apiCache.deleteByPattern(/^jira:/);
}
