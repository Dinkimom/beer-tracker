import {
  TASK_GROUP_KEY_NO_PARENT,
  TASK_GROUP_KEY_UNASSIGNED,
} from '@/features/task/constants/taskGroupKeys';

type TranslateFn = (k: string, p?: Record<string, number | string>) => string;

/**
 * Convert internal grouping sentinel keys to localized labels for UI headers.
 * Supports legacy/suffixed sentinel values (e.g. "__task_group_unassigned__3").
 */
export function formatTaskGroupLabel(groupKey: string, t: TranslateFn): string {
  if (groupKey.startsWith(TASK_GROUP_KEY_UNASSIGNED)) {
    return t('task.grouping.unassigned');
  }
  if (groupKey.startsWith(TASK_GROUP_KEY_NO_PARENT)) {
    return t('task.grouping.noParent');
  }
  return groupKey;
}
