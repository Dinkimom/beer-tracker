import type { NotificationKind, NotificationPayload } from '@/lib/notifications/types';

import { resolveNotificationFocusTaskId } from '@/features/notifications/utils/resolveNotificationFocusTaskId';
import {
  appendPlannerFocusTaskQuery,
  buildPlannerPath,
} from '@/lib/planner/plannerUrl';

/** Канонический путь в планер, если в payload есть boardId и sprintId. */
export function resolveNotificationPlannerHref(
  payload: NotificationPayload,
  kind?: NotificationKind
): string | null {
  const boardId = payload.boardId;
  const sprintId = payload.sprintId;
  if (boardId == null || sprintId == null) {
    return null;
  }
  const basePath = buildPlannerPath(boardId, sprintId);
  if (!kind) {
    return basePath;
  }
  const focusTaskId = resolveNotificationFocusTaskId(kind, payload);
  if (!focusTaskId) {
    return basePath;
  }
  return appendPlannerFocusTaskQuery(basePath, focusTaskId);
}
