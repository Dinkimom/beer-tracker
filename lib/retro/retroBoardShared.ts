import type { StickyNoteColor } from '@/lib/comments/stickyNoteColor';

export const RETRO_NOTE_MAX_LENGTH = 2000;
export const RETRO_COLUMN_TITLE_MAX_LENGTH = 40;
export const RETRO_IMAGE_MAX_DATA_URL_CHARS = 450_000;
export const RETRO_COMMENT_MAX_LENGTH = 1000;
export const RETRO_COMMENT_AUTHOR_MAX_LENGTH = 120;
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

export interface RetroCardComment {
  authorName: string;
  createdAt: string;
  id: string;
  text: string;
}

export interface RetroColumn {
  id: string;
  preset: RetroColumnPreset | null;
  role: 'agreements' | null;
  title: string;
}

export interface RetroCard {
  carriesToNext: boolean;
  color: StickyNoteColor | null;
  columnId: string;
  comments: RetroCardComment[];
  createdAt: string;
  id: string;
  imageDataUrl: string | null;
  kind: RetroCardKind;
  originSprintId: number | null;
  reactions: string[];
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
