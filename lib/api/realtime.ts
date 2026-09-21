import type {
  SprintPresenceBoardView,
  SprintPresenceFocus,
  SprintPresenceGesture,
} from '@/lib/realtime/sprintRealtimeTypes';

import { getPlannerBeerTrackerApi } from '@/lib/plannerBeerTrackerApiOverride';

export async function putSprintPresenceFocus(input: {
  boardView?: SprintPresenceBoardView;
  focus: SprintPresenceFocus | null;
  gesture?: SprintPresenceGesture | null;
  organizationId: string;
  sprintId: number;
}): Promise<{ applied: boolean }> {
  const { data } = await getPlannerBeerTrackerApi().put<{ applied?: boolean }>('/realtime/presence', input);
  return { applied: data?.applied !== false };
}
