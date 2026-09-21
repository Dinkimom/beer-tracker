import type { FlattenedRow } from '@/features/sprint/components/SprintPlanner/occupancy/utils/buildFlattenedRows';
import type { Task } from '@/types';

/** Плоский список строк задач без группировки по родителю/эпику. */
export function buildQuarterlyFlatRows(tasks: Task[]): FlattenedRow[] {
  return [...tasks]
    .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))
    .map((task) => ({ type: 'task' as const, task }));
}
