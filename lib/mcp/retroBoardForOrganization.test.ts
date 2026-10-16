import { describe, expect, it } from 'vitest';

import { resolveRetroBoard, retroStoreFromBoards } from '@/lib/retro/retroBoard';

import { applyRetroBoardOpsLocally } from './retroBoardForOrganization';
import { parseRetroBoardOps } from './retroBoardOps';

describe('applyRetroBoardOpsLocally', () => {
  it('adds a note by columnPreset and a comment', () => {
    const board = resolveRetroBoard(retroStoreFromBoards([]), 7);
    const ops = parseRetroBoardOps([
      { columnPreset: 'glad', op: 'addNote', text: 'Prep facilitation notes' },
    ]);
    const first = applyRetroBoardOpsLocally({
      authorName: 'Agent',
      board,
      ops,
    });
    expect(first.applied.every((row) => row.ok)).toBe(true);
    expect(first.board.cards).toHaveLength(1);
    const cardId = first.board.cards[0]!.id;

    const withComment = applyRetroBoardOpsLocally({
      authorName: 'Agent',
      board: first.board,
      ops: parseRetroBoardOps([{ cardId, op: 'addComment', text: 'Bring metrics' }]),
    });
    expect(withComment.board.cards[0]?.comments).toEqual([
      expect.objectContaining({ authorName: 'Agent', text: 'Bring metrics' }),
    ]);
  });

  it('moves a card to another column by preset', () => {
    const board = resolveRetroBoard(retroStoreFromBoards([]), 7);
    const created = applyRetroBoardOpsLocally({
      authorName: 'Agent',
      board,
      ops: parseRetroBoardOps([
        { columnPreset: 'glad', op: 'addNote', text: 'Move me' },
      ]),
    });
    const cardId = created.board.cards[0]!.id;
    const sad = created.board.columns.find((column) => column.preset === 'sad');
    expect(sad).toBeTruthy();

    const moved = applyRetroBoardOpsLocally({
      authorName: 'Agent',
      board: created.board,
      ops: parseRetroBoardOps([{ cardId, columnPreset: 'sad', op: 'moveCard' }]),
    });
    expect(moved.board.cards[0]?.columnId).toBe(sad?.id);
  });
});
