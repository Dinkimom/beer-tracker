import type {
  PlanPatchPositionPreview,
  PlanPatchPreviewSourcePosition,
} from '@/lib/sprints/sprintPlanPatchPositionPreview';
import type {
  SprintPlanPatchApplyResult,
  SprintPlanPatchOnError,
  SprintPlanPatchOp,
  SprintPlanPatchProposeResult,
} from '@/lib/sprints/sprintPlanPatchTypes';

import { randomUUID } from 'crypto';

import { ZodError } from 'zod';

import { notifySprintRealtime } from '@/lib/realtime/notifySprintRealtime';
import { loadSprintContextForOrganization } from '@/lib/sprints/loadSprintContextForOrganization';
import { buildSprintContextCapacity } from '@/lib/sprints/sprintContextCapacity';
import {
  applySprintPlanPatchOps,
  collectRealtimeResources,
} from '@/lib/sprints/sprintPlanPatchApply';
import {
  confirmProposedCreateNotes,
  persistProposedCreateNotes,
} from '@/lib/sprints/sprintPlanPatchDraftNotes';
import {
  buildPlanPatchGoalPreviews,
  planPatchGoalSources,
} from '@/lib/sprints/sprintPlanPatchGoalPreview';
import {
  deletePlanPatchGoalPreviewsByProposal,
  replacePlanPatchGoalPreviews,
} from '@/lib/sprints/sprintPlanPatchGoalPreviewRepository';
import {
  simulatePositionsAfterPatch,
  summarizeSprintPlanPatchOps,
} from '@/lib/sprints/sprintPlanPatchHelpers';
import { assertPlanPatchOpsFitPartsPerDay } from '@/lib/sprints/sprintPlanPatchPartsValidation';
import { buildPlanPatchPositionPreviews } from '@/lib/sprints/sprintPlanPatchPositionPreview';
import {
  deletePlanPatchPositionPreviewsByProposal,
  replacePlanPatchPositionPreviews,
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
  collectIssueNotInSprintWarnings,
  loadSprintIssueKeySet,
} from '@/lib/sprints/sprintPlanPatchTrackerSync';
import {
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
  expiresAt: Date;
  ops: SprintPlanPatchOp[];
  organizationId: string;
  proposalId: string;
  sprintId: number;
}): Promise<string[]> {
  const draftNoteIds = await persistProposedCreateNotes(input);
  if (draftNoteIds.length > 0) {
    notifyPlanPatchResource(input.organizationId, input.sprintId, ['comments']);
  }
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
  proposalId: string;
  sprintId: number;
}): Promise<void> {
  const touchesPositions = input.ops.some(
    (op) => op.op === 'upsertPosition' || op.op === 'deletePosition'
  );
  if (!touchesPositions) {
    return;
  }
  await replacePlanPatchPositionPreviews({
    expiresAt: input.expiresAt,
    organizationId: input.organizationId,
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
  proposalId: string;
  sprintId: number;
}): Promise<void> {
  const touchesGoals = input.ops.some(
    (op) => op.op === 'createGoal' || op.op === 'updateGoal' || op.op === 'deleteGoal'
  );
  if (!touchesGoals) {
    return;
  }
  await replacePlanPatchGoalPreviews({
    expiresAt: input.expiresAt,
    organizationId: input.organizationId,
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

export async function proposeSprintPlanPatch(input: {
  actorUserId: string;
  clientBrand?: PlanPatchPositionPreview['clientBrand'];
  ops: unknown;
  organizationId: string;
  /** When false, skip writing translucent createNote drafts (still returns applyToken). Default true. */
  persistNotes?: boolean;
  sprintId: number;
}): Promise<SprintPlanPatchProposeResult> {
  const ops = parseOpsOrThrow(input.ops);
  const persistNotes = input.persistNotes !== false;
  const current = await loadSprintContextForOrganization({
    organizationId: input.organizationId,
    request: null,
    sprintId: input.sprintId,
    useStoredTracker: true,
  });
  assertPlanPatchOpsFitPartsPerDay(ops, current.meta.partsPerDay);
  await assertPlanPatchTargetsExist({ ops, sprintId: input.sprintId });
  const simulated = simulatePositionsAfterPatch(current.positions, ops);
  const capacityPreviewSummary = buildSprintContextCapacity({
    availability: current.availability,
    meta: current.meta,
    positions: simulated,
  }).summary;
  const schedule = formatSprintPlanScheduleForTaskIds(
    simulated,
    current.meta.calendarDays ?? [],
    current.meta.partsPerDay,
    collectUpsertPositionTaskIds(ops)
  );
  const sprintIssues = await loadSprintIssueKeySet({
    organizationId: input.organizationId,
    sprintId: input.sprintId,
    sprintStatus: current.meta.sprintWindow?.status,
  });
  const warnings = [
    ...(sprintIssues.warning ? [sprintIssues.warning] : []),
    ...collectIssueNotInSprintWarnings(ops, sprintIssues.keys),
  ];

  const nowSec = Math.floor(Date.now() / 1000);
  const opsHash = hashSprintPlanPatchOps(ops);
  const expiresAt = new Date((nowSec + SPRINT_PLAN_PATCH_TTL_SEC) * 1000);
  const proposalId = proposalIdFromOpsHash(opsHash);
  const draftNoteIds = persistNotes
    ? await persistDraftNotesForProposal({
        actorUserId: input.actorUserId,
        expiresAt,
        ops,
        organizationId: input.organizationId,
        proposalId: opsHash,
        sprintId: input.sprintId,
      })
    : [];
  if (persistNotes) {
    await persistPositionPreviewsForProposal({
      clientBrand: input.clientBrand,
      current: current.positions,
      expiresAt,
      ops,
      organizationId: input.organizationId,
      proposalId,
      sprintId: input.sprintId,
    });
    await persistGoalPreviewsForProposal({
      clientBrand: input.clientBrand,
      expiresAt,
      goals: current.sprintGoals,
      ops,
      organizationId: input.organizationId,
      proposalId,
      sprintId: input.sprintId,
    });
  }
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
    ...(draftNoteIds.length > 0 ? { draftNoteIds } : {}),
    expiresAt: expiresAt.toISOString(),
    ops,
    persistNotes,
    proposalId,
    schedule,
    sprintId: input.sprintId,
    summary: summarizeSprintPlanPatchOps(ops),
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
      proposalId,
      sprintId: input.sprintId,
    });
    await deletePlanPatchGoalPreviewsByProposal({
      organizationId: input.organizationId,
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
