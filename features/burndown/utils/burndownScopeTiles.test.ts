import type { Task } from '@/types';

import { describe, expect, it } from 'vitest';

import { computeBurndownScopeTiles } from './burndownScopeTiles';

function task(partial: Partial<Task> & { id: string; name: string }): Task {
  return {
    link: '',
    team: 'Web',
    ...partial,
  };
}

function qaFor(dev: Task, partial: Partial<Task> = {}): Task {
  return task({ id: `${dev.id}-qa`, name: dev.name, originalTaskId: dev.id, team: 'QA', ...partial });
}

describe('computeBurndownScopeTiles', () => {
  it('takes the larger TP of dev and QA instead of summing them', () => {
    const dev = task({ id: 'dev1', name: 'd', storyPoints: 3, testPoints: 1, status: 'done' });
    const tiles = computeBurndownScopeTiles([dev, qaFor(dev, { testPoints: 8, status: 'done' })], '');
    expect(tiles.totalScopeSP).toBe(3);
    expect(tiles.totalScopeTP).toBe(8);
    expect(tiles.completedSP).toBe(3);
    expect(tiles.completedTP).toBe(8);
    expect(tiles.completionPercentSP).toBe(100);
    expect(tiles.completionPercentTP).toBe(100);
  });

  it('marks TP done when either dev or QA is done', () => {
    const dev = task({ id: 'dev1', name: 'd', storyPoints: 2, testPoints: 4, status: 'todo' });
    const tiles = computeBurndownScopeTiles([dev, qaFor(dev, { testPoints: 4, status: 'done' })], '');
    expect(tiles.completedSP).toBe(0);
    expect(tiles.completedTP).toBe(4);
    expect(tiles.completionPercentTP).toBe(100);
  });

  it('counts tasks without QA by their own TP', () => {
    const dev = task({ id: 'dev1', name: 'd', storyPoints: 4, testPoints: 2, status: 'done' });
    const tiles = computeBurndownScopeTiles([dev], '');
    expect(tiles.totalScopeSP).toBe(4);
    expect(tiles.totalScopeTP).toBe(2);
    expect(tiles.completedTP).toBe(2);
  });

  it('counts QA without its dev task in the selection as its own row', () => {
    const qa = task({
      id: 'qa1',
      name: 'q',
      originalTaskId: 'dev-missing',
      team: 'QA',
      testPoints: 2,
      status: 'done',
    });
    const tiles = computeBurndownScopeTiles([qa], '');
    expect(tiles.totalScopeTP).toBe(2);
    expect(tiles.completedTP).toBe(2);
  });

  it('applies the name filter to tasks', () => {
    const a = task({ id: 'BT-1', name: 'Login', storyPoints: 3 });
    const b = task({ id: 'BT-2', name: 'Payments', storyPoints: 5 });
    expect(computeBurndownScopeTiles([a, b], 'pay').totalScopeSP).toBe(5);
    expect(computeBurndownScopeTiles([a, b], 'bt-1').totalScopeSP).toBe(3);
  });
});
