import type {
  PlanPatchPositionPreview,
} from '@/lib/sprints/sprintPlanPatchPositionPreview';
import type {
  SprintPlanPatchApplyResult,
  SprintPlanPatchOnError,
  SprintPlanPatchOp,
  SprintPlanPatchProposeResult,
} from '@/lib/sprints/sprintPlanPatchTypes';

import { ZodError } from 'zod';

import { parseAgentSessionReplies } from '@/lib/agentSessions/agentSession';
import { notifySprintRealtime } from '@/lib/realtime/notifySprintRealtime';
import { loadSprintContextForOrganization } from '@/lib/sprints/loadSprintContextForOrganization';
import { buildSprintContextCapacity } from '@/lib/sprints/sprintContextCapacity';
import {
  applySprintPlanPatchOps,
  collectRealtimeResources,
} from '@/lib/sprints/sprintPlanPatchApply';
import {
  buildSprintPlanPatchContentChanges,
  sprintGoalTexts,
} from '@/lib/sprints/sprintPlanPatchContentChanges';
import {
  confirmProposedCreateNotes,
} from '@/lib/sprints/sprintPlanPatchDraftNotes';
import {
  deletePlanPatchGoalPreviewsByProposal,
} from '@/lib/sprints/sprintPlanPatchGoalPreviewRepository';
import {
  simulatePositionsAfterPatch,
  sprintPlanPatchSummaryLookups,
  summarizeSprintPlanPatchOps,
} from '@/lib/sprints/sprintPlanPatchHelpers';
import { assertPlanPatchOpsFitPartsPerDay } from '@/lib/sprints/sprintPlanPatchPartsValidation';
import { applyPendingProposeGate } from '@/lib/sprints/sprintPlanPatchPendingView';
import { persistDraftInSession } from '@/lib/sprints/sprintPlanPatchPersist';
import {
  buildSprintPlanPatchPositionChanges,
  labelSprintPlanPatchPositionChanges,
} from '@/lib/sprints/sprintPlanPatchPositionChanges';
import {
  deletePlanPatchPositionPreviewsByProposal,
} from '@/lib/sprints/sprintPlanPatchPositionPreviewRepository';
import { assertPlanPatchTargetsExist } from '@/lib/sprints/sprintPlanPatchPreflight';
import { parseSprintPlanPatchOps } from '@/lib/sprints/sprintPlanPatchSchema';
import {
  proposalIdFromOpsHash,
  hashSprintPlanPatchOps,
  signSprintPlanPatchToken,
  SPRINT_PLAN_PATCH_TTL_SEC,
  verifySprintPlanPatchToken,
} from '@/lib/sprints/sprintPlanPatchToken';
import {
  buildIssueNotInSprintPlanPatchHints,
  collectIssueNotInSprintWarnings,
  loadSprintIssueKeySet,
} from '@/lib/sprints/sprintPlanPatchTrackerSync';
import {
  collectPositionPatchTaskIds,
  collectUpsertPositionTaskIds,
  formatSprintPlanScheduleForTaskIds,
} from '@/lib/sprints/sprintPlanScheduleFormat';

function formatZodError(error: ZodError): string {
  return error.issues.map((issue) => `${issue.path.join('.') || 'ops'}: ${issue.message}`).join('; ');
}

function parseOpsOrThrow(raw: unknown): SprintPlanPatchOp[] {
  try {
    return parseSprintPlanPatchOps(raw);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new Error(`validation_failed: ${formatZodError(error)}`);
    }
    throw error;
  }
}

