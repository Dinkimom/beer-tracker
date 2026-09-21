import { describe, expect, it } from 'vitest';

import { computeEpicBurndownTiles } from './quarterlyEpicPoints';

describe('computeEpicBurndownTiles', () => {
  it('sums SP/TP and done percent over original child tasks', () => {
    const tiles = computeEpicBurndownTiles([
      {
        id: 'T-1',
        name: 'Done',
        link: '#',
        team: 'Back',
        storyPoints: 5,
        testPoints: 3,
        status: 'done',
        originalStatus: 'closed',
      },
      {
        id: 'T-2',
        name: 'Todo',
        link: '#',
        team: 'Back',
        storyPoints: 5,
        testPoints: 2,
        status: 'todo',
        originalStatus: 'open',
      },
    ]);

    expect(tiles.totalScopeSP).toBe(10);
    expect(tiles.completedSP).toBe(5);
    expect(tiles.completionPercentSP).toBe(50);
    expect(tiles.totalScopeTP).toBe(5);
    expect(tiles.completedTP).toBe(3);
    expect(tiles.completionPercentTP).toBe(60);
  });

  it('ignores phantom QA tasks', () => {
    const tiles = computeEpicBurndownTiles([
      {
        id: 'DEV-1',
        name: 'Dev',
        link: '#',
        team: 'Back',
        storyPoints: 3,
        testPoints: 2,
        status: 'done',
        originalStatus: 'closed',
      },
      {
        id: 'QA-1',
        name: 'QA',
        link: '#',
        team: 'QA',
        storyPoints: 0,
        testPoints: 2,
        status: 'done',
        originalStatus: 'closed',
      },
    ]);

    expect(tiles.totalScopeSP).toBe(3);
    expect(tiles.totalScopeTP).toBe(2);
  });
});
