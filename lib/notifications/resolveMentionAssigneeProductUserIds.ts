import { resolveAssigneeProductUserId } from '@/lib/notifications/resolveAssigneeProductUserId';

export async function resolveMentionAssigneeIdsToProductUserIds(
  organizationId: string,
  assigneeIds: readonly string[]
): Promise<string[]> {
  const uniqueAssigneeIds = [...new Set(assigneeIds.map((id) => id.trim()).filter(Boolean))];
  const resolved = await Promise.all(
    uniqueAssigneeIds.map((assigneeId) => resolveAssigneeProductUserId(organizationId, assigneeId))
  );
  return [...new Set(resolved.filter((userId): userId is string => Boolean(userId)))];
}
