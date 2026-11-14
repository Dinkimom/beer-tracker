import type { SprintContextPayload } from '@/lib/sprints/sprintContextTypes';

import { sprintScope } from '@/lib/agentSessions/agentSessionScope';
import { getIssueTrackerProviderClientForOrganization } from '@/lib/issueTrackerProvider/clientFactory';
import { loadDraftAgentSessionSummary } from '@/lib/mcp/registerAgentSessionMcpTools';
import { loadQuarterlyPlanDraft } from '@/lib/quarterlyPlans/quarterlyPlanDrafts';
import { loadSprintQuarterContext, type SprintQuarterContext } from '@/lib/quarterlyPlans/quarterlyPlanService';
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
      scope: sprintScope(payload.meta.sprintId),
    });
    return { ...payload, ...(agentSession ? { agentSession } : {}), pendingProposal };
  } catch (error) {
    console.warn('[sprint-context] pending proposal:', error);
    return payload;
  }
}

/**
 * Квартал спринта (docs/QUARTERLY_PLAN_RULES.md, раздел 12): кого квартал ждёт на каких эпиках в неделях
 * спринта, строки плана у задач, работа вне плана и свой черновик квартала (`pendingProposal.after`).
 * Плана нет или он не загрузился — поля нет.
 */
export async function withQuarterContext<T extends SprintContextPayload>(
  payload: T,
  input: { onlyMemberId?: string; ownerId: string }
): Promise<T & { quarter?: SprintQuarterContext }> {
  const { organizationId } = payload.meta;
  const tasks = [
    ...payload.positions.map((position) => ({
      assigneeId: position.assigneeId || null,
      parentKey: position.parentKey ?? null,
      taskId: position.taskId,
    })),
    ...(payload.unplannedTasks ?? []).map((task) => ({
      assigneeId: task.assigneeId ?? null,
      parentKey: task.parentKey ?? null,
      taskId: task.taskId,
    })),
  ];
  try {
    const quarter = await loadSprintQuarterContext({
      boardId: payload.meta.boardId,
      issueTracker: await getIssueTrackerProviderClientForOrganization(organizationId),
      // Свой черновик квартала (черновики приватны, как в спринте): агент видит, каким станет квартал после принятия.
      loadDraft: async (ref) => {
        const draft = await loadQuarterlyPlanDraft({ organizationId, ownerId: input.ownerId, ref });
        if (!draft) return null;
        return {
          content: draft.preview?.content ?? null,
          error: draft.error,
          proposalId: draft.proposalId,
          summary: draft.summary,
        };
      },
      onlyMemberId: input.onlyMemberId,
      organizationId,
      sprintWindow: payload.meta.sprintWindow,
      tasks,
    });
    return quarter ? { ...payload, quarter } : payload;
  } catch (error) {
    console.warn('[sprint-context] quarter:', error);
    return payload;
  }
}
