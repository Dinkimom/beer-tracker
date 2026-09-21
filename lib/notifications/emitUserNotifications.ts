import type { NotificationPayload } from '@/lib/notifications/types';

import { filterNotificationRecipientsBySprintPresence } from '@/lib/notifications/filterNotificationRecipientsBySprintPresence';
import { resolveAssigneeProductUserId } from '@/lib/notifications/resolveAssigneeProductUserId';
import { resolveMentionAssigneeIdsToProductUserIds } from '@/lib/notifications/resolveMentionAssigneeProductUserIds';
import { insertUserNotifications } from '@/lib/notifications/userNotificationsRepository';
import { resolveSprintPresenceViewer } from '@/lib/realtime/sprintPresenceViewer';

async function resolveActorDisplayName(actorUserId: string | null | undefined): Promise<string | undefined> {
  if (!actorUserId) {
    return undefined;
  }
  const viewer = await resolveSprintPresenceViewer(actorUserId);
  return viewer.displayName;
}

function excludeActorFromRecipients(
  recipientUserIds: readonly string[],
  actorUserId: string
): string[] {
  return [...new Set(recipientUserIds.filter((userId) => userId && userId !== actorUserId))];
}

export async function emitAssigneeChangedNotification(input: {
  actorUserId: string;
  assigneeId: string;
  assigneeName?: string;
  boardId?: number;
  organizationId: string;
  previousAssigneeId?: string | null;
  sprintId: number;
  taskId: string;
}): Promise<void> {
  if (input.previousAssigneeId != null && input.previousAssigneeId === input.assigneeId) {
    return;
  }

  const recipientUserId = await resolveAssigneeProductUserId(input.organizationId, input.assigneeId);
  if (!recipientUserId || recipientUserId === input.actorUserId) {
    return;
  }

  const recipientUserIds = await filterNotificationRecipientsBySprintPresence({
    organizationId: input.organizationId,
    recipientUserIds: [recipientUserId],
    sprintId: input.sprintId,
  });
  if (recipientUserIds.length === 0) {
    return;
  }

  const actorName = await resolveActorDisplayName(input.actorUserId);
  const payload: NotificationPayload = {
    boardId: input.boardId,
    taskId: input.taskId,
    sprintId: input.sprintId,
    assigneeName: input.assigneeName,
    actorName,
  };

  await insertUserNotifications({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    kind: 'assignee_changed',
    recipientUserIds,
    payload,
  });
}

export async function emitAvailabilityChangedNotification(input: {
  actorUserId: string;
  boardId: number;
  endDate: string;
  eventType: string;
  memberId: string;
  memberName: string;
  organizationId: string;
  recipientUserIds: string[];
  sprintId?: number;
  startDate: string;
}): Promise<void> {
  const recipientUserIds = excludeActorFromRecipients(input.recipientUserIds, input.actorUserId);
  if (recipientUserIds.length === 0) {
    return;
  }

  const filteredRecipientUserIds = await filterNotificationRecipientsBySprintPresence({
    organizationId: input.organizationId,
    recipientUserIds,
    sprintId: input.sprintId,
  });
  if (filteredRecipientUserIds.length === 0) {
    return;
  }

  const actorName = await resolveActorDisplayName(input.actorUserId);
  await insertUserNotifications({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    kind: 'availability_changed',
    recipientUserIds: filteredRecipientUserIds,
    payload: {
      boardId: input.boardId,
      sprintId: input.sprintId,
      eventType: input.eventType,
      memberName: input.memberName,
      startDate: input.startDate,
      endDate: input.endDate,
      actorName,
    },
  });
}

export async function emitSprintLifecycleNotification(input: {
  actorUserId: string;
  boardId: number | undefined;
  kind: 'sprint_finished' | 'sprint_started';
  organizationId: string;
  recipientUserIds: string[];
  sprintId: number;
  sprintName: string;
}): Promise<void> {
  const recipientUserIds = excludeActorFromRecipients(input.recipientUserIds, input.actorUserId);
  if (recipientUserIds.length === 0) {
    return;
  }

  const filteredRecipientUserIds = await filterNotificationRecipientsBySprintPresence({
    organizationId: input.organizationId,
    recipientUserIds,
    sprintId: input.sprintId,
  });
  if (filteredRecipientUserIds.length === 0) {
    return;
  }

  const actorName = await resolveActorDisplayName(input.actorUserId);
  await insertUserNotifications({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    kind: input.kind,
    recipientUserIds: filteredRecipientUserIds,
    payload: {
      boardId: input.boardId,
      sprintId: input.sprintId,
      sprintName: input.sprintName,
      actorName,
    },
  });
}

export async function emitCommentMentionNotifications(input: {
  actorUserId: string;
  boardId?: number;
  commentId: string;
  commentPreview: string;
  mentionAssigneeIds: readonly string[];
  organizationId: string;
  sprintId: number;
}): Promise<void> {
  if (input.mentionAssigneeIds.length === 0) {
    return;
  }

  const productUserIds = await resolveMentionAssigneeIdsToProductUserIds(
    input.organizationId,
    input.mentionAssigneeIds
  );
  const recipientUserIds = excludeActorFromRecipients(productUserIds, input.actorUserId);
  if (recipientUserIds.length === 0) {
    return;
  }

  const filteredRecipientUserIds = await filterNotificationRecipientsBySprintPresence({
    organizationId: input.organizationId,
    recipientUserIds,
    sprintId: input.sprintId,
  });
  if (filteredRecipientUserIds.length === 0) {
    return;
  }

  const actorName = await resolveActorDisplayName(input.actorUserId);
  await insertUserNotifications({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    kind: 'comment_mention',
    recipientUserIds: filteredRecipientUserIds,
    payload: {
      actorName,
      boardId: input.boardId,
      sprintId: input.sprintId,
      commentId: input.commentId,
      commentPreview: input.commentPreview,
    },
  });
}
