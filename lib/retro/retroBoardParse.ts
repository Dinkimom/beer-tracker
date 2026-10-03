import {
  DEFAULT_STICKY_NOTE_COLOR,
  isStickyNoteColor,
  type StickyNoteColor,
} from '@/lib/comments/stickyNoteColor';
import { isStickyNoteReactionEmoji } from '@/lib/comments/stickyNoteReaction';

import {
  defaultAgreementsColumn,
  emptyRetroStore,
  isAcceptableRetroImageDataUrl,
  RETRO_COLUMN_PRESETS,
  RETRO_COLUMN_TITLE_MAX_LENGTH,
  RETRO_COMMENT_AUTHOR_MAX_LENGTH,
  RETRO_COMMENT_MAX_LENGTH,
  RETRO_COMMENTS_MAX_COUNT,
  RETRO_NOTE_MAX_LENGTH,
  type RetroBoard,
  type RetroCard,
  type RetroCardComment,
  type RetroCardKind,
  type RetroColumn,
  type RetroColumnPreset,
  type RetroStore,
} from './retroBoardShared';

export function parseRetroStore(raw: unknown): RetroStore {
  if (!isRecord(raw) || !isRecord(raw.boards)) return emptyRetroStore();
  const boards: Record<string, RetroBoard> = {};
  for (const [key, value] of Object.entries(raw.boards)) {
    const sprintId = Number(key);
    if (!Number.isInteger(sprintId) || sprintId <= 0) continue;
    const board = parseRetroBoard(value, sprintId);
    if (board) boards[String(sprintId)] = board;
  }
  return { version: 1, boards };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > 80) return null;
  return trimmed;
}

function readBoundedString(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  return value.slice(0, max);
}

function readKind(value: unknown): RetroCardKind | null {
  if (value === 'note' || value === 'image' || value === 'agreement') return value;
  return null;
}

function readPreset(value: unknown): RetroColumnPreset | null {
  if (typeof value !== 'string') return null;
  for (const preset of RETRO_COLUMN_PRESETS) {
    if (preset === value) return preset;
  }
  return null;
}

function readReactions(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isStickyNoteReactionEmoji);
}

function parseComment(raw: unknown): RetroCardComment | null {
  if (!isRecord(raw)) return null;
  const id = readId(raw.id);
  const text = readBoundedString(raw.text, RETRO_COMMENT_MAX_LENGTH).trim();
  if (!id || !text) return null;
  return {
    authorName: readBoundedString(raw.authorName, RETRO_COMMENT_AUTHOR_MAX_LENGTH).trim(),
    createdAt: readCreatedAt(raw.createdAt),
    id,
    text,
  };
}

function readComments(value: unknown): RetroCardComment[] {
  const comments = uniqueComments(readArray(value).map(parseComment).filter(isRetroComment));
  return comments.sort(compareComments).slice(-RETRO_COMMENTS_MAX_COUNT);
}

function readNoteColor(value: unknown, kind: RetroCardKind): StickyNoteColor | null {
  if (kind === 'image') return null;
  if (isStickyNoteColor(value)) return value;
  return DEFAULT_STICKY_NOTE_COLOR;
}

function readCreatedAt(value: unknown): string {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) return new Date(0).toISOString();
  return value;
}

function readSprintId(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) return null;
  return value;
}

function readImage(value: unknown): string | null {
  if (typeof value !== 'string' || !isAcceptableRetroImageDataUrl(value)) return null;
  return value;
}

function parseColumn(raw: unknown): RetroColumn | null {
  if (!isRecord(raw)) return null;
  const id = readId(raw.id);
  if (!id) return null;
  const role = raw.role === 'agreements' ? 'agreements' : null;
  const preset = role === 'agreements' ? 'agreements' : readPreset(raw.preset);
  return {
    id,
    preset,
    role,
    title: readBoundedString(raw.title, RETRO_COLUMN_TITLE_MAX_LENGTH),
  };
}

