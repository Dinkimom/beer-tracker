'use client';

import type { Developer, Task } from '@/types';

import { isSwimlaneCommentTask, isSwimlaneDiagramTask } from '@/features/comments/utils/swimlaneCommentTaskBridge';
import { TaskCard } from '@/features/task/components/TaskCard/TaskCard';
import { getSwimlaneCardRadiusClass } from '@/features/task/components/TaskCard/taskCardLayoutHelpers';
import { isSwimlaneImageTask } from '@/features/task/utils/swimlaneImageTask';
import { isEffectivelyQaTask } from '@/features/task/utils/taskUtils';
import { getPreviewBorderColor, resolvePaletteStatusKey } from '@/utils/statusColors';

/** Оболочка превью DnD: у задач скругление, у заметок — прямые углы (без clip rounded-lg). */
export function getSwimlaneDragOverlayShellClass(isStickyNote: boolean, isPhotoCard = false): string {
  const radiusClass = getSwimlaneCardRadiusClass(isPhotoCard, isStickyNote);
  const overflowClass = isPhotoCard ? 'overflow-visible' : 'overflow-hidden';
  return `box-border h-full w-full min-w-0 ${overflowClass} ${radiusClass} shadow-xl`;
}

interface SprintPlannerDragOverlayPreviewProps {
  activeTask: Task;
  activeTaskDuration: number | null;
  developers: Developer[];
  isDragFromSidebar: boolean;
  swimlaneOverlayWidthPercent?: number;
}

export function SprintPlannerDragOverlayPreview({
  activeTask,
  activeTaskDuration,
  developers,
  isDragFromSidebar,
  swimlaneOverlayWidthPercent,
}: SprintPlannerDragOverlayPreviewProps) {
  if (isDragFromSidebar) {
    return (
      <div className="w-[380px]">
        <TaskCard
          className="opacity-90 rotate-3"
          developers={developers}
          isDragging
          task={activeTask}
          variant="sidebar"
        />
      </div>
    );
  }

  const isStickyNote = isSwimlaneCommentTask(activeTask);
  const isPhotoCard = isSwimlaneImageTask(activeTask) || isSwimlaneDiagramTask(activeTask);

  return (
    <div className={getSwimlaneDragOverlayShellClass(isStickyNote, isPhotoCard)}>
      <TaskCard
        className="box-border h-full min-h-0 w-full min-w-0 cursor-grabbing opacity-95"
        developers={developers}
        isDragging
        isQATask={isEffectivelyQaTask(activeTask)}
        previewBorder={getPreviewBorderColor(
          resolvePaletteStatusKey(activeTask.originalStatus, activeTask.statusColorKey),
          isEffectivelyQaTask(activeTask)
        )}
        swimlaneBarDurationParts={activeTaskDuration ?? undefined}
        task={activeTask}
        variant="swimlane"
        widthPercent={swimlaneOverlayWidthPercent}
      />
    </div>
  );
}
