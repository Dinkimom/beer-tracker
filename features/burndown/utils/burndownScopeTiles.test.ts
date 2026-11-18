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
  it('counts TP of a dev task once, ignoring its QA phantom', () => {
    const dev = task({ id: 'dev1', name: 'd', storyPoints: 3, testPoints: 4, statusTypeKey: 'done' });
    const tiles = computeBurndownScopeTiles([dev, qaFor(dev, { testPoints: 4, statusTypeKey: 'done' })], '', [], null);
    expect(tiles.totalScopeSP).toBe(3);
    expect(tiles.totalScopeTP).toBe(4);
    expect(tiles.completedTP).toBe(4);
    expect(tiles.completionPercentTP).toBe(100);
  });

  it('does not count QA-team tasks, as the sidebar, the retro score and the burndown line (R3)', () => {
    const dev = task({ id: 'dev1', name: 'd', storyPoints: 2, testPoints: 1 });
    const standaloneQa = task({ id: 'qa1', name: 'q', team: 'QA', testPoints: 5 });
    const tiles = computeBurndownScopeTiles([dev, standaloneQa], '', [], null);
    expect(tiles.totalScopeTP).toBe(1);
  });

  it('does not count sprint goals', () => {
    const dev = task({ id: 'dev1', name: 'd', storyPoints: 2 });
    const goal = task({ id: 'goal1', name: 'g', storyPoints: 8 });
    expect(computeBurndownScopeTiles([dev, goal], '', ['goal1'], null).totalScopeSP).toBe(2);
  });

  it('applies the name filter to tasks', () => {
    const a = task({ id: 'BT-1', name: 'Login', storyPoints: 3 });
    const b = task({ id: 'BT-2', name: 'Payments', storyPoints: 5 });
    expect(computeBurndownScopeTiles([a, b], 'pay', [], null).totalScopeSP).toBe(5);
    expect(computeBurndownScopeTiles([a, b], 'bt-1', [], null).totalScopeSP).toBe(3);
  });
});
