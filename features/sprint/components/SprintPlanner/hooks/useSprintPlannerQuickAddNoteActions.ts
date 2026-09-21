import type { StickyNoteColor } from '@/lib/comments/stickyNoteColor';
import type { PositionHistoryOptions } from '@/lib/layers/application/mobx/stores/taskPositionsStore';
import type { Comment, Task, TaskPosition } from '@/types';
import type { Dispatch, SetStateAction } from 'react';

import { useCallback } from 'react';

import { useI18n } from '@/contexts/LanguageContext';
import { useRootStore } from '@/lib/layers';

import { pasteQuickAddNoteDraft } from './pasteQuickAddNoteDraft';
import { completeQuickAddCommentDraft } from './submitQuickAddCommentDraft';

interface UseSprintPlannerQuickAddNoteActionsParams {
  comments: Comment[];
  setTasks: Dispatch<SetStateAction<Task[]>>;
  taskPositions: Map<string, TaskPosition>;
  tasks: Task[];
  closeNoteComposer: () => void;
  onCommentCreate: (comment: Comment) => void;
  onCommentUpdate: (commentId: string, text: string, color?: StickyNoteColor) => void;
  setTaskPositions: (
    positions:
      | Map<string, TaskPosition>
      | ((prev: Map<string, TaskPosition>) => Map<string, TaskPosition>),
    options?: PositionHistoryOptions
  ) => void;
}

export function useSprintPlannerQuickAddNoteActions({
  closeNoteComposer,
  comments,
  onCommentCreate,
  onCommentUpdate,
  setTaskPositions,
  setTasks,
  taskPositions,
  tasks,
}: UseSprintPlannerQuickAddNoteActionsParams) {
  const { t } = useI18n();
  const { sprintPlannerUi } = useRootStore();

  const handleSubmitQuickAddCommentDraft = useCallback(
    (taskId: string, draftTitle?: string, color?: StickyNoteColor) => {
      if (color) {
        sprintPlannerUi.setStickyNoteColor(color);
      }
      completeQuickAddCommentDraft({
        cardRowUi: sprintPlannerUi,
        closeNoteComposer,
        comments,
        color,
        createdMessage: t('sprintPlanner.swimlane.quickAddMenu.createCommentSuccess'),
        defaultNote: t('comments.defaultNote'),
        draftTitle,
        onCommentCreate,
        onCommentUpdate,
        setTaskPositions,
        setTasks,
        taskId,
        taskPositions,
        tasks,
        updatedMessage: t('sprintPlanner.swimlane.quickAddMenu.updateCommentSuccess'),
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
      const clipboard = sprintPlannerUi.noteClipboard;
      if (!clipboard) {
        return;
      }
      pasteQuickAddNoteDraft({
        clipboard,
        createdMessage: t('sprintPlanner.swimlane.quickAddMenu.createCommentSuccess'),
        onCommentCreate,
        setTaskPositions,
        setTasks,
        taskId,
        taskPositions,
        tasks,
      });
    },
    [onCommentCreate, setTaskPositions, setTasks, sprintPlannerUi, t, taskPositions, tasks]
  );

  return { handlePasteQuickAddNote, handleSubmitQuickAddCommentDraft };
}
