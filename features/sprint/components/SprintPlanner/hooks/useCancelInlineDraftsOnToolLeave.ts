import type { SwimlanePlacementTool } from '@/lib/layers';
import type { Task, TaskPosition } from '@/types';

import { useEffect, useRef } from 'react';

import { cancelLocalCreateDraftOnToolLeave } from './cancelQuickAddDraft';

/** Смена инструмента тулбара отменяет черновик заметки, фото или схемы, который он создавал. */
export function useCancelInlineDraftsOnToolLeave(input: {
  placementTool: SwimlanePlacementTool;
  submittingTaskId: string | null;
  tasks: Task[];
  clearNoteEditPreview?: () => void;
  clearStickyNoteCardRowOverride: (taskId: string) => void;
  closeNoteComposer: () => void;
  keepInlineCardDraftRef?: { current: boolean };
  setSubmittingTaskId: (taskId: string | null) => void;
  setTaskPositions: (
    updater: (prev: Map<string, TaskPosition>) => Map<string, TaskPosition>,
    options: { recordHistory: boolean }
  ) => void;
  setTasks: (updater: (prev: Task[]) => Task[]) => void;
}): void {
  const previousToolRef = useRef(input.placementTool);
  const {
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
  } = input;

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
