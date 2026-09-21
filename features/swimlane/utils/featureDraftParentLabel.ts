import type { TaskParent } from '@/types';

import { isFeatureLaneDraftRowId } from '@/lib/sprints/featureLanesDocument';

function trimmedParentField(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function isRawFeatureDraftParentLabel(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length > 0 && isFeatureLaneDraftRowId(trimmed);
}

export function humanFeatureDraftParentDisplay(
  display: string,
  key: string
): string {
  const trimmed = display.trim();
  if (!trimmed || trimmed === key || isRawFeatureDraftParentLabel(trimmed)) {
    return '';
  }
  return trimmed;
}

function resolveFeatureDraftParentKey(parent: Pick<TaskParent, 'id' | 'key'>): string {
  return trimmedParentField(parent.key) || trimmedParentField(parent.id);
}

export function resolveFeatureDraftParentLabel(
  parent: Pick<TaskParent, 'display' | 'id' | 'key'>,
  namesById?: ReadonlyMap<string, string>
): string {
  const key = resolveFeatureDraftParentKey(parent);
  const display = trimmedParentField(parent.display);
  const isDraft =
    isFeatureLaneDraftRowId(key) || isFeatureLaneDraftRowId(trimmedParentField(parent.id));
  if (!isDraft) {
    return display || key;
  }
  const fromParent = humanFeatureDraftParentDisplay(display, key);
  if (fromParent) {
    return fromParent;
  }
  const fromName = (key && namesById?.get(key)?.trim()) || '';
  return humanFeatureDraftParentDisplay(fromName, key);
}

export function buildFeatureDraftRowNamesById(
  draftRows: readonly { id: string; name: string }[]
): Map<string, string> {
  const names = new Map<string, string>();
  for (const row of draftRows) {
    const id = row.id.trim();
    const name = humanFeatureDraftParentDisplay(row.name, id);
    if (!isFeatureLaneDraftRowId(id) || !name) {
      continue;
    }
    names.set(id, name);
  }
  return names;
}
