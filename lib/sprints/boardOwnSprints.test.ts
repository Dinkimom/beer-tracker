import { describe, expect, it } from 'vitest';

import { boardOwnSprints } from './boardOwnSprints';

describe('boardOwnSprints', () => {
  it('отсекает спринты соседней доски с тем же именем', () => {
    const sprints = [
      { board: { id: '7' }, id: 1, name: 'Sprint 42' },
      { board: { id: '9' }, id: 2, name: 'Sprint 42' },
    ];
    expect(boardOwnSprints(sprints, 7).map((s) => s.id)).toEqual([1]);
  });

  it('оставляет спринты без доски', () => {
    const sprints = [{ board: { id: '' }, id: 1 }, { id: 2 }, { board: null, id: 3 }];
    expect(boardOwnSprints(sprints, 7).map((s) => s.id)).toEqual([1, 2, 3]);
  });
});
