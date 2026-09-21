import type { Task, TaskPosition } from '@/types';

import { useEffect } from 'react';

import { cancelQuickAddDraft, findLocalCommentCreateDraftId } from './cancelQuickAddDraft';

/** Черновик заметки живёт до явного сохранения, удаления или Escape — не сбрасывается при blur. */
export function useDiscardStickyNoteCreateDraftOnEscape(input: {
  submittingTaskId: string | null;
  tasks: Task[];
  closeNoteComposer: () => void;
  setSubmittingTaskId: (taskId: string | null) => void;
  setTaskPositions: (
    updater: (prev: Map<string, TaskPosition>) => Map<string, TaskPosition>,
    options: { recordHistory: boolean }
  ) => void;
  setTasks: (updater: (prev: Task[]) => Task[]) => void;
}): void {
  const {
    closeNoteComposer,
    setSubmittingTaskId,
    setTaskPositions,
    setTasks,
    submittingTaskId,
    tasks,
  } = input;

  useEffect(() => {
    const taskId = findLocalCommentCreateDraftId(tasks);
    if (!taskId) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }
      // Confirm / other overlays own Escape; placement toolbar may preventDefault first for Safari.
      if (document.querySelector('[data-confirm-dialog="true"]')) {
        return;
      }
      // Safari: without preventDefault, Escape exits fullscreen.
      event.preventDefault();
      cancelQuickAddDraft({
        closeNoteComposer,
        setSubmittingTaskId,
        setTaskPositions,
        setTasks,
        submittingTaskId,
        taskId,
        tasks,
      });
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    closeNoteComposer,
    setSubmittingTaskId,
    setTaskPositions,
    setTasks,
    submittingTaskId,
    tasks,
  ]);
}
