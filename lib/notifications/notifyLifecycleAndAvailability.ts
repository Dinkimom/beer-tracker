import {
  emitAvailabilityChangedNotification,
  emitSprintLifecycleNotification,
} from '@/lib/notifications/emitUserNotifications';
import { fireAndForgetNotification } from '@/lib/notifications/fireAndForgetNotification';
import { listBoardTeamRecipientUserIds } from '@/lib/notifications/listBoardTeamRecipientUserIds';

export function notifySprintLifecycleIfNeeded(input: {
  actorUserId: string;
  boardId: number | undefined;
  organizationId: string;
  sprintId: number;
  sprintName: string;
  status: 'archived' | 'draft' | 'in_progress' | 'released';
}): void {
  if (input.boardId == null) {
    return;
  }
  if (input.status !== 'in_progress' && input.status !== 'archived') {
    return;
  }

  const kind = input.status === 'in_progress' ? 'sprint_started' : 'sprint_finished';

  fireAndForgetNotification(async () => {
    const recipientUserIds = await listBoardTeamRecipientUserIds({
      boardId: input.boardId!,
      organizationId: input.organizationId,
    });
    await emitSprintLifecycleNotification({
      actorUserId: input.actorUserId,
      boardId: input.boardId,
      kind,
      organizationId: input.organizationId,
      recipientUserIds,
      sprintId: input.sprintId,
      sprintName: input.sprintName,
    });
  }, '[notifySprintLifecycleIfNeeded]');
}

export function notifyAvailabilityChangedIfNeeded(input: {
  actorUserId: string;
  boardId: number;
  endDate: string;
  eventType: string;
  memberId: string;
  memberName: string;
  organizationId: string;
  sprintId?: number;
  startDate: string;
}): void {
  fireAndForgetNotification(async () => {
    const recipientUserIds = await listBoardTeamRecipientUserIds({
      boardId: input.boardId,
      organizationId: input.organizationId,
    });
    await emitAvailabilityChangedNotification({
      actorUserId: input.actorUserId,
      boardId: input.boardId,
      endDate: input.endDate,
      eventType: input.eventType,
      memberId: input.memberId,
      memberName: input.memberName,
      organizationId: input.organizationId,
      recipientUserIds,
      sprintId: input.sprintId,
      startDate: input.startDate,
    });
  }, '[notifyAvailabilityChangedIfNeeded]');
}
