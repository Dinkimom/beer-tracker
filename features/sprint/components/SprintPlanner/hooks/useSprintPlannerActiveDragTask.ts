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
}

export function useSprintPlannerActiveDragTask({
  activeTaskId,
  allTasksForDrag,
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
      allTasksForDrag.find((t) => t.id === activeTaskId) ?? null;
    return task ? resolveTaskWithNoteEditPreview(task, noteEditPreview) : null;
  }, [activeTaskId, allTasksForDrag, noteEditPreview, queryClient]);
}
