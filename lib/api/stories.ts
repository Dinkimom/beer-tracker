import type { Task } from '@/types';

import { getPlannerBeerTrackerApi } from '../plannerBeerTrackerApiOverride';

/**
 * Дочерние задачи и баги стори с доски (Tracker).
 */
export async function fetchStoryTasks(storyKey: string, boardId: number): Promise<Task[]> {
  const { data } = await getPlannerBeerTrackerApi().get<{ tasks: Task[] }>(
    `/stories/${encodeURIComponent(storyKey)}/tasks`,
    { params: { boardId } }
  );
  return data.tasks ?? [];
}
