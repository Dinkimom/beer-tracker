import type { SprintPlanPatchOp } from './sprintPlanPatchTypes';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  signSprintPlanPatchToken,
  verifySprintPlanPatchToken,
} from './sprintPlanPatchToken';

const OPS: SprintPlanPatchOp[] = [
  {
    assigneeId: 'staff:a',
    duration: 1,
    op: 'upsertPosition',
    startDay: 0,
    startPart: 0,
    taskId: 'T-1',
  },
];

describe('sprintPlanPatchToken', () => {
  const prev = process.env.SPRINT_CONTEXT_MCP_SECRET;

  beforeEach(() => {
    process.env.SPRINT_CONTEXT_MCP_SECRET = 'test-secret-for-plan-patch-hmac';
  });

  afterEach(() => {
    if (prev === undefined) {
      delete process.env.SPRINT_CONTEXT_MCP_SECRET;
    } else {
      process.env.SPRINT_CONTEXT_MCP_SECRET = prev;
    }
  });

  it('round-trips a valid token', () => {
    const token = signSprintPlanPatchToken({
      ops: OPS,
      organizationId: 'org-1',
      sprintId: 1152,
      nowSec: 1_700_000_000,
    });
    expect(
      verifySprintPlanPatchToken({
        applyToken: token,
        ops: OPS,
        organizationId: 'org-1',
        sprintId: 1152,
        nowSec: 1_700_000_000,
      })
    ).toEqual({ ok: true, exp: 1_700_000_000 + 30 * 60 });
  });

  it('rejects expired tokens', () => {
    const token = signSprintPlanPatchToken({
      ops: OPS,
      organizationId: 'org-1',
      sprintId: 1152,
      nowSec: 1_700_000_000,
      ttlSec: 10,
    });
    expect(
      verifySprintPlanPatchToken({
        applyToken: token,
        ops: OPS,
        organizationId: 'org-1',
        sprintId: 1152,
        nowSec: 1_700_000_020,
      })
    ).toMatchObject({ ok: false, error: expect.stringContaining('expired') });
  });

  it('rejects tampered ops', () => {
    const token = signSprintPlanPatchToken({
      ops: OPS,
      organizationId: 'org-1',
      sprintId: 1152,
    });
    const tampered: SprintPlanPatchOp[] = [
      {
        assigneeId: 'staff:a',
        duration: 9,
        op: 'upsertPosition',
        startDay: 0,
        startPart: 0,
        taskId: 'T-1',
      },
    ];
    expect(
      verifySprintPlanPatchToken({
        applyToken: token,
        ops: tampered,
        organizationId: 'org-1',
        sprintId: 1152,
      })
    ).toMatchObject({ ok: false, error: expect.stringContaining('ops hash') });
  });

  it('rejects bad signature', () => {
    const token = signSprintPlanPatchToken({
      ops: OPS,
      organizationId: 'org-1',
      sprintId: 1152,
    });
    const parts = token.split('.');
    parts[2] = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    expect(
      verifySprintPlanPatchToken({
        applyToken: parts.join('.'),
        ops: OPS,
        organizationId: 'org-1',
        sprintId: 1152,
      })
    ).toMatchObject({ ok: false, error: expect.stringContaining('signature') });
  });
});
