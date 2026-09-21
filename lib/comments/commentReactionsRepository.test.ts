import { describe, expect, it } from 'vitest';

import {
  groupCommentReactionSummaryRows,
  indexReactionUserDisplayNameRows,
} from './commentReactionsRepository';

describe('groupCommentReactionSummaryRows', () => {
  it('groups rows by comment and coerces count', () => {
    expect(
      groupCommentReactionSummaryRows([
        { comment_id: 'c1', count: '2', emoji: '👍', mine: true },
        { comment_id: 'c1', count: 1, emoji: '🔥', mine: false },
        { comment_id: 'c2', count: 1, emoji: '🚀', mine: true },
        { comment_id: 'c3', count: 0, emoji: '❌', mine: false },
      ])
    ).toEqual({
      c1: [
        { count: 2, emoji: '👍', mine: true, users: [] },
        { count: 1, emoji: '🔥', mine: false, users: [] },
      ],
      c2: [{ count: 1, emoji: '🚀', mine: true, users: [] }],
    });
  });

  it('keeps query order so chips stay historical, not by count', () => {
    expect(
      groupCommentReactionSummaryRows([
        { comment_id: 'c1', count: 1, emoji: '🔥', mine: false },
        { comment_id: 'c1', count: 4, emoji: '👍', mine: true },
      ]).c1
    ).toEqual([
      { count: 1, emoji: '🔥', mine: false, users: [] },
      { count: 4, emoji: '👍', mine: true, users: [] },
    ]);
  });

  it('parses a postgres text array of user ids', () => {
    expect(
      groupCommentReactionSummaryRows(
        [
          {
            comment_id: 'c1',
            count: 2,
            emoji: '👍',
            mine: true,
            user_ids: '{user-ada,user-me}',
          },
        ],
        { 'user-ada': 'Ada Lovelace', 'user-me': 'Иван Иванов' },
        'user-me'
      ).c1?.[0]?.users
    ).toEqual([
      { mine: false, name: 'Ada Lovelace' },
      { mine: true, name: 'Иван Иванов' },
    ]);
  });
});

describe('indexReactionUserDisplayNameRows', () => {
  it('indexes names by uuid and tracker id without using raw ids as labels', () => {
    expect(
      indexReactionUserDisplayNameRows([
        {
          author_name: 'Ada Lovelace',
          id: 'AAAAAAAA-1111-4111-8111-111111111111',
          tracker_id: '1000000000000001',
        },
        { author_name: '  ', id: 'empty', tracker_id: null },
      ])
    ).toEqual({
      '1000000000000001': 'Ada Lovelace',
      'AAAAAAAA-1111-4111-8111-111111111111': 'Ada Lovelace',
      'aaaaaaaa-1111-4111-8111-111111111111': 'Ada Lovelace',
    });
  });
});