function parseCard(raw: unknown): RetroCard | null {
  if (!isRecord(raw)) return null;
  const id = readId(raw.id);
  const columnId = readId(raw.columnId);
  const kind = readKind(raw.kind);
  if (!id || !columnId || !kind) return null;
  const text = readBoundedString(raw.text, RETRO_NOTE_MAX_LENGTH);
  const imageDataUrl = readImage(raw.imageDataUrl);
  if (kind === 'image' && !imageDataUrl) return null;
  if (kind !== 'image' && !text.trim()) return null;
  return {
    carriesToNext: raw.carriesToNext === true && kind === 'agreement',
    color: readNoteColor(raw.color, kind),
    columnId,
    comments: readComments(raw.comments),
    createdAt: readCreatedAt(raw.createdAt),
    id,
    imageDataUrl: kind === 'image' ? imageDataUrl : null,
    kind,
    originSprintId: readSprintId(raw.originSprintId),
    reactions: kind === 'image' ? [] : readReactions(raw.reactions),
    text: kind === 'image' ? '' : text.trim(),
  };
}

export function parseRetroBoard(raw: unknown, sprintId: number): RetroBoard | null {
  if (!isRecord(raw)) return null;
  const columns = uniqueColumns(readArray(raw.columns).map(parseColumn).filter(isRetroColumn));
  const cards = uniqueCards(readArray(raw.cards).map(parseCard).filter(isRetroCard));
  const columnIds = new Set(columns.map((column) => column.id));
  return {
    sprintId,
    columns,
    cards: cards.filter((card) => columnIds.has(card.columnId)),
  };
}

function demoteExtraAgreementsColumn(column: RetroColumn): RetroColumn {
  if (column.preset === 'agreements') return { ...column, preset: null, role: null };
  return { ...column, role: null };
}

function columnWithSingleAgreementsRole(column: RetroColumn, agreementsSeen: boolean): RetroColumn {
  if (column.role === 'agreements' && agreementsSeen) return demoteExtraAgreementsColumn(column);
  return column;
}

function uniqueColumns(columns: RetroColumn[]): RetroColumn[] {
  const seen = new Set<string>();
  const result: RetroColumn[] = [];
  let agreementsSeen = false;
  for (const column of columns) {
    if (seen.has(column.id)) continue;
    seen.add(column.id);
    result.push(columnWithSingleAgreementsRole(column, agreementsSeen));
    if (column.role === 'agreements') agreementsSeen = true;
  }
  if (agreementsSeen) return result;
  return [...result, defaultAgreementsColumn()];
}

export function parseRetroColumnTemplate(raw: unknown): RetroColumn[] | null {
  const list = readColumnList(raw);
  if (!list) return null;
  return pinAgreementsFirst(uniqueColumns(list.map(parseColumn).filter(isRetroColumn)));
}

function readColumnList(raw: unknown): unknown[] | null {
  if (Array.isArray(raw)) return raw;
  if (isRecord(raw) && Array.isArray(raw.columns)) return raw.columns;
  return null;
}

function pinAgreementsFirst(columns: RetroColumn[]): RetroColumn[] {
  const index = columns.findIndex((column) => column.role === 'agreements');
  if (index <= 0) return columns;
  const agreements = columns[index];
  if (!agreements) return columns;
  return [agreements, ...columns.filter((_, columnIndex) => columnIndex !== index)];
}

function compareComments(a: RetroCardComment, b: RetroCardComment): number {
  if (a.createdAt === b.createdAt) return a.id < b.id ? -1 : 1;
  return a.createdAt < b.createdAt ? -1 : 1;
}

function uniqueComments(comments: RetroCardComment[]): RetroCardComment[] {
  const seen = new Set<string>();
  const result: RetroCardComment[] = [];
  for (const comment of comments) {
    if (seen.has(comment.id)) continue;
    seen.add(comment.id);
    result.push(comment);
  }
  return result;
}

function isRetroComment(value: RetroCardComment | null): value is RetroCardComment {
  return value !== null;
}

function uniqueCards(cards: RetroCard[]): RetroCard[] {
  const seen = new Set<string>();
  const result: RetroCard[] = [];
  for (const card of cards) {
    if (seen.has(card.id)) continue;
    seen.add(card.id);
    result.push(card);
  }
  return result;
}

function readArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function isRetroColumn(value: RetroColumn | null): value is RetroColumn {
  return value !== null;
}

function isRetroCard(value: RetroCard | null): value is RetroCard {
  return value !== null;
}
