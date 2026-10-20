import type { BoardSprintMetrics } from '@/lib/sprintMetrics/sprintMetricsTypes';

import { getPlannerBeerTrackerApi } from '@/lib/plannerBeerTrackerApiOverride';

export async function fetchBoardSprintMetrics(
  boardId: number,
  quarters: number
): Promise<BoardSprintMetrics> {
  const { data } = await getPlannerBeerTrackerApi().get<BoardSprintMetrics>(
    `/boards/${boardId}/sprint-metrics`,
    { params: { quarters } }
  );
  return data;
}
