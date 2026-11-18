import type { Task } from '@/types';

import { sumTaskListPoints } from '@/lib/pointsUtils';

/** Итоги колонки — единые правила pointsUtils (фантом QA: SP 0, TP без дубля оригинала). */
export function computeKanbanColumnTaskTotals(filtered: Task[]): { totalSp: number; totalTp: number } {
  const { totalSP, totalTP } = sumTaskListPoints(filtered);
  return { totalSp: totalSP, totalTp: totalTP };
}
