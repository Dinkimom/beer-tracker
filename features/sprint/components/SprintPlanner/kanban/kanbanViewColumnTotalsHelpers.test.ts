import type { Task } from '@/types';

import { describe, expect, it } from 'vitest';

import { computeKanbanColumnTaskTotals } from './kanbanViewColumnTotalsHelpers';

function task(partial: Partial<Task> & Pick<Task, 'id'>): Task {
  return { link: '', name: partial.id, team: 'Web', ...partial };
}

describe('computeKanbanColumnTaskTotals', () => {
  it('uses pointsUtils rules: phantom SP is 0 and phantom TP is not doubled', () => {
    expect(
      computeKanbanColumnTaskTotals([
        task({ id: 'DEV-1', storyPoints: 5, testPoints: 3 }),
        task({ id: 'qa-1', originalTaskId: 'DEV-1', storyPoints: 5, team: 'QA', testPoints: 3 }),
      ])
    ).toEqual({ totalSp: 5, totalTp: 3 });
  });

  it('counts standalone QA estimates in SP', () => {
    expect(
      computeKanbanColumnTaskTotals([
        task({ hideTestPointsByIntegration: true, id: 'QA-1', storyPoints: 2, team: 'QA' }),
      ])
    ).toEqual({ totalSp: 2, totalTp: 0 });
  });
});
