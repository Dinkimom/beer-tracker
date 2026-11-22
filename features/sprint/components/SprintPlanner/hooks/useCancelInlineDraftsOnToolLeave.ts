import type { SprintBoard } from '@/features/sprint/model/SprintBoard';
import type { SwimlanePlacementTool } from '@/lib/layers';

import { useEffect, useRef } from 'react';

import { cancelLocalCreateDraftOnToolLeave } from './cancelQuickAddDraft';

/** Смена инструмента тулбара отменяет черновик заметки, фото или схемы, который он создавал. */
export function useCancelInlineDraftsOnToolLeave(input: {
  /** Задачи и позиции (с сохранением) — из модели доски. */
  board: SprintBoard;
  placementTool: SwimlanePlacementTool;
  submittingTaskId: string | null;
  clearNoteEditPreview?: () => void;
  clearStickyNoteCardRowOverride: (taskId: string) => void;
  closeNoteComposer: () => void;
  keepInlineCardDraftRef?: { current: boolean };
  setSubmittingTaskId: (taskId: string | null) => void;
}): void {
  const previousToolRef = useRef(input.placementTool);
  const {
    board,
    clearNoteEditPreview,
    clearStickyNoteCardRowOverride,
    closeNoteComposer,
    keepInlineCardDraftRef,
    placementTool,
    setSubmittingTaskId,
    submittingTaskId,
  } = input;
  const { tasks, updateTasks: setTasks } = board;
  const { setPositionsWithSave: setTaskPositions } = board.positions;

  useEffect(() => {
    const previousTool = previousToolRef.current;
    previousToolRef.current = placementTool;
    cancelLocalCreateDraftOnToolLeave({
      clearNoteEditPreview,
      clearStickyNoteCardRowOverride,
      closeNoteComposer,
      keepInlineCardDraftRef,
      placementTool,
      previousTool,
      setSubmittingTaskId,
      setTaskPositions,
      setTasks,
      submittingTaskId,
      tasks,
    });
  }, [
    clearNoteEditPreview,
    clearStickyNoteCardRowOverride,
    closeNoteComposer,
    keepInlineCardDraftRef,
    placementTool,
    setSubmittingTaskId,
    setTaskPositions,
    setTasks,
    submittingTaskId,
    tasks,
  ]);
}
