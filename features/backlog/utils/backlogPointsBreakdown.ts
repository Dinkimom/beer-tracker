import type { Task } from '@/types';
import type { TaskStatus } from '@/utils/statusMapper';

import { getTaskStoryPoints, getTaskTestPoints, isOriginalTask } from '@/lib/pointsUtils';
import { mapStatus } from '@/utils/statusMapper';

export interface PointsBreakdownBuckets {
  done: number;
  progress: number;
  todo: number;
}

interface PointsBreakdown {
  sp: PointsBreakdownBuckets;
  tp: PointsBreakdownBuckets;
}

const EMPTY_BUCKETS = (): PointsBreakdownBuckets => ({ done: 0, progress: 0, todo: 0 });

function pointBucket(task: Task): keyof PointsBreakdownBuckets {
  const status: TaskStatus = task.status ?? mapStatus(task.originalStatus || '') ?? 'todo';
  if (status === 'done') return 'done';
  if (status === 'in-progress' || status === 'paused') return 'progress';
  return 'todo';
}

/** Стори- и тест-поинты спринта по трём состояниям: к выполнению, в работе, готово. */
export function summarizeBacklogPoints(tasks: readonly Task[]): PointsBreakdown {
  const sp = EMPTY_BUCKETS();
  const tp = EMPTY_BUCKETS();

  for (const task of tasks) {
    if (!isOriginalTask(task)) continue;
    const bucket = pointBucket(task);
    sp[bucket] += getTaskStoryPoints(task);
    tp[bucket] += getTaskTestPoints(task);
  }

  return { sp, tp };
}
