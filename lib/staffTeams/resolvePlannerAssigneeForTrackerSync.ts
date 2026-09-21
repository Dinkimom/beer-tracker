import { query } from '@/lib/db';

import {
  applyResolvedStaffAssignees,
  indexDirectAssigneeId,
  registerStaffAssigneeKey,
} from './resolvePlannerAssigneeHelpers';

async function loadTrackerIdsByStaffUuids(
  organizationId: string,
  uuids: string[]
): Promise<Map<string, string>> {
  const res = await query<{
    email: string | null;
    id: string;
    tracker_user_id: string | null;
  }>(
    `SELECT id, tracker_user_id, email FROM staff WHERE organization_id = $1 AND id = ANY($2::uuid[])`,
    [organizationId, uuids]
  );
  const tidByStaffId = new Map<string, string>();
  for (const row of res.rows) {
    const trackerId = row.tracker_user_id?.trim() || row.email?.trim() || '';
    if (trackerId.length > 0) {
      tidByStaffId.set(row.id, trackerId);
    }
  }
  return tidByStaffId;
}

function collectStaffAssigneeKeys(
  assigneeIds: readonly string[],
  out: Map<string, string | null>
): Map<string, Set<string>> {
  const staffUuidToKeys = new Map<string, Set<string>>();
  for (const rawKey of assigneeIds) {
    const id = rawKey?.trim() ?? '';
    const indexed = indexDirectAssigneeId(out, rawKey, id);
    if (indexed.kind === 'staff' && indexed.uuid) {
      registerStaffAssigneeKey(staffUuidToKeys, indexed.uuid, rawKey);
    }
  }
  return staffUuidToKeys;
}

export async function resolvePlannerAssigneeIdsForTrackerSync(
  organizationId: string,
  assigneeIds: readonly string[]
): Promise<Map<string, string | null>> {
  const out = new Map<string, string | null>();
  const staffUuidToKeys = collectStaffAssigneeKeys(assigneeIds, out);
  if (staffUuidToKeys.size === 0) {
    return out;
  }
  const uuids = [...staffUuidToKeys.keys()];
  const tidByStaffId = await loadTrackerIdsByStaffUuids(organizationId, uuids);
  applyResolvedStaffAssignees(out, staffUuidToKeys, tidByStaffId, uuids);
  return out;
}

export async function resolvePlannerAssigneeIdForTrackerSync(
  organizationId: string,
  assigneeId: string
): Promise<string | null> {
  const map = await resolvePlannerAssigneeIdsForTrackerSync(organizationId, [assigneeId]);
  return map.get(assigneeId) ?? null;
}
