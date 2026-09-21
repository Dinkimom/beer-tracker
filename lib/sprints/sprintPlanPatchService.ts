import type {
  SprintPlanPatchApplyResult,
  SprintPlanPatchOp,
  SprintPlanPatchProposeResult,
} from '@/lib/sprints/sprintPlanPatchTypes';

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
  simulatePositionsAfterPatch,
  summarizeSprintPlanPatchOps,
} from '@/lib/sprints/sprintPlanPatchHelpers';
import { parseSprintPlanPatchOps } from '@/lib/sprints/sprintPlanPatchSchema';
import {
  proposalIdFromOpsHash,
  hashSprintPlanPatchOps,
  signSprintPlanPatchToken,
  SPRINT_PLAN_PATCH_TTL_SEC,
  verifySprintPlanPatchToken,
} from '@/lib/sprints/sprintPlanPatchToken';

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

function notifyPlanPatchComments(organizationId: string, sprintId: number): void {
  notifySprintRealtime(
    new Request('http://localhost/api/mcp'),
    organizationId,
    sprintId,
    ['comments']
  );
}

async function persistDraftNotesForProposal(input: {
  expiresAt: Date;
  ops: SprintPlanPatchOp[];
  organizationId: string;
  proposalId: string;
  sprintId: number;
}): Promise<string[]> {
  const draftNoteIds = await persistProposedCreateNotes(input);
  if (draftNoteIds.length > 0) {
    notifyPlanPatchComments(input.organizationId, input.sprintId);
  }
  return draftNoteIds;
}

async function loadCapacitySummary(input: {
  organizationId: string;
  sprintId: number;
}): Promise<string> {
  const current = await loadSprintContextForOrganization({
    organizationId: input.organizationId,
    request: null,
    sprintId: input.sprintId,
    useStoredTracker: true,
  });
  return buildSprintContextCapacity(current).summary;
}

export async function proposeSprintPlanPatch(input: {
  ops: unknown;
  organizationId: string;
  sprintId: number;
}): Promise<SprintPlanPatchProposeResult> {
  const ops = parseOpsOrThrow(input.ops);
  const current = await loadSprintContextForOrganization({
    organizationId: input.organizationId,
    request: null,
    sprintId: input.sprintId,
    useStoredTracker: true,
  });
  const simulated = simulatePositionsAfterPatch(current.positions, ops);
  const capacityPreviewSummary = buildSprintContextCapacity({
    availability: current.availability,
    meta: current.meta,
    positions: simulated,
  }).summary;

  const nowSec = Math.floor(Date.now() / 1000);
  const opsHash = hashSprintPlanPatchOps(ops);
  const expiresAt = new Date((nowSec + SPRINT_PLAN_PATCH_TTL_SEC) * 1000);
  const draftNoteIds = await persistDraftNotesForProposal({
    expiresAt,
    ops,
    organizationId: input.organizationId,
    proposalId: opsHash,
    sprintId: input.sprintId,
  });
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
    proposalId: proposalIdFromOpsHash(opsHash),
    sprintId: input.sprintId,
    summary: summarizeSprintPlanPatchOps(ops),
  };
}

function applyPatchRejected(
  sprintId: number,
  error: string
): SprintPlanPatchApplyResult {
  return { applied: [], error, ok: false, sprintId };
}

function notifyAppliedPlanPatch(input: {
  applied: { ok: boolean }[];
  draftNoteIds: readonly string[];
  ops: SprintPlanPatchOp[];
  organizationId: string;
  sprintId: number;
}): void {
  const resources = collectRealtimeResources(input.ops.slice(0, input.applied.filter((row) => row.ok).length));
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
  applyToken: string;
  confirm: boolean;
  ops: unknown;
  organizationId: string;
  sprintId: number;
}): Promise<SprintPlanPatchApplyResult> {
  if (input.confirm !== true) {
    return applyPatchRejected(
      input.sprintId,
      'confirm_required: set confirm=true after reviewing propose_plan_patch'
    );
  }

  let ops: SprintPlanPatchOp[];
  try {
    ops = parseOpsOrThrow(input.ops);
  } catch (error) {
    return applyPatchRejected(
      input.sprintId,
      error instanceof Error ? error.message : String(error)
    );
  }

  const verified = verifySprintPlanPatchToken({
    applyToken: input.applyToken,
    ops,
    organizationId: input.organizationId,
    sprintId: input.sprintId,
  });
  if (!verified.ok) {
    return applyPatchRejected(input.sprintId, verified.error);
  }

  await confirmProposedCreateNotes({
    commentIds: verified.draftNoteIds,
    sprintId: input.sprintId,
  });

  const { applied, error } = await applySprintPlanPatchOps({
    draftNoteIds: verified.draftNoteIds,
    organizationId: input.organizationId,
    ops,
    sprintId: input.sprintId,
  });

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
      sprintId: input.sprintId,
    };
  }

  let capacity: { summary: string } | undefined;
  try {
    capacity = { summary: await loadCapacitySummary({
      organizationId: input.organizationId,
      sprintId: input.sprintId,
    }) };
  } catch (capacityError) {
    console.warn('[sprint-plan-patch] capacity after apply:', capacityError);
  }

  return {
    applied,
    ...(capacity ? { capacity } : {}),
    ok: true,
    sprintId: input.sprintId,
  };
}
