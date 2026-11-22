import type { SprintBoard } from '@/features/sprint/model/SprintBoard';
import type { StickyNoteColor } from '@/lib/comments/stickyNoteColor';
import type { Comment } from '@/types';

import { useCallback } from 'react';

import { useI18n } from '@/contexts/LanguageContext';
import { useRootStore } from '@/lib/layers';

import { pasteQuickAddNoteDraft } from './pasteQuickAddNoteDraft';
import { completeQuickAddCommentDraft } from './submitQuickAddCommentDraft';

interface UseSprintPlannerQuickAddNoteActionsParams {
  /** Задачи, заметки и позиции (с сохранением) — из модели доски. */
  board: SprintBoard;
  closeNoteComposer: () => void;
  onCommentCreate: (comment: Comment) => void;
  onCommentUpdate: (commentId: string, text: string, color?: StickyNoteColor) => void;
}

export function useSprintPlannerQuickAddNoteActions({
  board,
  closeNoteComposer,
  onCommentCreate,
  onCommentUpdate,
}: UseSprintPlannerQuickAddNoteActionsParams) {
  const { displayPositions: taskPositions, tasks, updateTasks: setTasks } = board;
  const { setPositionsWithSave: setTaskPositions } = board.positions;
  const comments = board.comments.items;
  const { t } = useI18n();
  const { sprintPlannerUi } = useRootStore();

  const handleSubmitQuickAddCommentDraft = useCallback(
    (taskId: string, draftTitle?: string, color?: StickyNoteColor) => {
      if (color) {
        sprintPlannerUi.tools.setStickyNoteColor(color);
      }
      completeQuickAddCommentDraft({
        cardRowUi: sprintPlannerUi.cards,
        closeNoteComposer,
        comments,
        color,
        defaultNote: t('comments.defaultNote'),
        draftTitle,
        onCommentCreate,
        onCommentUpdate,
        setTaskPositions,
        setTasks,
        taskId,
        taskPositions,
        tasks,
      });
    },
    [
      closeNoteComposer,
      comments,
      onCommentCreate,
      onCommentUpdate,
      setTaskPositions,
      setTasks,
      sprintPlannerUi,
      t,
      taskPositions,
      tasks,
    ]
  );

  const handlePasteQuickAddNote = useCallback(
    (taskId: string) => {
      const clipboard = sprintPlannerUi.tools.noteClipboard;
      if (!clipboard) {
        return;
      }
      pasteQuickAddNoteDraft({
        clipboard,
        onCommentCreate,
        setTaskPositions,
        setTasks,
        taskId,
        taskPositions,
        tasks,
      });
    },
    [onCommentCreate, setTaskPositions, setTasks, sprintPlannerUi, taskPositions, tasks]
  );

  return { handlePasteQuickAddNote, handleSubmitQuickAddCommentDraft };
}
