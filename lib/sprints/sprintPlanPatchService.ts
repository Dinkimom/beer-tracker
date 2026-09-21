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
  const applyToken = signSprintPlanPatchToken({
    ops,
    organizationId: input.organizationId,
    sprintId: input.sprintId,
    nowSec,
  });
  const opsHash = hashSprintPlanPatchOps(ops);
  return {
    applyToken,
    capacityPreview: { summary: capacityPreviewSummary },
    expiresAt: new Date((nowSec + SPRINT_PLAN_PATCH_TTL_SEC) * 1000).toISOString(),
    ops,
    proposalId: proposalIdFromOpsHash(opsHash),
    sprintId: input.sprintId,
    summary: summarizeSprintPlanPatchOps(ops),
  };
}

export async function applySprintPlanPatch(input: {
  applyToken: string;
  confirm: boolean;
  ops: unknown;
  organizationId: string;
  sprintId: number;
}): Promise<SprintPlanPatchApplyResult> {
  if (input.confirm !== true) {
    return {
      applied: [],
      error: 'confirm_required: set confirm=true after reviewing propose_plan_patch',
      ok: false,
      sprintId: input.sprintId,
    };
  }

  let ops: SprintPlanPatchOp[];
  try {
    ops = parseOpsOrThrow(input.ops);
  } catch (error) {
    return {
      applied: [],
      error: error instanceof Error ? error.message : String(error),
      ok: false,
      sprintId: input.sprintId,
    };
  }

  const verified = verifySprintPlanPatchToken({
    applyToken: input.applyToken,
    ops,
    organizationId: input.organizationId,
    sprintId: input.sprintId,
  });
  if (!verified.ok) {
    return {
      applied: [],
      error: verified.error,
      ok: false,
      sprintId: input.sprintId,
    };
  }

  const { applied, error } = await applySprintPlanPatchOps({
    organizationId: input.organizationId,
    ops,
    sprintId: input.sprintId,
  });

  const resources = collectRealtimeResources(ops.slice(0, applied.filter((row) => row.ok).length));
  if (resources.length > 0) {
    notifySprintRealtime(
      new Request('http://localhost/api/mcp'),
      input.organizationId,
      input.sprintId,
      resources
    );
  }

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
