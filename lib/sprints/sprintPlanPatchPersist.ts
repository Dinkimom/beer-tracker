import type { AgentSessionReply } from '@/lib/agentSessions/agentSession';
import type { loadSprintContextForOrganization } from '@/lib/sprints/loadSprintContextForOrganization';
import type {
  PlanPatchPositionPreview,
  PlanPatchPreviewSourcePosition,
} from '@/lib/sprints/sprintPlanPatchPositionPreview';
import type { SprintPlanPatchOp, SprintPlanPatchProposeResult } from '@/lib/sprints/sprintPlanPatchTypes';

import { randomUUID } from 'crypto';

import {
  prepareDraftAgentSession,
  recordDraftInAgentSession,
} from '@/lib/agentSessions/agentSessionService';
import { notifySprintRealtime } from '@/lib/realtime/notifySprintRealtime';
import { persistProposedCreateNotes } from '@/lib/sprints/sprintPlanPatchDraftNotes';
import {
  buildPlanPatchGoalPreviews,
  planPatchGoalSources,
} from '@/lib/sprints/sprintPlanPatchGoalPreview';
import { replacePlanPatchGoalPreviews } from '@/lib/sprints/sprintPlanPatchGoalPreviewRepository';
import { buildPlanPatchPositionPreviews } from '@/lib/sprints/sprintPlanPatchPositionPreview';
import { replacePlanPatchPositionPreviews } from '@/lib/sprints/sprintPlanPatchPositionPreviewRepository';

/**
 * Запись драфта propose_plan_patch на доску (черновые заметки, превью карточек и целей)
 * и в сессию агента. Драфты приватны: всё пишется от имени actorUserId.
 */

function notifyPlanPatchResource(
  organizationId: string,
  sprintId: number,
  resources: Array<'comments' | 'goals' | 'positions'>
): void {
  notifySprintRealtime(
    new Request('http://localhost/api/mcp'),
    organizationId,
    sprintId,
    resources
  );
}

async function persistDraftNotesForProposal(input: {
  actorUserId: string;
  clientBrand?: PlanPatchPositionPreview['clientBrand'];
  expiresAt: Date;
  ops: SprintPlanPatchOp[];
  organizationId: string;
  proposalId: string;
  sprintId: number;
}): Promise<string[]> {
  // Даже без новых createNote: снятие старых pending при смене ops.
  const draftNoteIds = await persistProposedCreateNotes(input);
  notifyPlanPatchResource(input.organizationId, input.sprintId, ['comments']);
  return draftNoteIds;
}

function stampPreviewClientBrand(
  previews: PlanPatchPositionPreview[],
  clientBrand: PlanPatchPositionPreview['clientBrand']
): PlanPatchPositionPreview[] {
  if (!clientBrand) {
    return previews;
  }
  const stamped: PlanPatchPositionPreview[] = [];
  for (const preview of previews) {
    stamped.push({ ...preview, clientBrand });
  }
  return stamped;
}

async function persistPositionPreviewsForProposal(input: {
  clientBrand?: PlanPatchPositionPreview['clientBrand'];
  current: readonly PlanPatchPreviewSourcePosition[];
  expiresAt: Date;
  ops: SprintPlanPatchOp[];
  organizationId: string;
  ownerId: string;
  proposalId: string;
  sprintId: number;
}): Promise<void> {
  // Всегда replace (в т.ч. пустым списком): повторный propose без position-ops
  // должен убрать превью предыдущего предложения.
  await replacePlanPatchPositionPreviews({
    expiresAt: input.expiresAt,
    organizationId: input.organizationId,
    ownerId: input.ownerId,
    previews: stampPreviewClientBrand(
      buildPlanPatchPositionPreviews({
        current: input.current,
        ops: input.ops,
      }),
      input.clientBrand
    ),
    proposalId: input.proposalId,
    sprintId: input.sprintId,
  });
  notifyPlanPatchResource(input.organizationId, input.sprintId, ['positions']);
}

async function persistGoalPreviewsForProposal(input: {
  clientBrand?: PlanPatchPositionPreview['clientBrand'];
  expiresAt: Date;
  goals: {
    delivery: readonly { done: boolean; id: string; text: string }[];
    discovery: readonly { done: boolean; id: string; text: string }[];
  };
  ops: SprintPlanPatchOp[];
  organizationId: string;
  ownerId: string;
  proposalId: string;
  sprintId: number;
}): Promise<void> {
  await replacePlanPatchGoalPreviews({
    expiresAt: input.expiresAt,
    organizationId: input.organizationId,
    ownerId: input.ownerId,
    previews: buildPlanPatchGoalPreviews({
      clientBrand: input.clientBrand,
      createId: randomUUID,
      current: planPatchGoalSources(input.goals.delivery, input.goals.discovery),
      ops: input.ops,
    }),
    proposalId: input.proposalId,
    sprintId: input.sprintId,
  });
  notifyPlanPatchResource(input.organizationId, input.sprintId, ['goals']);
}

async function persistProposeBoardDrafts(input: {
  actorUserId: string;
  clientBrand?: PlanPatchPositionPreview['clientBrand'];
  current: Awaited<ReturnType<typeof loadSprintContextForOrganization>>;
  expiresAt: Date;
  ops: SprintPlanPatchOp[];
  opsHash: string;
  organizationId: string;
  proposalId: string;
  sprintId: number;
}): Promise<string[]> {
  const draftNoteIds = await persistDraftNotesForProposal({
    actorUserId: input.actorUserId,
    clientBrand: input.clientBrand,
    expiresAt: input.expiresAt,
    ops: input.ops,
    organizationId: input.organizationId,
    proposalId: input.opsHash,
    sprintId: input.sprintId,
  });
  await persistPositionPreviewsForProposal({
    clientBrand: input.clientBrand,
    current: input.current.positions,
    expiresAt: input.expiresAt,
    ops: input.ops,
    organizationId: input.organizationId,
    ownerId: input.actorUserId,
    proposalId: input.proposalId,
    sprintId: input.sprintId,
  });
  await persistGoalPreviewsForProposal({
    clientBrand: input.clientBrand,
    expiresAt: input.expiresAt,
    goals: input.current.sprintGoals,
    ops: input.ops,
    organizationId: input.organizationId,
    ownerId: input.actorUserId,
    proposalId: input.proposalId,
    sprintId: input.sprintId,
  });
  return draftNoteIds;
}

/** Драфт на доску + запись в сессию агента (сессию находим до записи — см. prepareDraftAgentSession). */
export async function persistDraftInSession(
  input: Parameters<typeof persistProposeBoardDrafts>[0] & {
    draftMessage?: string;
    intent?: string;
    replies: readonly AgentSessionReply[];
    sessionId?: string;
    summary: string[];
  }
): Promise<{
  agentSession: NonNullable<SprintPlanPatchProposeResult['agentSession']>;
  draftNoteIds: string[];
}> {
  const session = await prepareDraftAgentSession({
    intent: input.intent,
    organizationId: input.organizationId,
    ownerId: input.actorUserId,
    sessionId: input.sessionId,
    sprintId: input.sprintId,
    summaryFallback: input.summary[0] ?? 'Plan draft',
  });
  const draftNoteIds = await persistProposeBoardDrafts(input);
  const agentSession = await recordDraftInAgentSession({
    message: input.draftMessage,
    organizationId: input.organizationId,
    proposalId: input.proposalId,
    replies: input.replies,
    session,
    summary: input.summary.join('\n'),
  });
  return { agentSession, draftNoteIds };
}
