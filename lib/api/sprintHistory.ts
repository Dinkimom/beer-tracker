/**
 * История изменений спринта: `GET /sprints/:id/history`.
 */

import type { SprintHistoryEvent, SprintHistoryResponse } from '@/lib/boardHistory/sprintHistoryTypes';

import { getPlannerBeerTrackerApi } from '../plannerBeerTrackerApiOverride';

export async function fetchSprintHistory(
  sprintId: number,
  window: { since: string | null; until: string | null }
): Promise<SprintHistoryEvent[]> {
  const { data } = await getPlannerBeerTrackerApi().get<SprintHistoryResponse>(
    `/sprints/${sprintId}/history`,
    {
      params: {
        ...(window.since ? { since: window.since } : {}),
        ...(window.until ? { until: window.until } : {}),
      },
    }
  );
  return data?.events ?? [];
}
