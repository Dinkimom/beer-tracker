import { describe, expect, it } from 'vitest';

import { parseTicTacToeWidget } from '@/lib/widgets/ticTacToe';

import { buildTicTacToeComment } from './buildTicTacToeComment';

describe('buildTicTacToeComment', () => {
  it('places a widget card with a fresh board', () => {
    const comment = buildTicTacToeComment({
      assigneeId: 'dev-1',
      day: 1,
      part: 0,
      timelineTotalParts: 20,
    });
    expect(comment.kind).toBe('widget');
    expect(comment.assigneeId).toBe('dev-1');
    expect(comment.width).toBe(2);
    expect(comment.height).toBe(2);
    expect(comment.skipMentionNotifications).toBe(true);
    expect(parseTicTacToeWidget(comment.text)?.turn).toBe('x');
  });
});
