/**
 * Доска ретро: колонки, заметки, картинки, комментарии и договорённости.
 * Пустая доска берёт колонки из шаблона. Уже сохранённая доска не переписывается.
 * Договорённость видна в спринте, где её создали, и в следующем по дате старта.
 */

import { DEFAULT_STICKY_NOTE_COLOR } from '@/lib/comments/stickyNoteColor';
import { isStickyNoteReactionEmoji } from '@/lib/comments/stickyNoteReaction';

import {
  defaultAgreementsColumn,
  isAcceptableRetroImageDataUrl,
  RETRO_COLUMN_TITLE_MAX_LENGTH,
  RETRO_COMMENT_AUTHOR_MAX_LENGTH,
  RETRO_COMMENT_MAX_LENGTH,
  RETRO_COMMENTS_MAX_COUNT,
  RETRO_NOTE_MAX_LENGTH,
  type RetroBoard,
  type RetroCard,
  type RetroCardComment,
  type RetroColumn,
  type RetroColumnPreset,
  type RetroSprintOrderItem,
  type RetroStore,
  type RetroVisibleCard,
} from './retroBoardShared';

export {
  emptyRetroStore,
  isAcceptableRetroImageDataUrl,
  RETRO_COMMENT_MAX_LENGTH,
  RETRO_IMAGE_MAX_DATA_URL_CHARS,
  retroColumnLabel,
  type RetroBoard,
  type RetroCardComment,
  type RetroColumn,
  type RetroColumnPreset,
  type RetroSprintOrderItem,
  type RetroStore,
  type RetroVisibleCard,
} from './retroBoardShared';
export { parseRetroColumnTemplate, parseRetroStore } from './retroBoardParse';

const COLUMN_GLAD = 'glad';
const COLUMN_SAD = 'sad';
const COLUMN_DISCUSS = 'discuss';
const COLUMN_META = 'meta';

export function resolveAdjacentSprintIds(
  sprints: readonly RetroSprintOrderItem[],
  sprintId: number
): { nextSprintId: number | null; previousSprintId: number | null } {
  const ordered = [...sprints].sort(compareSprintsByStart);
  const index = ordered.findIndex((sprint) => sprint.id === sprintId);
  if (index === -1) return { nextSprintId: null, previousSprintId: null };
  return {
    nextSprintId: ordered[index + 1]?.id ?? null,
    previousSprintId: ordered[index - 1]?.id ?? null,
  };
}

export function resolveRetroBoard(
  store: RetroStore,
  sprintId: number,
  templateColumns?: readonly RetroColumn[] | null
): RetroBoard {
  const existing = store.boards[String(sprintId)];
  if (existing) return existing;
  if (templateColumns && templateColumns.length > 0) {
    return boardFromColumns(sprintId, templateColumns);
  }
  return createDefaultRetroBoard(sprintId);
}

export function cardsForRetroColumn(
  store: RetroStore,
  sprintId: number,
  column: RetroColumn,
  previousSprintId: number | null
): RetroVisibleCard[] {
  const board = resolveRetroBoard(store, sprintId);
  const own = board.cards
    .filter((card) => card.columnId === column.id)
    .map((card) => toVisibleCard(card, sprintId, false));
  if (column.role !== 'agreements' || previousSprintId == null) return sortVisibleCards(own);
  const previous = store.boards[String(previousSprintId)];
  if (!previous) return sortVisibleCards(own);
  const carried = previous.cards
    .filter((card) => card.kind === 'agreement' && card.carriesToNext)
    .map((card) => toVisibleCard({ ...card, columnId: column.id }, previousSprintId, true));
  return sortVisibleCards([...own, ...carried]);
}

export function addRetroColumn(store: RetroStore, sprintId: number, title: string): RetroStore {
  const trimmed = title.trim().slice(0, RETRO_COLUMN_TITLE_MAX_LENGTH);
  if (!trimmed) return store;
  const { board, store: nextStore } = ensureBoard(store, sprintId);
  const column: RetroColumn = {
    id: createRetroId('column'),
    preset: null,
    role: null,
    title: trimmed,
  };
  return writeBoard(nextStore, { ...board, columns: [...board.columns, column] });
}

export function renameRetroColumn(
  store: RetroStore,
  sprintId: number,
  columnId: string,
  title: string
): RetroStore {
  const trimmed = title.trim().slice(0, RETRO_COLUMN_TITLE_MAX_LENGTH);
  const { board, store: nextStore } = ensureBoard(store, sprintId);
  const current = board.columns.find((column) => column.id === columnId);
  if (!current) return store;
  if (!trimmed && current.preset == null) return store;
  if (current.title === trimmed) return store;
  const columns = board.columns.map((column) =>
    column.id === columnId ? { ...column, title: trimmed } : column
  );
  return writeBoard(nextStore, { ...board, columns });
}

