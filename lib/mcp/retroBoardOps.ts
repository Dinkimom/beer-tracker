import { z } from 'zod';

import { STICKY_NOTE_INLINE_FORMAT_DESCRIPTION } from '@/lib/comments/stickyNoteInlineFormat';
import {
  RETRO_COLUMN_PRESETS,
  RETRO_COLUMN_TITLE_MAX_LENGTH,
  RETRO_COMMENT_MAX_LENGTH,
  RETRO_NOTE_MAX_LENGTH,
} from '@/lib/retro/retroBoardShared';

const columnIdField = z.string().min(1).max(80).optional();
const columnPresetField = z.enum(RETRO_COLUMN_PRESETS).optional();

const RetroBoardOpSchema = z.discriminatedUnion('op', [
  z.object({
    columnId: columnIdField,
    columnPreset: columnPresetField,
    op: z.literal('addNote'),
    text: z.string().trim().min(1).max(RETRO_NOTE_MAX_LENGTH).describe(STICKY_NOTE_INLINE_FORMAT_DESCRIPTION),
  }),
  z.object({
    cardId: z.string().min(1).max(120),
    op: z.literal('updateNote'),
    text: z.string().trim().min(1).max(RETRO_NOTE_MAX_LENGTH).describe(STICKY_NOTE_INLINE_FORMAT_DESCRIPTION),
  }),
  z.object({
    cardId: z.string().min(1).max(120),
    op: z.literal('deleteCard'),
  }),
  z.object({
    cardId: z.string().min(1).max(120),
    columnId: columnIdField,
    columnPreset: columnPresetField,
    op: z.literal('moveCard'),
  }),
  z.object({
    cardId: z.string().min(1).max(120),
    op: z.literal('addComment'),
    text: z.string().trim().min(1).max(RETRO_COMMENT_MAX_LENGTH),
  }),
  z.object({
    cardId: z.string().min(1).max(120),
    commentId: z.string().min(1).max(120),
    op: z.literal('deleteComment'),
  }),
  z.object({
    op: z.literal('addColumn'),
    title: z.string().trim().min(1).max(RETRO_COLUMN_TITLE_MAX_LENGTH),
  }),
  z.object({
    columnId: z.string().min(1).max(80),
    op: z.literal('renameColumn'),
    title: z.string().trim().min(1).max(RETRO_COLUMN_TITLE_MAX_LENGTH),
  }),
  z.object({
    columnId: z.string().min(1).max(80),
    op: z.literal('deleteColumn'),
  }),
  z.object({
    columnId: z.string().min(1).max(80),
    direction: z.union([z.literal(-1), z.literal(1)]),
    op: z.literal('moveColumn'),
  }),
  z.object({
    cardId: z.string().min(1).max(120),
    op: z.literal('convertToAgreement'),
  }),
]);

export const RetroBoardOpsSchema = z.array(RetroBoardOpSchema).min(1).max(50);

export type RetroBoardOp = z.infer<typeof RetroBoardOpSchema>;

function assertColumnRef(op: RetroBoardOp): void {
  if (op.op !== 'addNote' && op.op !== 'moveCard') {
    return;
  }
  if (!op.columnId && !op.columnPreset) {
    throw new Error(`${op.op} requires columnId or columnPreset`);
  }
}

export function parseRetroBoardOps(raw: unknown): RetroBoardOp[] {
  const ops = RetroBoardOpsSchema.parse(raw);
  for (const op of ops) {
    assertColumnRef(op);
  }
  return ops;
}
