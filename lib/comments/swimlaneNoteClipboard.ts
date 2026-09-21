import type { Comment } from '@/types';

import {
  plannerCommentCardRowHeightFromDurationParts,
  plannerCommentDurationPartsFromWidth,
} from '@/lib/comments/plannerCommentCardRow';
import { parseStickyNoteColor, type StickyNoteColor } from '@/lib/comments/stickyNoteColor';

/** Снимок заметки для вставки через «+» на свимлейне. Без реакций и id. */
export interface SwimlaneNoteClipboard {
  color: StickyNoteColor;
  height: number;
  text: string;
  width: number;
}

export function commentToSwimlaneNoteClipboard(
  comment: Pick<Comment, 'color' | 'height' | 'kind' | 'text' | 'width'>
): SwimlaneNoteClipboard | null {
  if (comment.kind === 'diagram' || comment.kind === 'image') {
    return null;
  }
  const text = comment.text;
  if (text.trim().length === 0) {
    return null;
  }
  const width = plannerCommentDurationPartsFromWidth(comment.width);
  return {
    color: parseStickyNoteColor(comment.color),
    height: plannerCommentCardRowHeightFromDurationParts(comment.height),
    text,
    width,
  };
}

/** Сбрасывает картинку/текст в системном буфере, чтобы Ctrl+V вставлял скопированную заметку. */
export async function writeNoteTextToSystemClipboard(text: string): Promise<void> {
  try {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      return;
    }
    await navigator.clipboard.writeText(text);
  } catch {
    // In-app clipboard still works if the OS clipboard is locked.
  }
}
