import type { UserNotificationDto } from '@/lib/notifications/types';

import { STAFF_AUTHOR_DISPLAY_NAME_SQL } from '@/lib/comments/commentAuthor';
import { query } from '@/lib/db';
import { STAFF_AVATAR_URL_SQL } from '@/lib/staffTeams/nativeTeamMembersSql';

interface ActorRegistryRow {
  avatar_url: string | null;
  display_name: string | null;
  user_id: string;
}

export async function enrichNotificationsWithActors(
  notifications: UserNotificationDto[]
): Promise<UserNotificationDto[]> {
  const actorIds = [
    ...new Set(
      notifications.map((item) => item.actorUserId).filter((id): id is string => Boolean(id))
    ),
  ];

  if (actorIds.length === 0) {
    return notifications.map((item) => ({
      ...item,
      actorDisplayName: item.payload.actorName?.trim() || null,
      actorAvatarUrl: null,
    }));
  }

  const result = await query<ActorRegistryRow>(
    `SELECT
       s.id::text AS user_id,
       ${STAFF_AUTHOR_DISPLAY_NAME_SQL} AS display_name,
       ${STAFF_AVATAR_URL_SQL} AS avatar_url
     FROM staff s
     WHERE s.id = ANY($1::uuid[])`,
    [actorIds]
  );

  const actorsById = new Map(result.rows.map((row) => [row.user_id, row]));

  return notifications.map((item) => {
    if (!item.actorUserId) {
      return {
        ...item,
        actorDisplayName: item.payload.actorName?.trim() || null,
        actorAvatarUrl: null,
      };
    }

    const actor = actorsById.get(item.actorUserId);
    return {
      ...item,
      actorDisplayName:
        actor?.display_name?.trim() || item.payload.actorName?.trim() || null,
      actorAvatarUrl: actor?.avatar_url?.trim() || null,
    };
  });
}
