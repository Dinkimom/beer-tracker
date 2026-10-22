import type { Task } from '@/types';

export function planPatchPreviewElementId(taskId: string): string {
  return `plan-patch-preview-${taskId}`;
}

/** DOM id отрезка ghost-превью (как `task-…-seg-N` у реальных полос). */
export function planPatchPreviewSegmentHtmlAnchorId(taskId: string, segIdx: number): string {
  return segIdx > 0
    ? `${planPatchPreviewElementId(taskId)}-seg-${segIdx}`
    : planPatchPreviewElementId(taskId);
}

/** Ключ задачи из id карточки предложения (drag-контекст свимлейна), иначе null. */
export function parsePlanPatchPreviewElementId(elementId: string): string | null {
  const prefix = planPatchPreviewElementId('');
  if (!elementId.startsWith(prefix)) {
    return null;
  }
  const taskId = elementId.slice(prefix.length);
  return taskId.length > 0 ? taskId : null;
}

/** Ключ запроса карточки задачи из предложения, которой ещё нет в спринте. */
export function planPatchPreviewTaskQueryKey(taskId: string): readonly [string, string] {
  return ['plan-patch-preview-task', taskId];
}

export function taskForPlanPatchPreview(task: Task | undefined, taskId: string): Task {
  if (task) {
    return { ...task, pendingApproval: true };
  }
  return { id: taskId, link: '', name: taskId, pendingApproval: true, team: 'Web' };
}
