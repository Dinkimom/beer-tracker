import type { SprintTimerAction, SprintTimerState } from '@/lib/realtime/sprintTimerState';

import { getPlannerBeerTrackerApi } from '@/lib/plannerBeerTrackerApiOverride';
import { parseSprintTimerState } from '@/lib/realtime/sprintTimerState';

function timerFromResponse(data: unknown): SprintTimerState | null {
  if (!data || typeof data !== 'object') {
    return null;
  }
  return parseSprintTimerState((data as { timer?: unknown }).timer);
}

export async function fetchSprintTimer(sprintId: number): Promise<SprintTimerState | null> {
  const { data } = await getPlannerBeerTrackerApi().get(`/sprints/${sprintId}/timer`);
  return timerFromResponse(data);
}

export async function postSprintTimerAction(
  sprintId: number,
  action: SprintTimerAction
): Promise<SprintTimerState | null> {
  const { data } = await getPlannerBeerTrackerApi().post(`/sprints/${sprintId}/timer`, action);
  return timerFromResponse(data);
}