export function deleteRetroColumn(store: RetroStore, sprintId: number, columnId: string): RetroStore {
  const board = resolveRetroBoard(store, sprintId);
  const target = board.columns.find((column) => column.id === columnId);
  if (!target || target.role === 'agreements') return store;
  const { store: nextStore } = ensureBoard(store, sprintId);
  return writeBoard(nextStore, {
    ...board,
    cards: board.cards.filter((card) => card.columnId !== columnId),
    columns: board.columns.filter((column) => column.id !== columnId),
  });
}

export function moveRetroColumn(
  store: RetroStore,
  sprintId: number,
  columnId: string,
  direction: -1 | 1
): RetroStore {
  const board = resolveRetroBoard(store, sprintId);
  const index = board.columns.findIndex((column) => column.id === columnId);
  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= board.columns.length) return store;
  const columns = [...board.columns];
  const [moved] = columns.splice(index, 1);
  if (!moved) return store;
  columns.splice(nextIndex, 0, moved);
  const { store: nextStore } = ensureBoard(store, sprintId);
  return writeBoard(nextStore, { ...board, columns });
}

export function addRetroNote(
  store: RetroStore,
  sprintId: number,
  columnId: string,
  text: string
): RetroStore {
  const trimmed = text.trim().slice(0, RETRO_NOTE_MAX_LENGTH);
  if (!trimmed) return store;
  return appendCard(store, sprintId, columnId, {
    carriesToNext: false,
    color: DEFAULT_STICKY_NOTE_COLOR,
    columnId,
    createdAt: new Date().toISOString(),
    comments: [],
    id: createRetroId('card'),
    imageDataUrl: null,
    kind: 'note',
    originSprintId: null,
    reactions: [],
    text: trimmed,
  });
}

export function addRetroImageCard(
  store: RetroStore,
  sprintId: number,
  columnId: string,
  imageDataUrl: string
): RetroStore {
  if (!isAcceptableRetroImageDataUrl(imageDataUrl)) return store;
  return appendCard(store, sprintId, columnId, {
    carriesToNext: false,
    color: null,
    columnId,
    createdAt: new Date().toISOString(),
    comments: [],
    id: createRetroId('card'),
    imageDataUrl,
    kind: 'image',
    originSprintId: null,
    reactions: [],
    text: '',
  });
}

export function moveRetroCard(
  store: RetroStore,
  sprintId: number,
  cardId: string,
  columnId: string
): RetroStore {
  const board = store.boards[String(sprintId)];
  if (!board || !board.columns.some((column) => column.id === columnId)) return store;
  const current = board.cards.find((card) => card.id === cardId);
  if (!current || current.columnId === columnId) return store;
  const cards = board.cards.map((card) => (card.id === cardId ? { ...card, columnId } : card));
  return writeBoard(store, { ...board, cards });
}

export function toggleRetroCardReaction(
  store: RetroStore,
  ownerSprintId: number,
  cardId: string,
  emoji: string
): RetroStore {
  if (!isStickyNoteReactionEmoji(emoji)) return store;
  const board = store.boards[String(ownerSprintId)];
  if (!board) return store;
  const current = board.cards.find((card) => card.id === cardId);
  if (!current || current.kind === 'image') return store;
  const reactions = current.reactions.includes(emoji)
    ? current.reactions.filter((item) => item !== emoji)
    : [...current.reactions, emoji];
  const cards = board.cards.map((card) => (card.id === cardId ? { ...card, reactions } : card));
  return writeBoard(store, { ...board, cards });
}

export function addRetroCardComment(
  store: RetroStore,
  ownerSprintId: number,
  cardId: string,
  text: string,
  authorName: string
): RetroStore {
  const trimmed = text.trim().slice(0, RETRO_COMMENT_MAX_LENGTH);
  if (!trimmed) return store;
  return mapOwnedCard(store, ownerSprintId, cardId, (card) => {
    if (card.comments.length >= RETRO_COMMENTS_MAX_COUNT) return card;
    const comment: RetroCardComment = {
      authorName: authorName.trim().slice(0, RETRO_COMMENT_AUTHOR_MAX_LENGTH),
      createdAt: new Date().toISOString(),
      id: createRetroId('comment'),
      text: trimmed,
    };
    return { ...card, comments: [...card.comments, comment] };
  });
}

export function deleteRetroCardComment(
  store: RetroStore,
  ownerSprintId: number,
  cardId: string,
  commentId: string
): RetroStore {
  return mapOwnedCard(store, ownerSprintId, cardId, (card) => {
    const comments = card.comments.filter((comment) => comment.id !== commentId);
    if (comments.length === card.comments.length) return card;
    return { ...card, comments };
  });
}

export function updateRetroCardText(
  store: RetroStore,
  ownerSprintId: number,
  cardId: string,
  text: string
): RetroStore {
  const trimmed = text.trim().slice(0, RETRO_NOTE_MAX_LENGTH);
  if (!trimmed) return store;
  const board = store.boards[String(ownerSprintId)];
  if (!board) return store;
  const current = board.cards.find((card) => card.id === cardId);
  if (!current || current.kind === 'image' || current.text === trimmed) return store;
  const cards = board.cards.map((card) => (card.id === cardId ? { ...card, text: trimmed } : card));
  return writeBoard(store, { ...board, cards });
}

