import type { SprintPresenceViewer } from './sprintRealtimeTypes';

import { STAFF_AUTHOR_DISPLAY_NAME_SQL } from '@/lib/comments/commentAuthor';
import { query } from '@/lib/db';
import { REGISTRY_UUID_STRING_RE } from '@/lib/registryUuidString';
import { STAFF_AVATAR_URL_SQL } from '@/lib/staffTeams/nativeTeamMembersSql';

interface PresenceViewerRow {
  avatar_url: string | null;
  display_name: string | null;
  user_id: string;
}

function fallbackPresenceDisplayName(userId: string): string {
  return userId.slice(0, 8) || 'user';
}

/** Identity without registry/DB — so SSE can open even when the Postgres pool is busy. */
export function sprintPresenceViewerFromUserId(userId: string): SprintPresenceViewer {
  return { avatarUrl: null, displayName: fallbackPresenceDisplayName(userId), userId };
}

function viewerFromRegistryRow(row: PresenceViewerRow, fallbackUserId: string): SprintPresenceViewer {
  const userId = row.user_id || fallbackUserId;
  return {
    avatarUrl: row.avatar_url?.trim() || null,
    displayName: row.display_name?.trim() || fallbackPresenceDisplayName(userId),
    userId,
  };
}

async function loadStaffPresenceRow(userId: string): Promise<PresenceViewerRow | null> {
  const result = await query<PresenceViewerRow>(
    `SELECT
       s.id::text AS user_id,
       ${STAFF_AUTHOR_DISPLAY_NAME_SQL} AS display_name,
       ${STAFF_AVATAR_URL_SQL} AS avatar_url
     FROM staff s
     WHERE s.id = $1::uuid
     LIMIT 1`,
    [userId]
  );
  return result.rows[0] ?? null;
}

/** Имя и аватар смотрящего доску из beer_tracker.staff. */
export async function resolveSprintPresenceViewer(userId: string): Promise<SprintPresenceViewer> {
  if (!REGISTRY_UUID_STRING_RE.test(userId)) {
    return sprintPresenceViewerFromUserId(userId);
  }
  try {
    const row = await loadStaffPresenceRow(userId);
    if (row) {
      return viewerFromRegistryRow(row, userId);
    }
    return sprintPresenceViewerFromUserId(userId);
  } catch {
    return sprintPresenceViewerFromUserId(userId);
  }
}
