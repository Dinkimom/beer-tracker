import type { StickyNoteCardRowLayout } from '@/features/task/utils/stickyNoteCardRowResizeHelpers';
import type { Comment, Task, TaskPosition } from '@/types';

import {
  buildSwimlaneCommentProjection,
  buildCommentCardRowById,
  filterPlannerCommentsByLayers,
  isPlannerAnnotationVisibleOnLayers,
  mergeSwimlaneCommentPositions,
  mergeSwimlaneCommentTasksMap,
} from '@/features/comments/utils/swimlaneCommentTaskBridge';

/** Данные одной дорожки: её задачи и заметки, позиции и раскладка карточек заметок. */
export interface SwimlaneLaneData {
  commentCardRowById: ReadonlyMap<string, StickyNoteCardRowLayout>;
  taskPositions: Map<string, TaskPosition>;
  tasks: Task[];
  tasksMap: Map<string, Task>;
}

/**
 * Данные дорожки зависят только от данных доски (задачи, заметки, видимость слоёв) —
 * наведение, drag и меню их не пересобирают, и `React.memo` дорожки не сбивается.
 */
export function buildSwimlaneLaneData(input: {
  annotationLayers: { imagesVisible: boolean; notesVisible: boolean };
  comments: Comment[];
  commentsVisible: boolean;
  developerId: string;
  taskPositions: Map<string, TaskPosition>;
  tasks: Task[];
  tasksMap: Map<string, Task>;
}): SwimlaneLaneData {
  const { annotationLayers } = input;
  const developerComments = input.commentsVisible
    ? filterPlannerCommentsByLayers(
        input.comments.filter((c) => (c.rowAssigneeId ?? c.assigneeId) === input.developerId),
        annotationLayers
      )
    : [];
  const commentProjection = buildSwimlaneCommentProjection(developerComments);
  const visibleAssigneeTasks = input.tasks.filter((task) =>
    isPlannerAnnotationVisibleOnLayers(task, annotationLayers)
  );
  return {
    commentCardRowById: buildCommentCardRowById(developerComments),
    taskPositions: mergeSwimlaneCommentPositions(input.taskPositions, commentProjection.positions),
    tasks: [...visibleAssigneeTasks, ...commentProjection.tasks],
    tasksMap: mergeSwimlaneCommentTasksMap(input.tasksMap, commentProjection.tasksMap),
  };
}

export function mergeSwimlanePositionsWithVisibleComments(input: {
  comments: Comment[];
  commentsVisible: boolean;
  swimlaneImagesVisible: boolean;
  swimlaneNotesVisible: boolean;
  taskPositions: Map<string, TaskPosition>;
}): Map<string, TaskPosition> {
  const annotationLayers = {
    imagesVisible: input.swimlaneImagesVisible,
    notesVisible: input.swimlaneNotesVisible,
  };
  const visibleComments = input.commentsVisible
    ? filterPlannerCommentsByLayers(input.comments, annotationLayers)
    : [];
  const commentProjection = buildSwimlaneCommentProjection(visibleComments);
  return mergeSwimlaneCommentPositions(input.taskPositions, commentProjection.positions);
}

export function resolveSwimlaneActiveTask(
  activeTaskId: string | null,
  allTasksForDrag: Task[]
): Task | null {
  if (!activeTaskId) return null;
  return allTasksForDrag.find((t) => t.id === activeTaskId) ?? null;
}
