import type { SprintPlannerHandlers } from './useSprintPlannerHandlers';
import type { ConfirmDialogPromptOptions } from '@/components/ConfirmDialog';
import type { SwimlaneCommentActions } from '@/features/comments/types';
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
  handlers: Pick<
    SprintPlannerHandlers,
    | 'handleCommentApprove'
    | 'handleCommentCardRowLayoutUpdate'
    | 'handleCommentCreate'
    | 'handleCommentDelete'
    | 'handleCommentParentChange'
    | 'handleCommentUpdate'
  >;
}): { commentActions: SwimlaneCommentActions; handleCommentDelete: (commentId: string) => Promise<void> } {
  const { comments, confirm, handlers } = input;
  const { t } = useI18n();
  const { sprintPlannerUi } = useRootStore();

  const handleCommentDelete = useCallback(
    (commentId: string) =>
      deleteSwimlaneCommentAfterDiagramConfirm({
        closeDiagramEditor: sprintPlannerUi.closeDiagramEditor,
        commentId,
        comments,
        confirm,
        deleteNow: handlers.handleCommentDelete,
        diagramEditorTaskId: sprintPlannerUi.diagramEditorTaskId,
        t,
      }),
    [comments, confirm, handlers.handleCommentDelete, sprintPlannerUi, t]
  );

  const commentActions = useMemo(
    (): SwimlaneCommentActions => ({
      onCommentApprove: handlers.handleCommentApprove,
      onCommentCardRowLayoutUpdate: handlers.handleCommentCardRowLayoutUpdate,
      onCommentCreate: handlers.handleCommentCreate,
      onCommentDelete: handleCommentDelete,
      onCommentParentChange: handlers.handleCommentParentChange,
      onCommentUpdate: handlers.handleCommentUpdate,
    }),
    [
      handleCommentDelete,
      handlers.handleCommentApprove,
      handlers.handleCommentCardRowLayoutUpdate,
      handlers.handleCommentCreate,
      handlers.handleCommentParentChange,
      handlers.handleCommentUpdate,
    ]
  );

  return { commentActions, handleCommentDelete };
}