export async function proposeSprintPlanPatch(input: {
  actorUserId: string;
  /** Short agent note for the person: what this draft version changes (shown in the session). */
  draftMessage?: string;
  /** Session title when the agent starts a new session from chat (no sessionId, no current draft). */
  intent?: string;
  /** Agent answers to 💬 comments in the session: [{messageId, resolution, text}]. */
  replies?: unknown;
  /** Agent session this draft belongs to (from list_agent_sessions / get_agent_session). */
  sessionId?: string;
  clientBrand?: PlanPatchPositionPreview['clientBrand'];
  ops: unknown;
  organizationId: string;
  /** When false, skip writing translucent createNote drafts (still returns applyToken). Default true. */
  persistNotes?: boolean;
  /**
   * When true, discard an unconfirmed proposal on this sprint before writing the new one.
   * Required if a different pending proposal already exists and persistNotes is true.
   */
  replacePending?: boolean;
  sprintId: number;
}): Promise<SprintPlanPatchProposeResult> {
  const ops = parseOpsOrThrow(input.ops);
  const replies = parseAgentSessionReplies(input.replies);
  const persistNotes = input.persistNotes !== false;
  const replacePending = input.replacePending === true;
  const current = await loadSprintContextForOrganization({
    organizationId: input.organizationId,
    request: null,
    sprintId: input.sprintId,
    useStoredTracker: true,
    viewerUserId: input.actorUserId,
  });
  assertPlanPatchOpsFitPartsPerDay(ops, current.meta.partsPerDay);
  await assertPlanPatchTargetsExist({ ops, sprintId: input.sprintId });
  const simulated = simulatePositionsAfterPatch(current.positions, ops);
  const capacityPreviewSummary = buildSprintContextCapacity({
    availability: current.availability,
    meta: current.meta,
    positions: simulated,
  }).summary;
  const touchedTaskIds = collectPositionPatchTaskIds(ops);
  const calendarDays = current.meta.calendarDays ?? [];
  const schedule = formatSprintPlanScheduleForTaskIds(
    simulated,
    calendarDays,
    current.meta.partsPerDay,
    touchedTaskIds
  );
  const scheduleBefore = formatSprintPlanScheduleForTaskIds(
    current.positions,
    calendarDays,
    current.meta.partsPerDay,
    touchedTaskIds
  );
  const positionChanges = labelSprintPlanPatchPositionChanges({
    calendarDays,
    changes: buildSprintPlanPatchPositionChanges({
      current: current.positions,
      ops,
      simulated,
    }),
    current: current.positions,
    partsPerDay: current.meta.partsPerDay,
    simulated,
  });
  const goalTexts = sprintGoalTexts(current.sprintGoals);
  const contentChanges = buildSprintPlanPatchContentChanges({
    goals: goalTexts,
    notes: current.notes,
    ops,
  });
  const summaryLookups = sprintPlanPatchSummaryLookups(goalTexts, current.notes);
  const sprintIssues = await loadSprintIssueKeySet({
    organizationId: input.organizationId,
    sprintId: input.sprintId,
    sprintStatus: current.meta.sprintWindow?.status,
  });
  const warnings = [
    ...(sprintIssues.warning ? [sprintIssues.warning] : []),
    ...collectIssueNotInSprintWarnings(ops, sprintIssues.keys),
  ];
  const hints = buildIssueNotInSprintPlanPatchHints(
    ops,
    warnings,
    new Set(current.positions.map((position) => position.taskId))
  );

  const nowSec = Math.floor(Date.now() / 1000);
  const opsHash = hashSprintPlanPatchOps(ops);
  const expiresAt = new Date((nowSec + SPRINT_PLAN_PATCH_TTL_SEC) * 1000);
  const proposalId = proposalIdFromOpsHash(opsHash);
  const replacedPending = await applyPendingProposeGate({
    context: current,
    ownerId: input.actorUserId,
    persistNotes,
    proposalId,
    replacePending,
    warnings,
  });

  const summary = summarizeSprintPlanPatchOps(ops, current.positions, summaryLookups);
  const { agentSession, draftNoteIds } = persistNotes
    ? await persistDraftInSession({
        actorUserId: input.actorUserId,
        clientBrand: input.clientBrand,
        current,
        draftMessage: input.draftMessage,
        expiresAt,
        intent: input.intent,
        ops,
        opsHash,
        organizationId: input.organizationId,
        proposalId,
        replies,
        sessionId: input.sessionId,
        sprintId: input.sprintId,
        summary,
      })
    : { agentSession: undefined, draftNoteIds: [] };
  const applyToken = signSprintPlanPatchToken({
    draftNoteIds,
    ops,
    organizationId: input.organizationId,
    sprintId: input.sprintId,
    nowSec,
  });
  return {
    applyToken,
    capacityPreview: { summary: capacityPreviewSummary },
    ...(contentChanges.length > 0 ? { contentChanges } : {}),
    ...(draftNoteIds.length > 0 ? { draftNoteIds } : {}),
    expiresAt: expiresAt.toISOString(),
    ...(agentSession ? { agentSession } : {}),
    ...(hints.length > 0 ? { hints } : {}),
    ops,
    persistNotes,
    ...(positionChanges.length > 0 ? { positionChanges } : {}),
    proposalId,
    ...(replacedPending ? { replacedPending: true } : {}),
    schedule,
    ...(scheduleBefore.length > 0 ? { scheduleBefore } : {}),
    sprintId: input.sprintId,
    summary,
    ...(warnings.length > 0 ? { warnings } : {}),
  };
}

