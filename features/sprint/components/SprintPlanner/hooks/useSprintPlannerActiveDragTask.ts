import type { Task } from '@/types';

import { useMemo } from 'react';

import { resolveTaskWithNoteEditPreview } from '@/features/swimlane/components/taskLayerPlanSegmentItemHelpers';
import { useRootStore } from '@/lib/layers';

interface UseSprintPlannerActiveDragTaskParams {
  activeTaskId: string | null;
  allTasksForDrag: Task[];
  backlogTaskRef: React.MutableRefObject<{
    getTask: (taskId: string) => Task | undefined;
    removeTask: (taskId: string) => void;
  } | null>;
  slaBugsTasks: Task[] | undefined;
}

export function useSprintPlannerActiveDragTask({
  activeTaskId,
  allTasksForDrag,
  backlogTaskRef,
  slaBugsTasks,
}: UseSprintPlannerActiveDragTaskParams) {
  const noteEditPreview = useRootStore().sprintPlannerUi.noteEditPreview;
  return useMemo(() => {
    if (!activeTaskId) return null;
    const task =
      allTasksForDrag.find((t) => t.id === activeTaskId) ??
      // Backlog ref is wired by SidebarSection after mount; same resolution as pre-refactor SprintPlanner.
      // eslint-disable-next-line react-hooks/refs -- drag overlay must resolve backlog tasks by id
      backlogTaskRef.current?.getTask(activeTaskId) ??
      slaBugsTasks?.find((t) => t.id === activeTaskId) ??
      null;
    return task ? resolveTaskWithNoteEditPreview(task, noteEditPreview) : null;
  }, [activeTaskId, allTasksForDrag, backlogTaskRef, noteEditPreview, slaBugsTasks]);
}
