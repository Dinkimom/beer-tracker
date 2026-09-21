import type { ConfirmDialogPromptOptions } from '@/components/ConfirmDialog';

import { parseSwimlaneCommentTaskId } from '@/features/comments/utils/swimlaneCommentTaskBridge';

type ConfirmFn = (
  message: string,
  options?: ConfirmDialogPromptOptions
) => Promise<boolean>;

export function confirmSwimlaneDiagramCommentDelete(input: {
  isDiagram: boolean;
  confirm: ConfirmFn;
  t: (key: string) => string;
}): Promise<boolean> {
  if (!input.isDiagram) {
    return Promise.resolve(true);
  }
  return input.confirm(input.t('sprintPlanner.contextMenu.deleteDiagramConfirm'), {
    cancelText: input.t('common.cancel'),
    confirmText: input.t('common.delete'),
    title: input.t('sprintPlanner.contextMenu.deleteDiagram'),
    variant: 'destructive',
  });
}

export async function deleteSwimlaneCommentAfterDiagramConfirm(input: {
  closeDiagramEditor?: () => void;
  commentId: string;
  comments: ReadonlyArray<{ id: string; kind?: string }>;
  confirm: ConfirmFn;
  deleteNow: (commentId: string) => void;
  diagramEditorTaskId?: string | null;
  t: (key: string) => string;
}): Promise<void> {
  const comment = input.comments.find((item) => item.id === input.commentId);
  const ok = await confirmSwimlaneDiagramCommentDelete({
    isDiagram: comment?.kind === 'diagram',
    confirm: input.confirm,
    t: input.t,
  });
  if (!ok) {
    return;
  }
  if (input.closeDiagramEditor) {
    closeDiagramEditorIfCommentOpen(
      input.commentId,
      input.diagramEditorTaskId,
      input.closeDiagramEditor
    );
  }
  input.deleteNow(input.commentId);
}

export function closeDiagramEditorIfCommentOpen(
  commentId: string,
  diagramEditorTaskId: string | null | undefined,
  close: () => void
): void {
  if (diagramEditorTaskId != null && parseSwimlaneCommentTaskId(diagramEditorTaskId) === commentId) {
    close();
  }
}
