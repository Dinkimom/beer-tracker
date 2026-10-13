import { describe, expect, it } from 'vitest';

import { resolveTicTacToeCardSize } from './ticTacToeCardSize';

describe('resolveTicTacToeCardSize', () => {
  it('uses two cells until the sprint edge', () => {
    expect(resolveTicTacToeCardSize(1, 0, 20)).toEqual({ height: 2, width: 2 });
    expect(resolveTicTacToeCardSize(6, 2, 20)).toEqual({ height: 2, width: 1 });
  });
});
