import type { CustomSelectOption } from '@/components/CustomSelect';
import type { TaskParent } from '@/types';

import { optionMatchesQuery } from '@/components/CustomSelect';
import { formatTaskParentLabel } from '@/features/swimlane/utils/featureDraftParentLabel';
import { isFeatureLaneDraftRowId } from '@/lib/sprints/featureLanesDocument';

import { trimmedTaskParentToken } from './collectUniqueSprintParentTasks';

/** Есть ли совпадение в локальном списке родителей (тот же критерий, что у CustomSelect). */
export function hasLocalParentSelectMatch(
  options: readonly CustomSelectOption<string>[],
  query: string
): boolean {
  const trimmed = query.trim();
  if (!trimmed) {
    return true;
  }
  return options.some((option) => optionMatchesQuery(option, trimmed));
}

export function mergeParentSelectOptions(input: {
  activeRemoteKeys: readonly string[];
  baseOptions: readonly CustomSelectOption<string>[];
  parentKey: string;
  remoteByKey: ReadonlyMap<string, CustomSelectOption<string>>;
}): CustomSelectOption<string>[] {
  const { activeRemoteKeys, baseOptions, parentKey, remoteByKey } = input;
  const result = [...baseOptions];
  const seen = new Set(baseOptions.map((option) => option.value));

  for (const key of activeRemoteKeys) {
    if (seen.has(key)) {
      continue;
    }
    const remote = remoteByKey.get(key);
    if (!remote) {
      continue;
    }
    result.push(remote);
    seen.add(key);
  }

  if (parentKey && !seen.has(parentKey)) {
    const remote = remoteByKey.get(parentKey);
    if (remote) {
      result.push(remote);
    } else if (!isFeatureLaneDraftRowId(parentKey)) {
      result.push({ label: parentKey, value: parentKey });
    }
  }

  return result;
}

export function withCurrentQuickAddParentOption(
  options: readonly CustomSelectOption<string>[],
  parent: Pick<TaskParent, 'display' | 'id' | 'key'> | undefined,
  namesById?: ReadonlyMap<string, string>
): CustomSelectOption<string>[] {
  const key = trimmedTaskParentToken(parent?.key) || trimmedTaskParentToken(parent?.id);
  if (!parent || !key || options.some((option) => option.value === key)) {
    return [...options];
  }
  const label = formatTaskParentLabel(parent, namesById);
  if (!label) {
    return [...options];
  }
  return [...options, { label, value: key }];
}
