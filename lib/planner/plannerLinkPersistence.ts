import { parsePlannerCommentTaskId } from '@/lib/planner/plannerLinkEndpoint';

const COMMENT_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Заметка / фото / схема на планере (`comment:{uuid}` или сырой uuid комментария). */
export function isPlannerCommentLinkEndpoint(endpointId: string): boolean {
  const trimmed = endpointId.trim();
  if (!trimmed) {
    return false;
  }
  if (parsePlannerCommentTaskId(trimmed) != null) {
    return true;
  }
  return COMMENT_UUID_RE.test(trimmed);
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
