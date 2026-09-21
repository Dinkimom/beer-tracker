import { STAFF_SWIMLANE_ASSIGNEE_PREFIX } from '@/lib/teamMemberUtils';

export function indexDirectAssigneeId(
  out: Map<string, string | null>,
  rawKey: string,
  id: string
): { kind: 'direct' | 'empty' | 'staff'; uuid?: string } {
  if (!id) {
    out.set(rawKey, null);
    return { kind: 'empty' };
  }
  if (!id.startsWith(STAFF_SWIMLANE_ASSIGNEE_PREFIX)) {
    out.set(rawKey, id);
    return { kind: 'direct' };
  }
  const uuid = id.slice(STAFF_SWIMLANE_ASSIGNEE_PREFIX.length).trim();
  if (!uuid) {
    out.set(rawKey, null);
    return { kind: 'empty' };
  }
  return { kind: 'staff', uuid };
}

export function registerStaffAssigneeKey(
  staffUuidToKeys: Map<string, Set<string>>,
  uuid: string,
  rawKey: string
): void {
  let keys = staffUuidToKeys.get(uuid);
  if (!keys) {
    keys = new Set();
    staffUuidToKeys.set(uuid, keys);
  }
  keys.add(rawKey);
}

export function applyResolvedStaffAssignees(
  out: Map<string, string | null>,
  staffUuidToKeys: Map<string, Set<string>>,
  tidByStaffId: Map<string, string>,
  uuids: string[]
): void {
  for (const uuid of uuids) {
    const keys = staffUuidToKeys.get(uuid);
    if (!keys) {
      continue;
    }
    const resolved = tidByStaffId.get(uuid) ?? null;
    for (const key of keys) {
      out.set(key, resolved);
    }
  }
}
