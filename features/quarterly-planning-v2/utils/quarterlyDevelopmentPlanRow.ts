import type { Task } from '@/types';

export type QuarterlyDevelopmentPlanParentKind = 'epic' | 'story';

/**
 * Строка квартального плана, для которой доступен план разработки (эпик или стори).
 * В таблице только эпики (без parent) и стори (с parent или type story).
 */
export function getQuarterlyDevelopmentPlanParentKind(
  task: Pick<Task, 'parent' | 'type'>
): QuarterlyDevelopmentPlanParentKind | null {
  if (task.type === 'story' || task.parent != null) return 'story';
  if (task.parent == null) return 'epic';
  return null;
}

export function isQuarterlyPlannerDevelopmentPlanRow(
  task: Pick<Task, 'parent' | 'type'>
): boolean {
  return getQuarterlyDevelopmentPlanParentKind(task) != null;
}
