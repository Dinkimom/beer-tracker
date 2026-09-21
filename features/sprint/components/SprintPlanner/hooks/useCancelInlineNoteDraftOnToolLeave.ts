import type { SwimlanePlacementTool } from '@/lib/layers';
import type { Task, TaskPosition } from '@/types';

import { useEffect, useRef } from 'react';

import { cancelLocalCommentCreateDraftIfLeftCommentTool } from './cancelQuickAddDraft';

export function useCancelInlineNoteDraftOnToolLeave(input: {
  placementTool: SwimlanePlacementTool;
  submittingTaskId: string | null;
  tasks: Task[];
  clearNoteEditPreview?: () => void;
  clearStickyNoteCardRowOverride: (taskId: string) => void;
  closeNoteComposer: () => void;
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
    cancelLocalCommentCreateDraftIfLeftCommentTool({
      clearNoteEditPreview,
      clearStickyNoteCardRowOverride,
      closeNoteComposer,
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
    placementTool,
    setSubmittingTaskId,
    setTaskPositions,
    setTasks,
    submittingTaskId,
    tasks,
  ]);
}
