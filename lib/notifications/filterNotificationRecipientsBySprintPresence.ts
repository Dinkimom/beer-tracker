import { listSprintPresenceUserIds } from '@/lib/realtime/sprintPresence';

/** Оставляет получателей offline по SSE presence спринта (online уже видят изменения на доске). */
export async function filterNotificationRecipientsBySprintPresence(input: {
  organizationId: string;
  recipientUserIds: string[];
  sprintId?: number;
}): Promise<string[]> {
  const uniqueRecipients = [...new Set(input.recipientUserIds.filter(Boolean))];
  if (uniqueRecipients.length === 0) {
    return [];
  }
  if (input.sprintId == null) {
    return uniqueRecipients;
  }

  const activeUserIds = await listSprintPresenceUserIds(input.organizationId, input.sprintId);
  const activeSet = new Set(activeUserIds);

  return uniqueRecipients.filter((userId) => !activeSet.has(userId));
}
