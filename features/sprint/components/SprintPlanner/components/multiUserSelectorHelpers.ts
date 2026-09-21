import type { RegistryUserItem } from '@/lib/beerTrackerApi';

/** Form state for multi-user transition fields: comma-separated tracker ids. */
export function encodeMultiUserFieldValue(trackerIds: string[]): string {
  return trackerIds.filter((id) => id.trim()).join(',');
}

export function decodeMultiUserFieldValue(value: string): string[] {
  if (!value.trim()) return [];
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const part of value.split(',')) {
    const id = part.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

export function toggleMultiUserSelection(
  selectedIds: string[],
  trackerId: string
): string[] {
  if (selectedIds.includes(trackerId)) {
    return selectedIds.filter((id) => id !== trackerId);
  }
  return [...selectedIds, trackerId];
}

export function mergeLoadedMultiUsers(
  previous: RegistryUserItem[],
  loaded: Array<RegistryUserItem | null | undefined>,
  selectedIds: string[]
): RegistryUserItem[] {
  const byId = new Map(previous.map((u) => [u.trackerId, u]));
  for (const user of loaded) {
    if (user) byId.set(user.trackerId, user);
  }
  return selectedIds
    .map((id) => byId.get(id))
    .filter((u): u is RegistryUserItem => Boolean(u));
}
