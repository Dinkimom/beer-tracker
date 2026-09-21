import { describe, expect, it } from 'vitest';

import {
  parseSprintPlanPatchOps,
  SPRINT_PLAN_PATCH_MAX_OPS,
} from './sprintPlanPatchSchema';

describe('parseSprintPlanPatchOps', () => {
  it('accepts a valid upsertPosition', () => {
    const ops = parseSprintPlanPatchOps([
      {
        assigneeId: 'staff:a',
        duration: 2,
        op: 'upsertPosition',
        startDay: 1,
        startPart: 0,
        taskId: 'T-1',
      },
    ]);
    expect(ops).toHaveLength(1);
    expect(ops[0]?.op).toBe('upsertPosition');
  });

  it('rejects empty ops', () => {
    expect(() => parseSprintPlanPatchOps([])).toThrow();
  });

  it('rejects more than max ops', () => {
    const ops = Array.from({ length: SPRINT_PLAN_PATCH_MAX_OPS + 1 }, (_, i) => ({
      op: 'deletePosition' as const,
      taskId: `T-${i}`,
    }));
    expect(() => parseSprintPlanPatchOps(ops)).toThrow();
  });

  it('rejects updateNote without fields', () => {
    expect(() =>
      parseSprintPlanPatchOps([
        {
          commentId: '8ffc8985-0001-472e-84bc-cfae58dc283f',
          op: 'updateNote',
        },
      ])
    ).toThrow(/updateNote/);
  });

  it('rejects unknown op', () => {
    expect(() => parseSprintPlanPatchOps([{ op: 'explodeEverything' }])).toThrow();
  });
});
