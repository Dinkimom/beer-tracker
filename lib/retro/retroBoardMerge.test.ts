import { describe, expect, it } from 'vitest';

import { mergeRetroBoards } from './retroBoardMerge';
import { type RetroBoard, type RetroCard, type RetroCardComment, type RetroColumn } from './retroBoardShared';

function column(id: string, title = ''): RetroColumn {
  return { id, preset: null, role: null, title };
}

function agreements(): RetroColumn {
  return { id: 'agreements', preset: 'agreements', role: 'agreements', title: '' };
}

function card(id: string, text: string, columnId = 'glad'): RetroCard {
  return {
    carriesToNext: false,
    color: null,
    columnId,
    createdAt: '2026-01-01T00:00:00.000Z',
    comments: [],
    id,
    imageDataUrl: null,
    kind: 'note',
    originSprintId: 1,
    reactions: [],
    text,
  };
}

function board(columns: RetroColumn[], cards: RetroCard[]): RetroBoard {
  return { sprintId: 1, columns, cards };
}

describe('mergeRetroBoards', () => {
  const base = board([agreements(), column('glad'), column('sad')], [card('a', 'Alpha'), card('b', 'Beta')]);

  it('keeps cards added on both sides', () => {
    const current = board(base.columns, [...base.cards, card('c', 'From server')]);
    const incoming = board(base.columns, [...base.cards, card('d', 'From me')]);
    const merged = mergeRetroBoards(base, current, incoming);
    expect(merged.cards.map((item) => item.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('keeps independent edits and prefers the incoming edit of the same card', () => {
    const current = board(base.columns, [card('a', 'Server'), card('b', 'Beta')]);
    const incoming = board(base.columns, [card('a', 'Alpha'), { ...card('b', 'Beta'), reactions: ['👍'] }]);
    const merged = mergeRetroBoards(base, current, incoming);
    expect(merged.cards.find((item) => item.id === 'a')?.text).toBe('Server');
    expect(merged.cards.find((item) => item.id === 'b')?.reactions).toEqual(['👍']);
  });

  it('keeps comments added on both sides of the same card', () => {
    const comment = (id: string, text: string): RetroCardComment => ({
      authorName: 'Ada',
      createdAt: `2026-01-02T00:00:0${id === 'c1' ? '1' : '2'}.000Z`,
      id,
      text,
    });
    const withComments = (comments: RetroCardComment[]) => ({ ...card('a', 'Alpha'), comments });
    const merged = mergeRetroBoards(
      board(base.columns, [withComments([]), card('b', 'Beta')]),
      board(base.columns, [withComments([comment('c1', 'Server')]), card('b', 'Beta')]),
      board(base.columns, [withComments([comment('c2', 'Mine')]), card('b', 'Beta')])
    );
    expect(merged.cards.find((item) => item.id === 'a')?.comments).toEqual([
      expect.objectContaining({ authorName: 'Ada', id: 'c1', text: 'Server' }),
      expect.objectContaining({ authorName: 'Ada', id: 'c2', text: 'Mine' }),
    ]);
  });

  it('drops a card either side deleted', () => {
    const current = board(base.columns, [card('b', 'Beta')]);
    const incoming = board(base.columns, [card('a', 'Alpha')]);
    expect(mergeRetroBoards(base, current, incoming).cards).toEqual([]);
  });

  it('appends a column added remotely when the local order did not change', () => {
    const current = board([...base.columns, column('meta', 'Meta')], base.cards);
    const incoming = board(base.columns, base.cards);
    expect(mergeRetroBoards(base, current, incoming).columns.map((item) => item.id)).toEqual([
      'agreements',
      'glad',
      'sad',
      'meta',
    ]);
  });
});
