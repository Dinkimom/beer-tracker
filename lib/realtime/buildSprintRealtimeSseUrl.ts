import { parseRealtimeClientId } from './sprintRealtimeClientId';
import { SPRINT_REALTIME_PATH } from './sprintRealtimeConstants';

export function buildSprintRealtimeSseUrl(input: {
  clientId?: string;
  organizationId: string;
  sprintId: number;
}): string {
  const params = new URLSearchParams({
    organizationId: input.organizationId,
    sprintId: String(input.sprintId),
  });
  const clientId = parseRealtimeClientId(input.clientId);
  if (clientId) {
    params.set('clientId', clientId);
  }
  return `${SPRINT_REALTIME_PATH}?${params.toString()}`;
}
