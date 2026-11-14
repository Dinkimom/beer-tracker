import type { QuarterlyPlanContent } from './quarterlyPlanTypes';

import { describe, expect, it } from 'vitest';

import { diffQuarterlyPlanDraft } from './quarterlyPlanDraftDiff';

const before: QuarterlyPlanContent = {
  assignments: [
    { epicId: 'e1', id: 'a1', memberId: 'ann', startWeek: 0, weeks: 2 },
    { epicId: 'e1', id: 'a2', memberId: 'bob', startWeek: 2, weeks: 1 },
  ],
  directions: [{ id: 'd1', teamId: 't1', title: 'Checkout' }],
  epics: [{ directionId: 'd1', id: 'e1', status: 'backlog', title: 'Payment' }],
  links: [],
  notes: [],
};

describe('diffQuarterlyPlanDraft', () => {
  it('различает добавленное, изменённое и убранное по видам сущностей (QM9)', () => {
    const after: QuarterlyPlanContent = {
      ...before,
      assignments: [
        { epicId: 'e1', id: 'a1', memberId: 'ann', startWeek: 1, weeks: 2 },
        { epicId: 'e2', id: 'a3', memberId: 'bob', startWeek: 4, weeks: 1 },
      ],
      epics: [...before.epics, { directionId: 'd1', id: 'e2', status: 'backlog', title: 'Receipts' }],
    };
    const diff = diffQuarterlyPlanDraft(before, after);
    expect([...diff.added]).toEqual(['e2', 'a3']);
    expect([...diff.changed]).toEqual(['a1']);
    expect(diff.counts.assignments).toEqual({ added: 1, changed: 1, removed: 1 });
    expect(diff.counts.epics).toEqual({ added: 1, changed: 0, removed: 0 });
    expect(diff.counts.directions).toEqual({ added: 0, changed: 0, removed: 0 });
  });

  it('черновик без изменений — пусто', () => {
    const diff = diffQuarterlyPlanDraft(before, before);
    expect(diff.added.size + diff.changed.size).toBe(0);
  });
});
