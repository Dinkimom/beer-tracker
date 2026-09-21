import type { QueueIssueTypeOption } from '@/lib/planner/queueIssueTypes';

import { getPlannerBeerTrackerApi } from '../plannerBeerTrackerApiOverride';

import {
  peekCachedQueueByKey,
  peekCachedQueueIssueTypes,
  runCachedQueueByKeyFetch,
  runCachedQueueIssueTypesFetch,
  setCachedQueueByKey,
} from './plannerQueuesCache';

async function fetchQueueIssueTypesFromNetwork(queueKey: string): Promise<QueueIssueTypeOption[]> {
  try {
    const { data } = await getPlannerBeerTrackerApi().get<{ types: QueueIssueTypeOption[] }>(
      `/queues/${encodeURIComponent(queueKey)}/workflows`
    );
    return data?.types ?? [];
  } catch (error) {
    console.error(`Failed to fetch issue types for queue ${queueKey}:`, error);
    return [];
  }
}

export function fetchQueueIssueTypes(queueKey: string): Promise<QueueIssueTypeOption[]> {
  return runCachedQueueIssueTypesFetch(queueKey, () => fetchQueueIssueTypesFromNetwork(queueKey));
}

async function fetchQueueByKeyFromNetwork(
  queueKey: string
): Promise<{ key: string; name: string } | null> {
  try {
    const { data } = await getPlannerBeerTrackerApi().get<{ key: string; name: string }>(
      `/queues/${encodeURIComponent(queueKey)}`
    );
    if (!data?.key) {
      return null;
    }
    return { key: data.key, name: data.name?.trim() || data.key };
  } catch (error) {
    console.error(`Failed to fetch queue ${queueKey}:`, error);
    return null;
  }
}

export function fetchQueueByKey(
  queueKey: string
): Promise<{ key: string; name: string } | null> {
  return runCachedQueueByKeyFetch(queueKey, () => fetchQueueByKeyFromNetwork(queueKey));
}

export { peekCachedQueueByKey, peekCachedQueueIssueTypes, setCachedQueueByKey };

export async function searchQueues(query: string): Promise<Array<{ key: string; name: string }>> {
  try {
    const params = new URLSearchParams({ q: query });
    const { data } = await getPlannerBeerTrackerApi().get<{
      items: Array<{ key: string; name: string }>;
    }>(
      `/queues/search?${params.toString()}`
    );
    return data?.items ?? [];
  } catch (error) {
    console.error('Failed to search queues:', error);
    return [];
  }
}
