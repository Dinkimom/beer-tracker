import type { QuarterlyPlanContent } from './quarterlyPlanTypes';

import { describe, expect, it } from 'vitest';

import { diffQuarterlyPlanDraft, withRemovedFromDraft } from './quarterlyPlanDraftDiff';

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
    expect([...diff.removed]).toEqual(['a2']);
  });

  it('привязка к задаче трекера — «прилинковано»; с переименованием — обычное изменение', () => {
    const linked = diffQuarterlyPlanDraft(before, {
      ...before,
      directions: [{ ...before.directions[0]!, issueKey: 'CHK-1' }],
      epics: [{ ...before.epics[0]!, issueKey: 'CHK-2', title: 'Payments' }],
    });
    expect([...linked.changed]).toEqual(['d1', 'e1']);
    expect([...linked.linked]).toEqual(['d1']);

    const wasLinked = { ...before, epics: [{ ...before.epics[0]!, issueKey: 'CHK-2' }] };
    expect([...diffQuarterlyPlanDraft(wasLinked, before).linked]).toEqual([]);
  });

  it('убранное остаётся на доске на своём месте, новое — после прежнего (QM10)', () => {
    const after: QuarterlyPlanContent = {
      ...before,
      assignments: [
        { epicId: 'e1', id: 'a3', memberId: 'bob', startWeek: 4, weeks: 1 },
        { epicId: 'e1', id: 'a2', memberId: 'bob', startWeek: 3, weeks: 1 },
      ],
    };
    expect(withRemovedFromDraft(before, after).assignments.map(({ id, startWeek }) => [id, startWeek])).toEqual([
      ['a1', 0],
      ['a2', 3],
      ['a3', 4],
    ]);
  });

  it('черновик без изменений — пусто', () => {
    const diff = diffQuarterlyPlanDraft(before, before);
    expect(diff.added.size + diff.changed.size + diff.removed.size).toBe(0);
  });
});
