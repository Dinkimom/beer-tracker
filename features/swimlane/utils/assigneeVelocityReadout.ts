import type { AssigneeVelocityPoint } from '@/lib/sprints/assigneeVelocity';

export interface AssigneeVelocityReadout {
  points: number;
  unit: 'sp' | 'tp';
}

function pointsForUnit(entry: AssigneeVelocityPoint, unit: 'sp' | 'tp'): number | null {
  return unit === 'tp' ? entry.averageTp : entry.averageSp;
}

/**
 * В ячейке разработчика сначала SP, у тестировщика — TP.
 * Если этой оценки в истории нет, показываем другую: у QA часто закрываются story points.
 */
export function resolveAssigneeVelocityReadout(
  entry: AssigneeVelocityPoint | undefined,
  role: 'developer' | 'other' | 'tester' | undefined
): AssigneeVelocityReadout | null {
  if (!entry) return null;
  const primary = role === 'tester' ? 'tp' : 'sp';
  const secondary = primary === 'tp' ? 'sp' : 'tp';
  const primaryPoints = pointsForUnit(entry, primary);
  if (primaryPoints != null) return { points: primaryPoints, unit: primary };
  const secondaryPoints = pointsForUnit(entry, secondary);
  if (secondaryPoints != null) return { points: secondaryPoints, unit: secondary };
  return null;
}
