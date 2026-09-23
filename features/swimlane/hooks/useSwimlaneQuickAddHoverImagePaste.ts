'use client';

import type { SwimlaneNoteClipboard } from '@/lib/comments/swimlaneNoteClipboard';
import type { Comment } from '@/types';

import { useEffect } from 'react';

import { getPartsPerDay } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import { pasteNoteAtSwimlaneCell } from '@/features/sprint/components/SprintPlanner/hooks/pasteQuickAddNoteDraft';
import { fileFromClipboardData } from '@/features/task/utils/localPlannerImageFile';
import { useSwimlaneNotesVisibleStorage } from '@/hooks/useLocalStorage';

export function swimlaneCellIndexToDayPart(cellIndex: number): { day: number; part: number } {
  return {
    day: Math.floor(cellIndex / getPartsPerDay()),
    part: cellIndex % getPartsPerDay(),
  };
}

export function applyHoveredCellImagePaste(input: {
  assigneeId: string;
  cellIndex: number;
  clipboardData: DataTransfer | null;
  onCreateTaskInCell?: (payload: {
    assigneeId: string;
    day: number;
    imageFile: File;
    part: number;
  }) => void;
  onPasteNote?: (payload: { assigneeId: string; day: number; part: number }) => void;
}): boolean {
  const { day, part } = swimlaneCellIndexToDayPart(input.cellIndex);
  if (input.onPasteNote) {
    input.onPasteNote({
      assigneeId: input.assigneeId,
      day,
      part,
    });
    return true;
  }
  const file = fileFromClipboardData(input.clipboardData);
  if (file && input.onCreateTaskInCell) {
    input.onCreateTaskInCell({
      assigneeId: input.assigneeId,
      day,
      imageFile: file,
      part,
    });
    return true;
  }
  return false;
}

function createHoveredNotePasteHandler(
  clipboard: SwimlaneNoteClipboard,
  createdMessage: string,
  onCommentCreate: (comment: Comment) => void
): (payload: { assigneeId: string; day: number; part: number }) => void {
  return (payload) => {
    pasteNoteAtSwimlaneCell({
      ...payload,
      clipboard,
      createdMessage,
      onCommentCreate,
    });
  };
}

export function useSwimlaneQuickAddHoverImagePaste(input: {
  assigneeId: string;
  cellIndex: number | null;
  enabled: boolean;
  noteClipboard?: SwimlaneNoteClipboard | null;
  onCommentCreate?: (comment: Comment) => void;
  onCreateTaskInCell?: (payload: {
    assigneeId: string;
    day: number;
    imageFile?: File;
    part: number;
  }) => void;
}): void {
  const {
    assigneeId,
    cellIndex,
    enabled,
    noteClipboard,
    onCommentCreate,
    onCreateTaskInCell,
  } = input;
  const { t } = useI18n();
  const [notesVisible] = useSwimlaneNotesVisibleStorage();
  const createdMessage = t('sprintPlanner.swimlane.quickAddMenu.createCommentSuccess');
  useEffect(() => {
    const pasteNote =
      notesVisible && noteClipboard && onCommentCreate
        ? createHoveredNotePasteHandler(noteClipboard, createdMessage, onCommentCreate)
        : undefined;
    if (!enabled || cellIndex == null || (!onCreateTaskInCell && !pasteNote)) {
      return;
    }
    const onPaste = (event: ClipboardEvent) => {
      const applied = applyHoveredCellImagePaste({
        assigneeId,
        cellIndex,
        clipboardData: event.clipboardData,
        onCreateTaskInCell,
        onPasteNote: pasteNote,
      });
      if (applied) {
        event.preventDefault();
      }
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [
    assigneeId,
    cellIndex,
    createdMessage,
    enabled,
    noteClipboard,
    notesVisible,
    onCommentCreate,
    onCreateTaskInCell,
  ]);
}
