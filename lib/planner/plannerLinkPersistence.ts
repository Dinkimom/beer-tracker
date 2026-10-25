import { parsePlannerCommentTaskId, PLANNER_COMMENT_UUID_RE } from '@/lib/planner/plannerCardKind';

/** Заметка / фото / схема на планере (`comment:{uuid}` или сырой uuid комментария). */
export function isPlannerCommentLinkEndpoint(endpointId: string): boolean {
  const trimmed = endpointId.trim();
  if (!trimmed) {
    return false;
  }
  if (parsePlannerCommentTaskId(trimmed) != null) {
    return true;
  }
  return PLANNER_COMMENT_UUID_RE.test(trimmed);
}

/**
 * Локально в `task_links` храним только связи с участием заметки/фото/схемы.
 * Чистый task↔task — только из Tracker, не в Postgres.
 */
export function plannerLinkInvolvesComment(fromTaskId: string, toTaskId: string): boolean {
  return (
    isPlannerCommentLinkEndpoint(fromTaskId) || isPlannerCommentLinkEndpoint(toTaskId)
  );
}

export function isTaskToTaskLink(fromTaskId: string, toTaskId: string): boolean {
  return !plannerLinkInvolvesComment(fromTaskId, toTaskId);
}
