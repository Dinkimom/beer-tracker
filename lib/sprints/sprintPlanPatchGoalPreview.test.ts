import { describe, expect, it } from 'vitest';

import { buildPlanPatchGoalPreviews, planPatchGoalSources } from './sprintPlanPatchGoalPreview';

const delivery = { done: false, goalType: 'delivery' as const, id: 'goal-d', text: 'Ship' };
const discovery = { done: true, goalType: 'discovery' as const, id: 'goal-s', text: 'Learn' };

describe('buildPlanPatchGoalPreviews', () => {
  it('turns a new goal into an add preview with a generated id', () => {
    const previews = buildPlanPatchGoalPreviews({
      clientBrand: 'cursor',
      createId: () => 'goal-new',
      current: [],
      ops: [{ goalType: 'delivery', op: 'createGoal', text: '  Review demo  ' }],
    });
    expect(previews).toEqual([
      {
        action: 'create',
        clientBrand: 'cursor',
        done: false,
        goalId: 'goal-new',
        goalType: 'delivery',
        text: 'Review demo',
      },
    ]);
  });

  it('stores the proposed text on an existing goal and skips an identical update', () => {
    const current = planPatchGoalSources([delivery], [discovery]);
    const changed = buildPlanPatchGoalPreviews({
      createId: () => 'unused',
      current,
      ops: [{ id: 'goal-d', op: 'updateGoal', text: 'Ship report' }],
    });
    expect(changed).toEqual([
      {
        action: 'update',
        done: false,
        goalId: 'goal-d',
        goalType: 'delivery',
        text: 'Ship report',
      },
    ]);
    expect(
      buildPlanPatchGoalPreviews({
        createId: () => 'unused',
        current,
        ops: [{ id: 'goal-d', op: 'updateGoal', text: 'Ship' }],
      })
    ).toEqual([]);
  });

  it('keeps a delete on the current goal and lets the last op win', () => {
    const current = planPatchGoalSources([delivery], [discovery]);
    expect(
      buildPlanPatchGoalPreviews({
        createId: () => 'unused',
        current,
        ops: [
          { id: 'goal-s', op: 'updateGoal', text: 'Learn more' },
          { id: 'goal-s', op: 'deleteGoal' },
        ],
      })
    ).toEqual([
      {
        action: 'delete',
        done: true,
        goalId: 'goal-s',
        goalType: 'discovery',
        text: 'Learn',
      },
    ]);
  });

  it('skips a delete when the goal is not on the sprint', () => {
    expect(
      buildPlanPatchGoalPreviews({
        createId: () => 'unused',
        current: [],
        ops: [{ id: 'missing', op: 'deleteGoal' }],
      })
    ).toEqual([]);
  });
});
