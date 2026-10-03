import { describe, expect, it } from 'vitest';

import {
  addRetroCardComment,
  addRetroColumn,
  addRetroImageCard,
  addRetroNote,
  cardsForRetroColumn,
  convertRetroNote,
  deleteRetroCard,
  deleteRetroCardComment,
  deleteRetroColumn,
  emptyRetroStore,
  isAcceptableRetroImageDataUrl,
  moveRetroCard,
  moveRetroColumn,
  parseRetroStore,
  renameRetroColumn,
  resolveAdjacentSprintIds,
  changedRetroBoards,
  resolveRetroBoard,
  retroStoreFromBoards,
  RETRO_COMMENT_MAX_LENGTH,
  RETRO_IMAGE_MAX_DATA_URL_CHARS,
} from './retroBoard';

const SPRINTS = [
  { id: 1, startDate: '2026-01-01' },
  { id: 2, startDate: '2026-01-15' },
  { id: 3, startDate: '2026-02-01' },
];

function agreementsColumn() {
  const board = resolveRetroBoard(emptyRetroStore(), 1);
  const column = board.columns.find((item) => item.role === 'agreements');
  if (!column) throw new Error('agreements column missing');
  return column;
}

describe('resolveAdjacentSprintIds', () => {
  it('orders sprints by start date', () => {
    expect(resolveAdjacentSprintIds([SPRINTS[2], SPRINTS[0], SPRINTS[1]], 2)).toEqual({
      nextSprintId: 3,
      previousSprintId: 1,
    });
  });

  it('returns nulls at the ends and for an unknown sprint', () => {
    expect(resolveAdjacentSprintIds(SPRINTS, 1).previousSprintId).toBeNull();
    expect(resolveAdjacentSprintIds(SPRINTS, 3).nextSprintId).toBeNull();
    expect(resolveAdjacentSprintIds(SPRINTS, 9)).toEqual({
      nextSprintId: null,
      previousSprintId: null,
    });
  });
});

