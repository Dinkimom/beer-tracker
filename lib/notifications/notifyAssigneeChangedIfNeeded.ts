import { emitAssigneeChangedNotification } from '@/lib/notifications/emitUserNotifications';
import { fireAndForgetNotification } from '@/lib/notifications/fireAndForgetNotification';

/** Fire-and-forget: не блокирует ответ API при ошибке записи уведомления. */
export function notifyAssigneeChangedIfNeeded(input: {
  actorUserId: string;
  assigneeId: string | null | undefined;
  organizationId: string;
  previousAssigneeId?: string | null;
  resolveBoardId?: () => Promise<number | undefined>;
  sprintId: number;
  taskId: string;
}): void {
  const assigneeId = input.assigneeId?.trim();
  if (!assigneeId) {
    return;
  }

  fireAndForgetNotification(async () => {
    const boardId = input.resolveBoardId ? await input.resolveBoardId() : undefined;
    await emitAssigneeChangedNotification({
      actorUserId: input.actorUserId,
      assigneeId,
      boardId,
      organizationId: input.organizationId,
      previousAssigneeId: input.previousAssigneeId,
      sprintId: input.sprintId,
      taskId: input.taskId,
    });
  }, '[notifyAssigneeChangedIfNeeded]');
}
