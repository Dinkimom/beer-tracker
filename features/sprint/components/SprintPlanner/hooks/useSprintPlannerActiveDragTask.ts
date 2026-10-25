import type { Task } from '@/types';

import { useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { resolveTaskWithNoteEditPreview } from '@/features/swimlane/components/taskLayerPlanSegmentItemHelpers';
import {
  parsePlanPatchPreviewElementId,
  planPatchPreviewTaskQueryKey,
  taskForPlanPatchPreview,
} from '@/features/swimlane/utils/planPatchPreviewFocus';
import { useRootStore } from '@/lib/layers';

interface UseSprintPlannerActiveDragTaskParams {
  activeTaskId: string | null;
  allTasksForDrag: Task[];
  backlogTaskRef: React.MutableRefObject<{
    getTask: (taskId: string) => Task | undefined;
    removeTask: (taskId: string) => void;
  } | null>;
}

export function useSprintPlannerActiveDragTask({
  activeTaskId,
  allTasksForDrag,
  backlogTaskRef,
}: UseSprintPlannerActiveDragTaskParams) {
  const noteEditPreview = useRootStore().sprintPlannerUi.noteEditPreview;
  const queryClient = useQueryClient();
  return useMemo(() => {
    if (!activeTaskId) return null;
    const previewTaskId = parsePlanPatchPreviewElementId(activeTaskId);
    if (previewTaskId) {
      // Карточка предложения агента: задача может быть ещё не в спринте (см. TaskLayerPlanPatchPreviews).
      return taskForPlanPatchPreview(
        allTasksForDrag.find((t) => t.id === previewTaskId) ??
          queryClient.getQueryData<Task>(planPatchPreviewTaskQueryKey(previewTaskId)),
        previewTaskId
      );
    }
    const task =
      allTasksForDrag.find((t) => t.id === activeTaskId) ??
      // Backlog ref is wired by SidebarSection after mount; same resolution as pre-refactor SprintPlanner.
      // eslint-disable-next-line react-hooks/refs -- drag overlay must resolve backlog tasks by id
      backlogTaskRef.current?.getTask(activeTaskId) ??
      null;
    return task ? resolveTaskWithNoteEditPreview(task, noteEditPreview) : null;
  }, [activeTaskId, allTasksForDrag, backlogTaskRef, noteEditPreview, queryClient]);
}
