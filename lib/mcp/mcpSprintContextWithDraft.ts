import type { SprintContextPayload } from '@/lib/sprints/sprintContextTypes';

import { loadDraftAgentSessionSummary } from '@/lib/mcp/registerAgentSessionMcpTools';
import { loadSprintContextForOrganization } from '@/lib/sprints/loadSprintContextForOrganization';
import {
  loadPendingPlanPatchView,
  type PendingPlanPatchView,
} from '@/lib/sprints/sprintPlanPatchPendingView';

/** Контекст спринта для MCP от имени пользователя: его черновые заметки и его драфт (драфты приватны). */
export function loadMcpSprintContext(input: {
  assigneeId?: string;
  featureId?: string;
  organizationId: string;
  sprintId: number;
  taskIds?: string[];
  viewerUserId: string;
}) {
  return loadSprintContextForOrganization({
    assigneeId: input.assigneeId,
    featureId: input.featureId,
    organizationId: input.organizationId,
    request: null,
    sprintId: input.sprintId,
    taskIds: input.taskIds,
    useStoredTracker: true,
    viewerUserId: input.viewerUserId,
  });
}

type SprintContextWithDrafts = SprintContextPayload & {
  agentSession?: Awaited<ReturnType<typeof loadDraftAgentSessionSummary>>;
  pendingProposal?: PendingPlanPatchView;
};

/** Свой драфт (драфты приватны) и сессия, в которой он лежит. */
export async function withPendingProposal(
  payload: SprintContextPayload,
  ownerId: string
): Promise<SprintContextWithDrafts> {
  try {
    const pendingProposal = await loadPendingPlanPatchView({
      context: payload,
      organizationId: payload.meta.organizationId,
      ownerId,
      sprintId: payload.meta.sprintId,
    });
    if (!pendingProposal) {
      return payload;
    }
    const agentSession = await loadDraftAgentSessionSummary({
      organizationId: payload.meta.organizationId,
      ownerId,
      proposalId: pendingProposal.proposalId,
      sprintId: payload.meta.sprintId,
    });
    return { ...payload, ...(agentSession ? { agentSession } : {}), pendingProposal };
  } catch (error) {
    console.warn('[sprint-context] pending proposal:', error);
    return payload;
  }
}
