import type { Task } from '@/types';

import { describe, expect, it } from 'vitest';

import { summarizeBacklogPoints } from './backlogPointsBreakdown';

function task(partial: Partial<Task> & Pick<Task, 'id'>): Task {
  return partial as Task;
}

describe('summarizeBacklogPoints', () => {
  it('splits story and test points into to do, in progress and done', () => {
    const summary = summarizeBacklogPoints([
      task({ id: '1', status: 'todo', storyPoints: 1, testPoints: 2 }),
      task({ id: '2', status: 'in-progress', storyPoints: 5, testPoints: 0 }),
      task({ id: '3', status: 'done', storyPoints: 3.5, testPoints: 1 }),
      task({ id: '4', status: 'paused', storyPoints: 0.5, testPoints: 0.5 }),
    ]);

    expect(summary.sp).toEqual({ done: 3.5, progress: 5.5, todo: 1 });
    expect(summary.tp).toEqual({ done: 1, progress: 0.5, todo: 2 });
  });

  it('reads the tracker status when the app status is missing', () => {
    const summary = summarizeBacklogPoints([
      task({ id: '1', originalStatus: 'готово', storyPoints: 2, testPoints: 0 }),
    ]);

    expect(summary.sp.done).toBe(2);
  });

  it('skips QA phantoms so test points are not counted twice', () => {
    const summary = summarizeBacklogPoints([
      task({ id: '1', status: 'todo', storyPoints: 3, team: 'QA', testPoints: 8 }),
    ]);

    expect(summary.sp).toEqual({ done: 0, progress: 0, todo: 0 });
    expect(summary.tp).toEqual({ done: 0, progress: 0, todo: 0 });
  });
});