export function deleteRetroCard(store: RetroStore, cardId: string): RetroStore {
  let changed = false;
  const boards: Record<string, RetroBoard> = {};
  for (const [key, board] of Object.entries(store.boards)) {
    const cards = board.cards.filter((card) => card.id !== cardId);
    if (cards.length === board.cards.length) {
      boards[key] = board;
    } else {
      changed = true;
      boards[key] = { ...board, cards };
    }
  }
  if (!changed) return store;
  return { version: 1, boards };
}

export function convertRetroNote(store: RetroStore, sprintId: number, cardId: string): RetroStore {
  const board = store.boards[String(sprintId)];
  if (!board) return store;
  const note = board.cards.find((card) => card.id === cardId);
  const agreements = board.columns.find((column) => column.role === 'agreements');
  if (!note || note.kind !== 'note' || !agreements) return store;
  const cards = board.cards.map((card) =>
    card.id === note.id ? toAgreementCard(card, agreements.id, sprintId) : card
  );
  return writeBoard(store, { ...board, cards });
}

export function retroStoreFromBoards(boards: readonly (RetroBoard | null | undefined)[]): RetroStore {
  const record: Record<string, RetroBoard> = {};
  for (const board of boards) {
    if (!board) continue;
    record[String(board.sprintId)] = board;
  }
  return { version: 1, boards: record };
}

export function changedRetroBoards(before: RetroStore, after: RetroStore): RetroBoard[] {
  const changed: RetroBoard[] = [];
  for (const [key, board] of Object.entries(after.boards)) {
    if (before.boards[key] !== board) changed.push(board);
  }
  return changed;
}

export function defaultRetroColumnTemplate(): RetroColumn[] {
  return [
    defaultAgreementsColumn(),
    presetColumn(COLUMN_GLAD, 'glad'),
    presetColumn(COLUMN_SAD, 'sad'),
    presetColumn(COLUMN_DISCUSS, 'discuss'),
    presetColumn(COLUMN_META, 'meta'),
  ];
}

function createDefaultRetroBoard(sprintId: number): RetroBoard {
  return boardFromColumns(sprintId, defaultRetroColumnTemplate());
}

function boardFromColumns(sprintId: number, columns: readonly RetroColumn[]): RetroBoard {
  return {
    sprintId,
    cards: [],
    columns: columns.map((column) => ({ ...column })),
  };
}

function presetColumn(id: string, preset: RetroColumnPreset): RetroColumn {
  return { id, title: '', preset, role: null };
}

function toAgreementCard(card: RetroCard, columnId: string, sprintId: number): RetroCard {
  return {
    ...card,
    carriesToNext: true,
    columnId,
    imageDataUrl: null,
    kind: 'agreement',
    originSprintId: sprintId,
  };
}

function toVisibleCard(card: RetroCard, ownerSprintId: number, carried: boolean): RetroVisibleCard {
  return { ...card, carried, ownerSprintId };
}

function sortVisibleCards(cards: RetroVisibleCard[]): RetroVisibleCard[] {
  return [...cards].sort(compareVisibleCards);
}

function compareVisibleCards(a: RetroVisibleCard, b: RetroVisibleCard): number {
  if (a.createdAt === b.createdAt) return a.id < b.id ? -1 : 1;
  return a.createdAt < b.createdAt ? -1 : 1;
}

function compareSprintsByStart(a: RetroSprintOrderItem, b: RetroSprintOrderItem): number {
  const byDate = (a.startDate ?? '').localeCompare(b.startDate ?? '');
  if (byDate !== 0) return byDate;
  return a.id - b.id;
}

function ensureBoard(store: RetroStore, sprintId: number): { board: RetroBoard; store: RetroStore } {
  const existing = store.boards[String(sprintId)];
  if (existing) return { board: existing, store };
  const board = resolveRetroBoard(store, sprintId);
  return { board, store: writeBoard(store, board) };
}

function mapOwnedCard(
  store: RetroStore,
  ownerSprintId: number,
  cardId: string,
  map: (card: RetroCard) => RetroCard
): RetroStore {
  const board = store.boards[String(ownerSprintId)];
  if (!board) return store;
  const current = board.cards.find((card) => card.id === cardId);
  if (!current) return store;
  const next = map(current);
  if (next === current) return store;
  const cards = board.cards.map((card) => (card.id === cardId ? next : card));
  return writeBoard(store, { ...board, cards });
}

function appendCard(
  store: RetroStore,
  sprintId: number,
  columnId: string,
  card: RetroCard
): RetroStore {
  const { board, store: nextStore } = ensureBoard(store, sprintId);
  if (!board.columns.some((column) => column.id === columnId)) return store;
  return writeBoard(nextStore, { ...board, cards: [...board.cards, card] });
}

function writeBoard(store: RetroStore, board: RetroBoard): RetroStore {
  return {
    version: 1,
    boards: { ...store.boards, [String(board.sprintId)]: board },
  };
}

function createRetroId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}
