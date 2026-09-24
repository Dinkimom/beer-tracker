import { mergeIssueTrackerQueueKeys } from '@/lib/issueTrackerProvider/storageAliases';

interface SyncQueueMenuOption {
  key: string;
  locked: boolean;
  name: string;
}

function rememberQueueName(
  names: Map<string, string>,
  row: { key: string; name: string }
): void {
  const key = row.key.trim();
  const name = row.name.trim();
  if (key && name) {
    names.set(key, name);
  }
}

function pushQueueOption(
  out: SyncQueueMenuOption[],
  seen: Set<string>,
  names: Map<string, string>,
  key: string,
  locked: boolean
): void {
  const trimmed = key.trim();
  if (!trimmed || seen.has(trimmed)) {
    return;
  }
  seen.add(trimmed);
  out.push({ key: trimmed, locked, name: names.get(trimmed) ?? trimmed });
}

export function buildSyncQueueMenuOptions(input: {
  catalog: readonly { key: string; name: string }[];
  extraKeys: readonly string[];
  query: string;
  searchHits: readonly { key: string; name: string }[];
  teamKeys: readonly string[];
}): SyncQueueMenuOption[] {
  const names = new Map<string, string>();
  for (const row of input.catalog) rememberQueueName(names, row);
  for (const row of input.searchHits) rememberQueueName(names, row);

  const out: SyncQueueMenuOption[] = [];
  const seen = new Set<string>();
  const teamKeySet = new Set(input.teamKeys.map((key) => key.trim()).filter(Boolean));
  for (const key of input.teamKeys) pushQueueOption(out, seen, names, key, true);
  for (const key of input.extraKeys) pushQueueOption(out, seen, names, key, false);

  const query = input.query.trim().toLowerCase();
  if (!query) {
    return out;
  }
  for (const row of [...input.searchHits, ...input.catalog]) {
    const key = row.key.trim();
    const name = names.get(key) ?? key;
    const matches = key.toLowerCase().includes(query) || name.toLowerCase().includes(query);
    if (matches) {
      pushQueueOption(out, seen, names, key, teamKeySet.has(key));
    }
  }
  return out;
}

export function toggleExtraSyncQueue(
  extraKeys: readonly string[],
  teamKeys: readonly string[],
  key: string
): readonly string[] {
  const trimmed = key.trim();
  const teamKeySet = new Set(teamKeys.map((teamKey) => teamKey.trim()));
  if (!trimmed || teamKeySet.has(trimmed)) {
    return extraKeys;
  }
  if (extraKeys.some((extraKey) => extraKey.trim() === trimmed)) {
    return extraKeys.filter((extraKey) => extraKey.trim() !== trimmed);
  }
  return [...extraKeys, trimmed];
}

export function syncQueuesTriggerLabel(
  teamKeys: readonly string[],
  extraKeys: readonly string[],
  emptyLabel: string,
  countLabel: (count: number) => string
): string {
  const keys = mergeIssueTrackerQueueKeys(teamKeys, extraKeys);
  if (keys.length === 0) {
    return emptyLabel;
  }
  if (keys.length <= 3) {
    return keys.join(', ');
  }
  return countLabel(keys.length);
}

export function syncQueueOptionLabel(option: Pick<SyncQueueMenuOption, 'key' | 'name'>): string {
  return option.name === option.key ? option.key : `${option.name} · ${option.key}`;
}
