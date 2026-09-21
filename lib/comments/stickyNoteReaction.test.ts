import { describe, expect, it } from 'vitest';

import {
  commentReactionsByNoteId,
  formatStickyNoteReactionTooltip,
  hydrateStickyNoteReactionUsers,
  isStickyNoteReactionEmoji,
  mergeStickyNoteReactionsByNoteId,
  parseStickyNoteReactions,
  rememberStickyNoteReactionEmoji,
  retainStickyNoteReactionOverlay,
  STICKY_NOTE_QUICK_REACTION_EMOJIS,
  toggleStickyNoteReaction,
  type StickyNoteReaction,
} from './stickyNoteReaction';
import {
  resolveStickyNoteReactionPickerEmojis,
  searchStickyNoteReactionEmojis,
} from './stickyNoteReactionCatalog';

describe('stickyNoteReaction', () => {
  it('lists the Miro quick-reaction row', () => {
    expect(STICKY_NOTE_QUICK_REACTION_EMOJIS).toEqual(['➕', '👍', '❤️', '🔥', '✅', '🚀']);
  });

  it('accepts any compact emoji string', () => {
    expect(isStickyNoteReactionEmoji('👍')).toBe(true);
    expect(isStickyNoteReactionEmoji('🚀')).toBe(true);
    expect(isStickyNoteReactionEmoji('')).toBe(false);
    expect(isStickyNoteReactionEmoji(1)).toBe(false);
  });

  it('adds a new reaction as mine with count 1', () => {
    expect(toggleStickyNoteReaction([], '🎉')).toEqual([
      { count: 1, emoji: '🎉', mine: true, users: [{ mine: true, name: '' }] },
    ]);
  });

  it('appends a new emoji after existing chips instead of reordering by count', () => {
    const current: StickyNoteReaction[] = [
      { count: 1, emoji: '🔥', mine: false, users: [{ mine: false, name: 'Ada' }] },
      { count: 5, emoji: '👍', mine: true, users: [{ mine: true, name: 'Вы' }] },
    ];
    expect(toggleStickyNoteReaction(current, '🚀')).toEqual([
      { count: 1, emoji: '🔥', mine: false, users: [{ mine: false, name: 'Ada' }] },
      { count: 5, emoji: '👍', mine: true, users: [{ mine: true, name: 'Вы' }] },
      { count: 1, emoji: '🚀', mine: true, users: [{ mine: true, name: '' }] },
    ]);
  });

  it('ignores empty tokens', () => {
    const current: StickyNoteReaction[] = [
      { count: 1, emoji: '👍', mine: true, users: [{ mine: true, name: '' }] },
    ];
    expect(toggleStickyNoteReaction(current, '')).toBe(current);
  });

  it('removes a solo own reaction on the second click', () => {
    const withMine = toggleStickyNoteReaction([], '🔥');
    expect(toggleStickyNoteReaction(withMine, '🔥')).toEqual([]);
  });

  it('adds own vote on top of other people’s reaction', () => {
    const others: StickyNoteReaction[] = [
      {
        count: 2,
        emoji: '👀',
        mine: false,
        users: [
          { mine: false, name: 'Ada' },
          { mine: false, name: 'Bob' },
        ],
      },
    ];
    expect(toggleStickyNoteReaction(others, '👀')).toEqual([
      {
        count: 3,
        emoji: '👀',
        mine: true,
        users: [
          { mine: false, name: 'Ada' },
          { mine: false, name: 'Bob' },
          { mine: true, name: '' },
        ],
      },
    ]);
  });

  it('keeps others’ votes when removing own', () => {
    const shared: StickyNoteReaction[] = [
      {
        count: 3,
        emoji: '❤️',
        mine: true,
        users: [
          { mine: false, name: 'Ada' },
          { mine: true, name: 'Вы' },
          { mine: false, name: 'Bob' },
        ],
      },
    ];
    expect(toggleStickyNoteReaction(shared, '❤️')).toEqual([
      {
        count: 2,
        emoji: '❤️',
        mine: false,
        users: [
          { mine: false, name: 'Ada' },
          { mine: false, name: 'Bob' },
        ],
      },
    ]);
  });

  it('remembers recent emojis newest first without duplicates', () => {
    expect(rememberStickyNoteReactionEmoji(['👍', '🔥'], '🚀')).toEqual(['🚀', '👍', '🔥']);
    expect(rememberStickyNoteReactionEmoji(['👍', '🔥'], '👍')).toEqual(['👍', '🔥']);
  });

  it('parses reaction payloads and ignores junk', () => {
    expect(parseStickyNoteReactions(null)).toEqual([]);
    expect(
      parseStickyNoteReactions([
        { count: 2, emoji: '👍', mine: true },
        { count: 0, emoji: '🔥', mine: false },
        { emoji: '🚀' },
      ])
    ).toEqual([{ count: 2, emoji: '👍', mine: true, users: [] }]);
  });

  it('parses reaction users and drops invalid entries', () => {
    expect(
      parseStickyNoteReactions([
        {
          count: 2,
          emoji: '👍',
          mine: true,
          users: [{ mine: false, name: '  Ada  ' }, { mine: true }, { name: 'Bob', mine: true }],
        },
      ])
    ).toEqual([
      {
        count: 2,
        emoji: '👍',
        mine: true,
        users: [
          { mine: false, name: 'Ada' },
          { mine: true, name: 'Bob' },
        ],
      },
    ]);
  });

  it('formats tooltip names with You for own votes', () => {
    expect(
      formatStickyNoteReactionTooltip(
        {
          mine: true,
          users: [
            { mine: false, name: 'Ada' },
            { mine: true, name: 'Иван' },
            { mine: false, name: 'Bob' },
          ],
        },
        'Вы'
      )
    ).toBe('Ada, Вы, Bob');
    expect(formatStickyNoteReactionTooltip({ mine: true, users: [] }, 'Вы')).toBe('Вы');
    expect(formatStickyNoteReactionTooltip({ mine: false, users: [] }, 'Вы')).toBe('');
  });

  it('hydrates display names and marks the current user', () => {
    expect(
      hydrateStickyNoteReactionUsers(
        ['user-ada', 'user-me', 'user-unknown'],
        { 'user-ada': 'Ada Lovelace', 'user-me': ' Иван ' },
        'user-me'
      )
    ).toEqual([
      { mine: false, name: 'Ada Lovelace' },
      { mine: true, name: 'Иван' },
      { mine: false, name: '' },
    ]);
  });

  it('matches registry names case-insensitively instead of showing an id', () => {
    expect(
      hydrateStickyNoteReactionUsers(
        ['AAAAAAAA-1111-4111-8111-111111111111'],
        { 'aaaaaaaa-1111-4111-8111-111111111111': 'Ada Lovelace' },
        ''
      )
    ).toEqual([{ mine: false, name: 'Ada Lovelace' }]);
  });

  it('keeps an in-flight overlay on top of the remote snapshot', () => {
    const overlay = { 'comment:a': [{ count: 1, emoji: '🔥', mine: true, users: [] }] };
    const incoming = {
      'comment:a': [{ count: 3, emoji: '👍', mine: false, users: [] }],
      'comment:b': [{ count: 1, emoji: '🚀', mine: true, users: [] }],
    };
    expect(mergeStickyNoteReactionsByNoteId(overlay, incoming)).toEqual({
      'comment:a': [{ count: 1, emoji: '🔥', mine: true, users: [] }],
      'comment:b': [{ count: 1, emoji: '🚀', mine: true, users: [] }],
    });
  });

  it('drops overlay that is not in flight when comments reload', () => {
    const overlay = {
      'comment:a': [{ count: 1, emoji: '🔥', mine: true, users: [] }],
      'comment:b': [{ count: 2, emoji: '👍', mine: true, users: [] }],
    };
    expect(retainStickyNoteReactionOverlay(overlay, new Set(['comment:b']))).toEqual({
      'comment:b': [{ count: 2, emoji: '👍', mine: true, users: [] }],
    });
    expect(retainStickyNoteReactionOverlay(overlay, new Set())).toEqual({});
  });

  it('maps comment ids to swimlane note ids', () => {
    expect(
      commentReactionsByNoteId([{ id: 'c1', reactions: [{ count: 1, emoji: '✅', mine: false, users: [] }] }])
    ).toEqual({ 'comment:c1': [{ count: 1, emoji: '✅', mine: false, users: [] }] });
  });
});

