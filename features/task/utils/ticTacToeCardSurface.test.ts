import { describe, expect, it } from 'vitest';

import { getTicTacToeCardPaint, getTicTacToeCardStyle } from './ticTacToeCardSurface';

describe('getTicTacToeCardStyle', () => {
  it('keeps the board flat so it does not paint over the task above', () => {
    const style = getTicTacToeCardStyle(true);
    expect(style.boxShadow).toBe('none');
    expect(style.borderRadius).toBe(0);
    expect(style.backgroundColor).toBe(getTicTacToeCardPaint(true).surface);
    expect(getTicTacToeCardPaint(false).surface).not.toBe(getTicTacToeCardPaint(true).surface);
  });
});
