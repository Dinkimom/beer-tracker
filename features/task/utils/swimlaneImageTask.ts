import type { Task } from '@/types';

const SWIMLANE_IMAGE_TASK_ID_PREFIX = 'local-image:' as const;

export function toSwimlaneImageTaskId(imageId: string): string {
  return `${SWIMLANE_IMAGE_TASK_ID_PREFIX}${imageId}`;
}

export function parseSwimlaneImageTaskId(taskId: string): string | null {
  if (!taskId.startsWith(SWIMLANE_IMAGE_TASK_ID_PREFIX)) {
    return null;
  }
  const id = taskId.slice(SWIMLANE_IMAGE_TASK_ID_PREFIX.length);
  return id.length > 0 ? id : null;
}

export function isSwimlaneImageTaskId(taskId: string): boolean {
  return parseSwimlaneImageTaskId(taskId) != null;
}

export function isSwimlaneImageTask(task: Pick<Task, 'id' | 'localDraftKind'>): boolean {
  return task.localDraftKind === 'image' || isSwimlaneImageTaskId(task.id);
}

/** Заметка или картинка на таймлайне — не работа из Tracker. */
export function isPlannerAnnotationTask(
  task: Pick<Task, 'id' | 'isLocalTask' | 'localDraftKind'>
): boolean {
  if (task.isLocalTask === true) {
    return true;
  }
  if (
    task.localDraftKind === 'comment' ||
    task.localDraftKind === 'diagram' ||
    task.localDraftKind === 'image'
  ) {
    return true;
  }
  return isSwimlaneImageTaskId(task.id);
}