describe('retro board mutations', () => {
  it('starts from the retro lists, with previous agreements first', () => {
    const board = resolveRetroBoard(emptyRetroStore(), 1);
    expect(board.columns.map((column) => column.preset)).toEqual([
      'agreements',
      'glad',
      'sad',
      'discuss',
      'meta',
    ]);
  });

  it('appends a list on this sprint and starts the next empty sprint from the default columns', () => {
    const store = addRetroColumn(emptyRetroStore(), 1, 'Kudos');
    const current = resolveRetroBoard(store, 1);
    expect(current.columns.map((column) => column.title || column.preset)).toEqual([
      'agreements',
      'glad',
      'sad',
      'discuss',
      'meta',
      'Kudos',
    ]);
    const next = resolveRetroBoard(store, 2);
    expect(next.cards).toEqual([]);
    expect(next.columns.map((column) => column.preset)).toEqual([
      'agreements',
      'glad',
      'sad',
      'discuss',
      'meta',
    ]);
  });

  it('renames and reorders columns, and refuses to delete agreements', () => {
    let store = addRetroColumn(emptyRetroStore(), 1, 'Kudos');
    const kudos = resolveRetroBoard(store, 1).columns.find((column) => column.title === 'Kudos');
    expect(kudos).toBeTruthy();
    if (!kudos) return;
    store = renameRetroColumn(store, 1, kudos.id, 'Thanks');
    store = moveRetroColumn(store, 1, kudos.id, -1);
    store = deleteRetroColumn(store, 1, 'agreements');
    const titles = resolveRetroBoard(store, 1).columns.map((column) => column.title || column.role);
    expect(titles).toEqual(['agreements', null, null, null, 'Thanks', null]);
    store = deleteRetroColumn(store, 1, kudos.id);
    expect(resolveRetroBoard(store, 1).columns.some((column) => column.id === kudos.id)).toBe(
      false
    );
  });

  it('converts a note into an agreement on this sprint and the next one only', () => {
    let store = addRetroNote(emptyRetroStore(), 1, 'glad', 'Ship smaller slices');
    const note = resolveRetroBoard(store, 1).cards[0];
    expect(note?.kind).toBe('note');
    if (!note) return;
    store = convertRetroNote(store, 1, note.id);
    const current = cardsForRetroColumn(store, 1, agreementsColumn(), null);
    expect(current).toEqual([
      expect.objectContaining({
        carried: false,
        carriesToNext: true,
        kind: 'agreement',
        ownerSprintId: 1,
        text: 'Ship smaller slices',
      }),
    ]);
    expect(resolveRetroBoard(store, 1).cards.some((card) => card.kind === 'note')).toBe(false);

    const onNext = cardsForRetroColumn(store, 2, agreementsColumn(), 1);
    expect(onNext.map((card) => ({ carried: card.carried, text: card.text }))).toEqual([
      { carried: true, text: 'Ship smaller slices' },
    ]);

    const afterNext = cardsForRetroColumn(store, 3, agreementsColumn(), 2);
    expect(afterNext).toEqual([]);
  });

  it('moves a note into another column and ignores an unknown column', () => {
    let store = addRetroNote(emptyRetroStore(), 1, 'glad', 'Ship smaller slices');
    const note = resolveRetroBoard(store, 1).cards[0];
    const board = resolveRetroBoard(store, 1);
    const glad = board.columns.find((column) => column.preset === 'glad');
    const sad = board.columns.find((column) => column.preset === 'sad');
    if (!note || !glad || !sad) return;
    store = moveRetroCard(store, 1, note.id, sad.id);
    expect(cardsForRetroColumn(store, 1, glad, null)).toEqual([]);
    expect(cardsForRetroColumn(store, 1, sad, null).map((card) => card.text)).toEqual([
      'Ship smaller slices',
    ]);
    store = moveRetroCard(store, 1, note.id, 'missing');
    expect(cardsForRetroColumn(store, 1, sad, null).map((card) => card.text)).toEqual([
      'Ship smaller slices',
    ]);
  });

  it('removes a carried agreement from both sprints', () => {
    let store = addRetroNote(emptyRetroStore(), 1, 'sad', 'Flaky tests');
    const note = resolveRetroBoard(store, 1).cards[0];
    if (!note) return;
    store = convertRetroNote(store, 1, note.id);
    store = deleteRetroCard(store, note.id);
    expect(cardsForRetroColumn(store, 1, agreementsColumn(), null)).toEqual([]);
    expect(cardsForRetroColumn(store, 2, agreementsColumn(), 1)).toEqual([]);
  });

  it('rejects an image that is not a small data url', () => {
    expect(isAcceptableRetroImageDataUrl('data:image/jpeg;base64,abc')).toBe(true);
    expect(isAcceptableRetroImageDataUrl('data:image/svg+xml;base64,abc')).toBe(false);
    expect(isAcceptableRetroImageDataUrl(`data:image/jpeg;base64,${'a'.repeat(RETRO_IMAGE_MAX_DATA_URL_CHARS)}`)).toBe(
      false
    );
    const store = addRetroImageCard(emptyRetroStore(), 1, 'went-well', 'not-an-image');
    expect(resolveRetroBoard(store, 1).cards).toEqual([]);
  });

  it('adds a comment on the sprint that owns the card', () => {
    let store = addRetroNote(emptyRetroStore(), 1, 'glad', 'Ship smaller slices');
    const note = resolveRetroBoard(store, 1).cards[0];
    if (!note) return;
    store = addRetroCardComment(store, 1, note.id, '   ', 'Ada');
    store = addRetroCardComment(store, 1, note.id, '  Still open  ', '  Ada  ');
    store = addRetroCardComment(store, 1, 'missing', 'Nope', 'Ada');
    const comments = resolveRetroBoard(store, 1).cards[0]?.comments ?? [];
    expect(comments.map((comment) => comment.text)).toEqual(['Still open']);
    expect(comments[0]?.authorName).toBe('Ada');

    store = convertRetroNote(store, 1, note.id);
    store = addRetroCardComment(store, 2, note.id, 'Wrong sprint', 'Ada');
    const carried = cardsForRetroColumn(store, 2, agreementsColumn(), 1);
    expect(carried[0]?.comments.map((comment) => comment.text)).toEqual(['Still open']);
    expect(carried[0]?.ownerSprintId).toBe(1);

    const commentId = comments[0]?.id;
    if (!commentId) return;
    store = deleteRetroCardComment(store, 1, note.id, commentId);
    expect(cardsForRetroColumn(store, 2, agreementsColumn(), 1)[0]?.comments).toEqual([]);
  });

  it('trims a comment to the length limit', () => {
    let store = addRetroNote(emptyRetroStore(), 1, 'glad', 'Demo');
    const note = resolveRetroBoard(store, 1).cards[0];
    if (!note) return;
    store = addRetroCardComment(store, 1, note.id, 'x'.repeat(RETRO_COMMENT_MAX_LENGTH + 25), 'Ada');
    expect(resolveRetroBoard(store, 1).cards[0]?.comments[0]?.text).toHaveLength(RETRO_COMMENT_MAX_LENGTH);
  });

  it('repairs a stored board that lost the agreements column', () => {
    const store = parseRetroStore({
      boards: {
        4: {
          columns: [{ id: 'went-well', preset: 'wentWell', role: null, title: '' }],
          cards: [{ id: 'n1', columnId: 'went-well', kind: 'note', text: 'Nice demo' }],
        },
      },
    });
    const board = store.boards['4'];
    expect(board?.columns.some((column) => column.role === 'agreements')).toBe(true);
    expect(board?.cards.map((card) => card.text)).toEqual(['Nice demo']);
    expect(board?.cards[0]?.comments).toEqual([]);
  });

  it('keeps card comments and drops blank ones', () => {
    const store = parseRetroStore({
      boards: {
        4: {
          columns: [{ id: 'glad', preset: 'glad', role: null, title: '' }],
          cards: [
            {
              id: 'n1',
              columnId: 'glad',
              kind: 'note',
              text: 'Nice demo',
              comments: [
                { id: 'c2', text: 'Later', authorName: 'Bea', createdAt: '2026-02-02T00:00:00.000Z' },
                { id: 'c1', text: ' Agreed ', authorName: ' Ada ', createdAt: '2026-02-01T00:00:00.000Z' },
                { id: 'c1', text: 'duplicate', authorName: 'Ada', createdAt: '2026-02-03T00:00:00.000Z' },
                { id: 'c3', text: '   ', authorName: 'Ada', createdAt: '2026-02-03T00:00:00.000Z' },
              ],
            },
          ],
        },
      },
    });
    expect(store.boards['4']?.cards[0]?.comments).toEqual([
      {
        authorName: 'Ada',
        createdAt: '2026-02-01T00:00:00.000Z',
        id: 'c1',
        text: 'Agreed',
      },
      {
        authorName: 'Bea',
        createdAt: '2026-02-02T00:00:00.000Z',
        id: 'c2',
        text: 'Later',
      },
    ]);
  });

  it('uses the column template for an empty sprint and keeps a saved board', () => {
    const template = [
      { id: 'agreements', preset: 'agreements' as const, role: 'agreements' as const, title: 'Pacts' },
      { id: 'custom', preset: null, role: null, title: 'Custom' },
    ];
    const fresh = resolveRetroBoard(emptyRetroStore(), 1, template);
    expect(fresh.columns.map((column) => column.title)).toEqual(['Pacts', 'Custom']);

    const saved = addRetroColumn(emptyRetroStore(), 1, 'Kudos');
    const kept = resolveRetroBoard(saved, 1, template);
    expect(kept.columns.some((column) => column.title === 'Kudos')).toBe(true);
    expect(kept.columns.some((column) => column.title === 'Custom')).toBe(false);

    const next = resolveRetroBoard(saved, 2, template);
    expect(next.cards).toEqual([]);
    expect(next.columns.map((column) => column.title)).toEqual(['Pacts', 'Custom']);
  });

  it('reports only the boards a change replaced', () => {
    const before = addRetroNote(emptyRetroStore(), 1, 'glad', 'Demo');
    const after = addRetroNote(before, 2, 'sad', 'Wait');
    const changed = changedRetroBoards(before, after);
    expect(changed.map((board) => board.sprintId)).toEqual([2]);
    expect(retroStoreFromBoards(changed).boards['2']?.cards[0]?.text).toBe('Wait');
  });
});
