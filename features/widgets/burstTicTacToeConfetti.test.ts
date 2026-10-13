import { describe, expect, it } from 'vitest';

import { shouldBurstTicTacToeConfetti } from './burstTicTacToeConfetti';

describe('shouldBurstTicTacToeConfetti', () => {
  it('fires only when a game just became a win', () => {
    expect(shouldBurstTicTacToeConfetti(null, 'x')).toBe(true);
    expect(shouldBurstTicTacToeConfetti(null, 'o')).toBe(true);
    expect(shouldBurstTicTacToeConfetti(null, 'draw')).toBe(false);
    expect(shouldBurstTicTacToeConfetti(null, null)).toBe(false);
    expect(shouldBurstTicTacToeConfetti('x', 'x')).toBe(false);
    expect(shouldBurstTicTacToeConfetti('x', null)).toBe(false);
  });
});
