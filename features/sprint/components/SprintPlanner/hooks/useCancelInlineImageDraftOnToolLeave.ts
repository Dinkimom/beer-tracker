import type { SwimlanePlacementTool } from '@/lib/layers';
import type { Task, TaskPosition } from '@/types';

import { useEffect, useRef } from 'react';

import { cancelLocalImageCreateDraftIfLeftImageTool } from './cancelQuickAddDraft';

export function useCancelInlineImageDraftOnToolLeave(input: {
  placementTool: SwimlanePlacementTool;
  submittingTaskId: string | null;
  tasks: Task[];
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
    if (keepInlineCardDraftRef?.current && previousTool === 'image' && placementTool !== 'image') {
      keepInlineCardDraftRef.current = false;
      return;
    }
    cancelLocalImageCreateDraftIfLeftImageTool({
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