function applyPatchRejected(
  sprintId: number,
  error: string,
  onError?: SprintPlanPatchOnError
): SprintPlanPatchApplyResult {
  return {
    applied: [],
    error,
    ok: false,
    ...(onError ? { onError } : {}),
    sprintId,
  };
}

function notifyAppliedPlanPatch(input: {
  applied: { index: number; ok: boolean }[];
  draftNoteIds: readonly string[];
  ops: SprintPlanPatchOp[];
  organizationId: string;
  sprintId: number;
}): void {
  const okOps = input.applied
    .filter((row) => row.ok)
    .map((row) => input.ops[row.index])
    .filter((op): op is SprintPlanPatchOp => op != null);
  const resources = collectRealtimeResources(okOps);
  if (input.draftNoteIds.length > 0 && !resources.includes('comments')) {
    resources.push('comments');
  }
  if (resources.length === 0) {
    return;
  }
  notifySprintRealtime(
    new Request('http://localhost/api/mcp'),
    input.organizationId,
    input.sprintId,
    resources
  );
}

export async function applySprintPlanPatch(input: {
  actorUserId: string;
  applyToken: string;
  confirm: boolean;
  onError?: SprintPlanPatchOnError;
  ops: unknown;
  organizationId: string;
  sprintId: number;
}): Promise<SprintPlanPatchApplyResult> {
  const onError = input.onError ?? 'stop';
  if (input.confirm !== true) {
    return applyPatchRejected(
      input.sprintId,
      'confirm_required: set confirm=true after reviewing propose_plan_patch',
      onError
    );
  }

  let ops: SprintPlanPatchOp[];
  try {
    ops = parseOpsOrThrow(input.ops);
  } catch (error) {
    return applyPatchRejected(
      input.sprintId,
      error instanceof Error ? error.message : String(error),
      onError
    );
  }

  const verified = verifySprintPlanPatchToken({
    applyToken: input.applyToken,
    ops,
    organizationId: input.organizationId,
    sprintId: input.sprintId,
  });
  if (!verified.ok) {
    return applyPatchRejected(input.sprintId, verified.error, onError);
  }

  await confirmProposedCreateNotes({
    commentIds: verified.draftNoteIds,
    sprintId: input.sprintId,
  });

  const { applied, error } = await applySprintPlanPatchOps({
    actorUserId: input.actorUserId,
    draftNoteIds: verified.draftNoteIds,
    onError,
    organizationId: input.organizationId,
    ops,
    sprintId: input.sprintId,
  });

  if (!error) {
    const proposalId = proposalIdFromOpsHash(hashSprintPlanPatchOps(ops));
    await deletePlanPatchPositionPreviewsByProposal({
      organizationId: input.organizationId,
      ownerId: input.actorUserId,
      proposalId,
      sprintId: input.sprintId,
    });
    await deletePlanPatchGoalPreviewsByProposal({
      organizationId: input.organizationId,
      ownerId: input.actorUserId,
      proposalId,
      sprintId: input.sprintId,
    });
  }

  notifyAppliedPlanPatch({
    applied,
    draftNoteIds: verified.draftNoteIds,
    ops,
    organizationId: input.organizationId,
    sprintId: input.sprintId,
  });

  if (error) {
    return {
      applied,
      error,
      ok: false,
      onError,
      sprintId: input.sprintId,
    };
  }

  let capacity: { summary: string } | undefined;
  let schedule: string[] | undefined;
  try {
    const after = await loadSprintContextForOrganization({
      organizationId: input.organizationId,
      request: null,
      sprintId: input.sprintId,
      useStoredTracker: true,
      viewerUserId: input.actorUserId,
    });
    capacity = { summary: buildSprintContextCapacity(after).summary };
    schedule = formatSprintPlanScheduleForTaskIds(
      after.positions,
      after.meta.calendarDays ?? [],
      after.meta.partsPerDay,
      collectUpsertPositionTaskIds(ops)
    );
  } catch (capacityError) {
    console.warn('[sprint-plan-patch] capacity after apply:', capacityError);
  }

  return {
    applied,
    ...(capacity ? { capacity } : {}),
    ok: true,
    onError,
    ...(schedule ? { schedule } : {}),
    sprintId: input.sprintId,
  };
}
