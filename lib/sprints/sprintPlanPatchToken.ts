import type { SprintPlanPatchOp } from '@/lib/sprints/sprintPlanPatchTypes';

import { createHash, createHmac, timingSafeEqual } from 'crypto';

import { requireSprintContextMcpSecret } from '@/lib/env';

const TOKEN_VERSION = 'pp1';
export const SPRINT_PLAN_PATCH_TTL_SEC = 30 * 60;

interface PlanPatchTokenPayload {
  exp: number;
  opsHash: string;
  orgId: string;
  sprintId: number;
  v: 1;
}

export function hashSprintPlanPatchOps(ops: SprintPlanPatchOp[]): string {
  return createHash('sha256').update(JSON.stringify(ops)).digest('hex');
}

export function proposalIdFromOpsHash(opsHash: string): string {
  return opsHash.slice(0, 12);
}

function signPayload(payloadB64: string, secret: string): string {
  return createHmac('sha256', secret)
    .update(`${TOKEN_VERSION}.${payloadB64}`)
    .digest('base64url');
}

export function signSprintPlanPatchToken(input: {
  ops: SprintPlanPatchOp[];
  organizationId: string;
  sprintId: number;
  nowSec?: number;
  ttlSec?: number;
}): string {
  const now = input.nowSec ?? Math.floor(Date.now() / 1000);
  const ttl = input.ttlSec ?? SPRINT_PLAN_PATCH_TTL_SEC;
  const payload: PlanPatchTokenPayload = {
    exp: now + ttl,
    opsHash: hashSprintPlanPatchOps(input.ops),
    orgId: input.organizationId,
    sprintId: input.sprintId,
    v: 1,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const secret = requireSprintContextMcpSecret();
  const sig = signPayload(payloadB64, secret);
  return `${TOKEN_VERSION}.${payloadB64}.${sig}`;
}

export function verifySprintPlanPatchToken(input: {
  applyToken: string;
  ops: SprintPlanPatchOp[];
  organizationId: string;
  sprintId: number;
  nowSec?: number;
}): { ok: false; error: string } | { ok: true; exp: number } {
  const parts = input.applyToken.split('.');
  if (parts.length !== 3 || parts[0] !== TOKEN_VERSION) {
    return { ok: false, error: 'invalid_apply_token: malformed' };
  }
  const payloadB64 = parts[1]!;
  const sig = parts[2]!;
  let secret: string;
  try {
    secret = requireSprintContextMcpSecret();
  } catch {
    return { ok: false, error: 'invalid_apply_token: secret not configured' };
  }
  const expected = signPayload(payloadB64, secret);
  try {
    const sigBuf = Buffer.from(sig, 'base64url');
    const expBuf = Buffer.from(expected, 'base64url');
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      return { ok: false, error: 'invalid_apply_token: bad signature' };
    }
  } catch {
    return { ok: false, error: 'invalid_apply_token: bad signature' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch {
    return { ok: false, error: 'invalid_apply_token: bad payload' };
  }
  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, error: 'invalid_apply_token: bad payload' };
  }
  const payload = parsed as Partial<PlanPatchTokenPayload>;
  if (
    payload.v !== 1 ||
    typeof payload.exp !== 'number' ||
    typeof payload.opsHash !== 'string' ||
    typeof payload.orgId !== 'string' ||
    typeof payload.sprintId !== 'number'
  ) {
    return { ok: false, error: 'invalid_apply_token: bad payload' };
  }
  const now = input.nowSec ?? Math.floor(Date.now() / 1000);
  if (payload.exp < now) {
    return { ok: false, error: 'invalid_apply_token: expired' };
  }
  if (payload.sprintId !== input.sprintId || payload.orgId !== input.organizationId) {
    return { ok: false, error: 'invalid_apply_token: sprint/org mismatch' };
  }
  const opsHash = hashSprintPlanPatchOps(input.ops);
  if (payload.opsHash !== opsHash) {
    return { ok: false, error: 'invalid_apply_token: ops hash mismatch' };
  }
  return { ok: true, exp: payload.exp };
}
