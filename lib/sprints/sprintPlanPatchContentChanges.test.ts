import { describe, expect, it } from 'vitest';

import { buildSprintPlanPatchContentChanges } from './sprintPlanPatchContentChanges';

const noteId = '11111111-1111-4111-8111-111111111111';
const goalId = '22222222-2222-4222-8222-222222222222';

describe('buildSprintPlanPatchContentChanges', () => {
  it('returns before and after text for notes and goals', () => {
    expect(
      buildSprintPlanPatchContentChanges({
        goals: [{ goalType: 'delivery', id: goalId, text: 'Old goal' }],
        notes: [{ id: noteId, text: 'Old note' }],
        ops: [
          {
            assigneeId: 'staff:a',
            day: 1,
            op: 'createNote',
            part: 0,
            text: 'New note',
          },
          { commentId: noteId, op: 'updateNote', text: 'Edited note' },
          { goalType: 'discovery', op: 'createGoal', text: 'New discovery' },
          { id: goalId, op: 'updateGoal', text: 'Edited goal' },
          { id: goalId, op: 'deleteGoal' },
        ],
      })
    ).toEqual([
      { afterText: 'New note', beforeText: null, kind: 'create', op: 'createNote' },
      {
        afterText: 'Edited note',
        beforeText: 'Old note',
        id: noteId,
        kind: 'update',
        op: 'updateNote',
      },
      {
        afterText: 'New discovery',
        beforeText: null,
        goalType: 'discovery',
        kind: 'create',
        op: 'createGoal',
      },
      {
        afterText: 'Edited goal',
        beforeText: 'Old goal',
        goalType: 'delivery',
        id: goalId,
        kind: 'update',
        op: 'updateGoal',
      },
      {
        afterText: null,
        beforeText: 'Old goal',
        goalType: 'delivery',
        id: goalId,
        kind: 'delete',
        op: 'deleteGoal',
      },
    ]);
  });
});
