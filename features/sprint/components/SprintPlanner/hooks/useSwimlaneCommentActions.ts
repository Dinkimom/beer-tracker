import type { SprintPlannerHandlers } from './useSprintPlannerHandlers';
import type { ConfirmDialogPromptOptions } from '@/components/ConfirmDialog';
import type { SwimlaneCommentActions } from '@/features/comments/types';
import type { SprintNotes } from '@/features/sprint/model/sprintNotes';
import type { Comment } from '@/types';

import { useCallback, useMemo } from 'react';

import { useI18n } from '@/contexts/LanguageContext';
import { useRootStore } from '@/lib/layers';

import { deleteSwimlaneCommentAfterDiagramConfirm } from './confirmSwimlaneDiagramDelete';

/**
 * Действия с заметками на дорожке одним объектом (`SwimlaneCommentActions`). Удаление схемы
 * спрашивает подтверждение и закрывает её редактор — тот же `handleCommentDelete` получают и окна доски.
 */
export function useSwimlaneCommentActions(input: {
  comments: Comment[];
  confirm: (message: string, options?: ConfirmDialogPromptOptions) => Promise<boolean>;
  handlers: Pick<SprintPlannerHandlers, 'handleCommentCreate' | 'handleCommentDelete'>;
  /** Принять, родитель, текст, раскладка — методы модели заметок. */
  notes: Pick<SprintNotes, 'approve' | 'changeParent' | 'setCardRowLayout' | 'updateText'>;
}): { commentActions: SwimlaneCommentActions; handleCommentDelete: (commentId: string) => Promise<void> } {
  const { comments, confirm, handlers, notes } = input;
  const { t } = useI18n();
  const { sprintPlannerUi } = useRootStore();

  const handleCommentDelete = useCallback(
    (commentId: string) =>
      deleteSwimlaneCommentAfterDiagramConfirm({
        closeDiagramEditor: sprintPlannerUi.tools.closeDiagramEditor,
        commentId,
        comments,
        confirm,
        deleteNow: handlers.handleCommentDelete,
        diagramEditorTaskId: sprintPlannerUi.tools.diagramEditorTaskId,
        t,
      }),
    [comments, confirm, handlers.handleCommentDelete, sprintPlannerUi, t]
  );

  const commentActions = useMemo(
    (): SwimlaneCommentActions => ({
      onCommentApprove: notes.approve,
      onCommentCardRowLayoutUpdate: notes.setCardRowLayout,
      onCommentCreate: handlers.handleCommentCreate,
      onCommentDelete: handleCommentDelete,
      onCommentParentChange: notes.changeParent,
      onCommentUpdate: notes.updateText,
    }),
    [
      handleCommentDelete,
      handlers.handleCommentCreate,
      notes.approve,
      notes.changeParent,
      notes.setCardRowLayout,
      notes.updateText,
    ]
  );

  return { commentActions, handleCommentDelete };
}