describe('stickyNoteReactionCatalog', () => {
  it('returns the people grid by default category', () => {
    const people = resolveStickyNoteReactionPickerEmojis({
      category: 'people',
      query: '',
      recentEmojis: ['🚀'],
    });
    expect(people[0]).toBe('😀');
    expect(people).toContain('👍');
    expect(people).toContain('🤡');
    expect(people).toContain('💩');
  });

  it('returns recents when that category is selected', () => {
    expect(
      resolveStickyNoteReactionPickerEmojis({
        category: 'recent',
        query: '',
        recentEmojis: ['🚀', '✅'],
      })
    ).toEqual(['🚀', '✅']);
  });

  it('searches across categories by keyword', () => {
    expect(searchStickyNoteReactionEmojis('ракет')).toContain('🚀');
    expect(searchStickyNoteReactionEmojis('fire')).toContain('🔥');
    expect(searchStickyNoteReactionEmojis('plus')).toContain('➕');
    expect(searchStickyNoteReactionEmojis('клоун')).toContain('🤡');
    expect(searchStickyNoteReactionEmojis('какаш')).toContain('💩');
  });

  it('prefers search results over the selected category', () => {
    const found = resolveStickyNoteReactionPickerEmojis({
      category: 'people',
      query: 'rocket',
      recentEmojis: [],
    });
    expect(found).toEqual(['🚀']);
  });
});
