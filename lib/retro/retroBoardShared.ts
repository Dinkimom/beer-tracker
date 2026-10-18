import type { StickyNoteColor } from '@/lib/comments/stickyNoteColor';

export const RETRO_NOTE_MAX_LENGTH = 2000;
export const RETRO_COLUMN_TITLE_MAX_LENGTH = 40;
export const RETRO_IMAGE_MAX_DATA_URL_CHARS = 450_000;
export const RETRO_COMMENT_MAX_LENGTH = 1000;
export const RETRO_COMMENT_AUTHOR_MAX_LENGTH = 120;
export const RETRO_COMMENT_AUTHOR_ID_MAX_LENGTH = 64;
export const RETRO_COMMENT_AVATAR_MAX_LENGTH = 2048;
export const RETRO_COMMENTS_MAX_COUNT = 100;

const RETRO_IMAGE_DATA_URL_PREFIXES = [
  'data:image/jpeg;base64,',
  'data:image/png;base64,',
  'data:image/webp;base64,',
  'data:image/gif;base64,',
];

export const RETRO_COLUMN_PRESETS = [
  'agreements',
  'discuss',
  'glad',
  'goals',
  'meta',
  'sad',
  'toImprove',
  'wentWell',
] as const;

export type RetroCardKind = 'agreement' | 'image' | 'note';
export type RetroColumnPreset = (typeof RETRO_COLUMN_PRESETS)[number];

export interface RetroCommentAuthor {
  avatarUrl?: string | null;
  name: string;
  userId?: string;
}

export interface RetroCardComment {
  authorAvatarUrl?: string;
  authorId?: string;
  authorName: string;
  createdAt: string;
  id: string;
  text: string;
}

/** Оставляет http(s) и корневой путь. javascript: и data: в доску не попадают. */
export function retroCommentAvatarUrl(value: string | null | undefined): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > RETRO_COMMENT_AVATAR_MAX_LENGTH) return undefined;
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return trimmed;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return undefined;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined;
  return trimmed;
}

/** Один голос пользователя за emoji на карточке ретро. */
export interface RetroCardReaction {
  emoji: string;
  userId: string;
  userName: string;
}

export interface RetroColumn {
  id: string;
  preset: RetroColumnPreset | null;
  role: 'agreements' | null;
  title: string;
}

export interface RetroCard {
  authorAvatarUrl?: string;
  authorId?: string;
  authorName?: string;
  carriesToNext: boolean;
  color: StickyNoteColor | null;
  columnId: string;
  comments: RetroCardComment[];
  createdAt: string;
  id: string;
  imageDataUrl: string | null;
  kind: RetroCardKind;
  originSprintId: number | null;
  reactions: RetroCardReaction[];
  text: string;
}

export interface RetroBoard {
  cards: RetroCard[];
  columns: RetroColumn[];
  sprintId: number;
}

export interface RetroStore {
  boards: Record<string, RetroBoard>;
  version: 1;
}

export interface RetroVisibleCard extends RetroCard {
  carried: boolean;
  ownerSprintId: number;
}

export interface RetroSprintOrderItem {
  id: number;
  startDate?: string;
}

export function emptyRetroStore(): RetroStore {
  return { version: 1, boards: {} };
}

export function isAcceptableRetroImageDataUrl(value: string): boolean {
  if (value.length === 0 || value.length > RETRO_IMAGE_MAX_DATA_URL_CHARS) return false;
  return RETRO_IMAGE_DATA_URL_PREFIXES.some((prefix) => value.startsWith(prefix));
}

export function retroColumnLabel(
  column: RetroColumn,
  presetLabel: (preset: RetroColumnPreset) => string,
  untitled: string
): string {
  if (column.title.trim()) return column.title;
  if (column.preset) return presetLabel(column.preset);
  return untitled;
}

export function defaultAgreementsColumn(): RetroColumn {
  return { id: 'agreements', title: '', preset: 'agreements', role: 'agreements' };
}
