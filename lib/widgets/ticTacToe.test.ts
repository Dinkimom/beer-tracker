import { describe, expect, it } from 'vitest';

import {
  applyTicTacToeMove,
  createTicTacToeState,
  parseTicTacToeWidget,
  serializeTicTacToeWidget,
  ticTacToeWinningLine,
} from './ticTacToe';

describe('tic-tac-toe', () => {
  it('starts with an empty board and X to move', () => {
    const state = createTicTacToeState();
    expect(state.board).toEqual([null, null, null, null, null, null, null, null, null]);
    expect(state.turn).toBe('x');
    expect(state.winner).toBeNull();
  });

  it('round-trips through the widget payload', () => {
    const started = applyTicTacToeMove(createTicTacToeState(), 4);
    const parsed = parseTicTacToeWidget(serializeTicTacToeWidget(started));
    expect(parsed).toEqual(started);
  });

  it('ignores a move on a filled cell or after the game ends', () => {
    const played = applyTicTacToeMove(createTicTacToeState(), 0);
    expect(applyTicTacToeMove(played, 0)).toBe(played);
    const won = [0, 3, 1, 4, 2].reduce(applyTicTacToeMove, createTicTacToeState());
    expect(won.winner).toBe('x');
    expect(ticTacToeWinningLine(won)).toEqual([0, 1, 2]);
    expect(applyTicTacToeMove(won, 8)).toBe(won);
  });

  it('ends in a draw when the board fills without three in a row', () => {
    const drawn = [0, 1, 2, 4, 3, 5, 7, 6, 8].reduce(applyTicTacToeMove, createTicTacToeState());
    expect(drawn.winner).toBe('draw');
    expect(parseTicTacToeWidget('not-json')).toBeNull();
    expect(parseTicTacToeWidget('{"v":1,"integration":"other"}')).toBeNull();
  });
});
