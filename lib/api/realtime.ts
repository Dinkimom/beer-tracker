import type {
  SprintPresenceAttention,
  SprintPresenceBoardView,
  SprintPresenceFocus,
  SprintPresenceGesture,
} from '@/lib/realtime/sprintRealtimeTypes';

import { getPlannerBeerTrackerApi } from '@/lib/plannerBeerTrackerApiOverride';

export async function putSprintPresenceFocus(input: {
  attention?: SprintPresenceAttention;
  boardView?: SprintPresenceBoardView;
  focus: SprintPresenceFocus | null;
  gesture?: SprintPresenceGesture | null;
  organizationId: string;
  /** Квартальный план вместо спринта: `year` и `quarter` (QS7). */
  quarter?: number;
  sprintId?: number;
  year?: number;
}): Promise<{ applied: boolean }> {
  const { data } = await getPlannerBeerTrackerApi().put<{ applied?: boolean }>('/realtime/presence', input);
  return { applied: data?.applied !== false };
}
