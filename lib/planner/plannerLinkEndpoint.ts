/** Board id for a sticky note / diagram / photo (`comment:{uuid}`). */
const PLANNER_COMMENT_TASK_ID_PREFIX = 'comment:';

const COMMENT_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function toPlannerCommentTaskId(commentId: string): string {
  if (commentId.startsWith(PLANNER_COMMENT_TASK_ID_PREFIX)) {
    return commentId;
  }
  return `${PLANNER_COMMENT_TASK_ID_PREFIX}${commentId}`;
}

export function parsePlannerCommentTaskId(taskId: string): string | null {
  if (!taskId.startsWith(PLANNER_COMMENT_TASK_ID_PREFIX)) {
    return null;
  }
  const id = taskId.slice(PLANNER_COMMENT_TASK_ID_PREFIX.length);
  return id.length > 0 ? id : null;
}

export function plannerLinkEndpointAliases(taskId: string): readonly string[] {
  const commentId = parsePlannerCommentTaskId(taskId);
  if (commentId) {
    return [taskId, commentId];
  }
  if (COMMENT_UUID_RE.test(taskId)) {
    return [taskId, toPlannerCommentTaskId(taskId)];
  }
  return [taskId];
}

/** Replace a stored endpoint when it matches `fromTaskId` or its comment alias. */
export function rewritePlannerLinkEndpoint(
  endpointId: string,
  fromTaskId: string,
  toTaskId: string
): string {
  return plannerLinkEndpointAliases(fromTaskId).includes(endpointId) ? toTaskId : endpointId;
}

/**
 * MCP/context notes expose raw UUIDs; the planner draws arrows from `comment:{uuid}` DOM nodes.
 * Rewrite a link endpoint when it matches a known comment id.
 */
export function resolvePlannerLinkEndpointId(
  taskId: string,
  commentIds: ReadonlySet<string>
): string {
  if (parsePlannerCommentTaskId(taskId) != null) {
    return taskId;
  }
  if (commentIds.has(taskId)) {
    return toPlannerCommentTaskId(taskId);
  }
  return taskId;
}

export function resolvePlannerLinkEndpoints<T extends { fromTaskId: string; toTaskId: string }>(
  link: T,
  commentIds: ReadonlySet<string>
): T {
  const fromTaskId = resolvePlannerLinkEndpointId(link.fromTaskId, commentIds);
  const toTaskId = resolvePlannerLinkEndpointId(link.toTaskId, commentIds);
  if (fromTaskId === link.fromTaskId && toTaskId === link.toTaskId) {
    return link;
  }
  return { ...link, fromTaskId, toTaskId };
}

export function commentIdSetFromRecords(
  comments: readonly { id: string }[]
): Set<string> {
  return new Set(comments.map((comment) => comment.id));
}
