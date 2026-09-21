import type { Task } from '@/types';

import { getTaskPoints, isTaskCompleted } from '../../taskUtils';

const PRIORITY_VALUES: Record<string, number> = {
  blocker: 10,
  p1: 10,
  critical: 8,
  urgent: 8,
  high: 8,
  major: 8,
  p2: 8,
  medium: 5,
  normal: 5,
  p3: 5,
  'не указан': 5,
  low: 2,
  minor: 2,
  p4: 2,
  trivial: 1,
  p5: 1,
};

function getPriorityValue(priority?: string): number {
  if (!priority) return 0;
  return PRIORITY_VALUES[priority.toLowerCase()] ?? 0;
}

export function isTaskEligibleForAutoAssign(
  task: Task,
  existingPositions: Map<string, unknown>
): boolean {
  if (task.team === 'QA') return false;
  if (existingPositions.has(task.id)) return false;
  if (!task.assignee) return false;
  if (isTaskCompleted(task)) return false;

  return (
    task.storyPoints !== undefined &&
    task.storyPoints !== null &&
    typeof task.storyPoints === 'number' &&
    task.storyPoints > 0
  );
}

export function compareTasksByPriorityAndSize(a: Task, b: Task): number {
  const priorityDiff = getPriorityValue(b.priority) - getPriorityValue(a.priority);
  if (priorityDiff !== 0) return priorityDiff;
  return getTaskPoints(b) - getTaskPoints(a);
}
