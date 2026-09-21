import type { Task } from '@/types';

import {
  computeBurndownTilesFromTasks,
  type BurndownTilesFromTasks,
} from '@/features/sprint/utils/sprintMetrics';

/** SP/TP и % сделано по дочерним задачам эпика (как на бёрндауне / в метриках спринта). */
export function computeEpicBurndownTiles(childTasks: Task[]): BurndownTilesFromTasks {
  return computeBurndownTilesFromTasks(childTasks);
}
