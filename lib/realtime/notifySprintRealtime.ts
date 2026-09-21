import type {
  SprintRealtimeIssueMembership,
  SprintRealtimeIssueStatus,
  SprintRealtimeResource,
} from './sprintRealtimeTypes';

import { TENANT_ORG_HEADER } from '@/lib/tenantHttpConstants';

import { publishSprintRealtimeEvent } from './sprintRealtimeBus';
import { getRealtimeClientIdFromRequest } from './sprintRealtimeClientId';

interface SprintRealtimeNotifyExtras {
  issueMembership?: SprintRealtimeIssueMembership;
  issueStatus?: SprintRealtimeIssueStatus;
}

export function notifySprintRealtime(
  request: Request,
  organizationId: string,
  sprintId: number,
  resources: readonly SprintRealtimeResource[],
  extras?: SprintRealtimeNotifyExtras
): void {
  if (!Number.isInteger(sprintId) || sprintId <= 0 || resources.length === 0) {
    return;
  }
  publishSprintRealtimeEvent({
    at: Date.now(),
    organizationId,
    originClientId: getRealtimeClientIdFromRequest(request),
    resources: [...resources],
    sprintId,
    type: 'sprint.changed',
    ...(extras?.issueStatus ? { issueStatus: extras.issueStatus } : {}),
    ...(extras?.issueMembership ? { issueMembership: extras.issueMembership } : {}),
  }).catch((error) => {
    console.error('[realtime] publish failed', error);
  });
}

/** Публикация в каждый спринт задачи (переходы статуса живут на issue, не на sprint overlay). */
export function notifySprintRealtimeForSprintIds(
  request: Request,
  sprintIds: readonly number[],
  resources: readonly SprintRealtimeResource[],
  extras?: SprintRealtimeNotifyExtras
): void {
  const organizationId = request.headers.get(TENANT_ORG_HEADER)?.trim();
  if (!organizationId || sprintIds.length === 0 || resources.length === 0) {
    return;
  }
  for (const sprintId of sprintIds) {
    notifySprintRealtime(request, organizationId, sprintId, resources, extras);
  }
}
