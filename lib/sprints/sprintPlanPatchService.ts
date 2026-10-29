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
import { runBeerTrackerTransaction } from '@/lib/db';
import { notifySprintRealtime } from '@/lib/realtime/notifySprintRealtime';
import { loadSprintContextForOrganization } from '@/lib/sprints/loadSprintContextForOrganization';
import { deletePendingCommentReplacements } from '@/lib/sprints/sprintCommentReplacements';
import { buildSprintContextCapacity } from '@/lib/sprints/sprintContextCapacity';
import { claimPlanPatchApplyToken } from '@/lib/sprints/sprintPlanPatchAppliedTokenRepository';
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
import { buildNoteOverlapHints, collectNoteOverlapWarnings } from '@/lib/sprints/sprintPlanPatchNoteOverlap';
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
  runPlanPatchTrackerSyncs,
  type PlanPatchTrackerSyncRequest,
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
  const noteOverlapWarnings = collectNoteOverlapWarnings({
    dayCount: calendarDays.length,
    notes: current.notes,
    ops,
    partsPerDay: current.meta.partsPerDay,
  });
  warnings.push(...noteOverlapWarnings);
  const hints = [
    ...buildIssueNotInSprintPlanPatchHints(
      ops,
      warnings,
      new Set(current.positions.map((position) => position.taskId))
    ),
    ...buildNoteOverlapHints(noteOverlapWarnings),
  ];

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

/** `onError='stop'` с ошибкой: бросаем из транзакции, чтобы откатить уже выполненные операции. */
class PlanPatchStopped extends Error {
  constructor(
    readonly applied: SprintPlanPatchApplyResult['applied'],
    readonly summary: string
  ) {
    super(summary);
  }
}

type AtomicApplyOutcome =
  {
      applied: SprintPlanPatchApplyResult['applied'];
      error?: string;
      kind: 'committed';
      trackerSyncs: PlanPatchTrackerSyncRequest[];
    } | { applied: SprintPlanPatchApplyResult['applied']; error: string; kind: 'rolled_back' } | { kind: 'already_applied' };

/**
 * Одна транзакция: захват токена → подтверждение черновых заметок → операции.
 * `stop` с ошибкой откатывает всё (и освобождает токен для повтора); `continue` коммитит удачные.
 */
async function applyVerifiedPlanPatchAtomically(input: {
  actorUserId: string;
  applyToken: string;
  draftNoteIds: string[];
  expiresAtSec: number;
  onError: SprintPlanPatchOnError;
  ops: SprintPlanPatchOp[];
  organizationId: string;
  sprintId: number;
}): Promise<AtomicApplyOutcome> {
  try {
    return await runBeerTrackerTransaction(async (tx): Promise<AtomicApplyOutcome> => {
      const claimed = await claimPlanPatchApplyToken(
        {
          applyToken: input.applyToken,
          expiresAtSec: input.expiresAtSec,
          organizationId: input.organizationId,
          sprintId: input.sprintId,
        },
        tx
      );
      if (!claimed) {
        return { kind: 'already_applied' };
      }
      await confirmProposedCreateNotes({ commentIds: input.draftNoteIds, sprintId: input.sprintId }, tx);
      const result = await applySprintPlanPatchOps({ ...input, tx });
      if (result.error && input.onError === 'stop') {
        throw new PlanPatchStopped(result.applied, result.error);
      }
      return { ...result, kind: 'committed' };
    });
  } catch (error) {
    if (error instanceof PlanPatchStopped) {
      return { applied: error.applied, error: error.summary, kind: 'rolled_back' };
    }
    throw error;
  }
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

/** После успешного применения убирает превью и замены черновиков этого предложения. */
async function clearAppliedProposalPreviews(input: {
  actorUserId: string;
  ops: SprintPlanPatchOp[];
  organizationId: string;
  sprintId: number;
}): Promise<void> {
  await deletePendingCommentReplacements({ ownerId: input.actorUserId, sprintId: input.sprintId });
  const proposalId = proposalIdFromOpsHash(hashSprintPlanPatchOps(input.ops));
  const scope = {
    organizationId: input.organizationId,
    ownerId: input.actorUserId,
    proposalId,
    sprintId: input.sprintId,
  };
  await deletePlanPatchPositionPreviewsByProposal(scope);
  await deletePlanPatchGoalPreviewsByProposal(scope);
}

/** Ёмкость и раскладка после применения — для ответа агенту; сбой не валит применение. */
async function loadAppliedPlanPatchSummary(input: {
  actorUserId: string;
  ops: SprintPlanPatchOp[];
  organizationId: string;
  sprintId: number;
}): Promise<{ capacity?: { summary: string }; schedule?: string[] }> {
  try {
    const after = await loadSprintContextForOrganization({
      organizationId: input.organizationId,
      request: null,
      sprintId: input.sprintId,
      useStoredTracker: true,
      viewerUserId: input.actorUserId,
    });
    const capacity = { summary: buildSprintContextCapacity(after).summary };
    const schedule = formatSprintPlanScheduleForTaskIds(
      after.positions,
      after.meta.calendarDays ?? [],
      after.meta.partsPerDay,
      collectUpsertPositionTaskIds(input.ops)
    );
    return { capacity, schedule };
  } catch (capacityError) {
    console.warn('[sprint-plan-patch] capacity after apply:', capacityError);
  }
  return {};
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

  const outcome = await applyVerifiedPlanPatchAtomically({
    actorUserId: input.actorUserId,
    applyToken: input.applyToken,
    draftNoteIds: verified.draftNoteIds,
    expiresAtSec: verified.exp,
    onError,
    ops,
    organizationId: input.organizationId,
    sprintId: input.sprintId,
  });
  if (outcome.kind === 'already_applied') {
    return applyPatchRejected(
      input.sprintId,
      'already_applied: this applyToken was used; call propose_plan_patch for a new one',
      onError
    );
  }
  const { applied, error } = outcome;
  if (outcome.kind === 'rolled_back') {
    return { applied, error, ok: false, onError, rolledBack: true, sprintId: input.sprintId };
  }
  await runPlanPatchTrackerSyncs({
    applied,
    organizationId: input.organizationId,
    sprintId: input.sprintId,
    trackerSyncs: outcome.trackerSyncs,
  });

  if (!error) {
    await clearAppliedProposalPreviews({ ...input, ops });
  }

  notifyAppliedPlanPatch({
    applied,
    draftNoteIds: verified.draftNoteIds,
    ops,
    organizationId: input.organizationId,
    sprintId: input.sprintId,
  });

  if (error) {
    return { applied, error, ok: false, onError, sprintId: input.sprintId };
  }

  const summary = await loadAppliedPlanPatchSummary({ ...input, ops });
  return { applied, ...summary, ok: true, onError, sprintId: input.sprintId };
}
