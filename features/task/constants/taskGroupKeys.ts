/** Stable group keys for sidebar / invalid-tab grouping (not shown raw to users). */
export const TASK_GROUP_KEY_UNASSIGNED = '__task_group_unassigned__';
export const TASK_GROUP_KEY_NO_PARENT = '__task_group_no_parent__';

export function isTaskGroupSentinelKey(key: string): boolean {
  return (
    key === TASK_GROUP_KEY_UNASSIGNED ||
    key === TASK_GROUP_KEY_NO_PARENT ||
    key.startsWith(TASK_GROUP_KEY_UNASSIGNED) ||
    key.startsWith(TASK_GROUP_KEY_NO_PARENT)
  );
}
