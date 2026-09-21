/**
 * Алгоритм размещения QA задач
 */

import type { TimeInterval } from '../types';
import type { Task, TaskPosition, TaskLink, Developer } from '@/types';

import { placeQaTaskForDevTask } from './qaTaskPlacementHelpers';

interface QATaskPlacementResult {
  links: TaskLink[];
  positions: Map<string, TaskPosition>;
}

/**
 * Размещает QA задачи для размещенных dev задач
 */
export function placeQATasks(
  devTasks: Array<{ task: Task; position: TaskPosition }>,
  qaTasksMap: Map<string, Task>,
  developers: Developer[],
  existingPositions: Map<string, TaskPosition>,
  existingLinks: TaskLink[],
  occupiedIntervals: Map<string, TimeInterval[]>,
  currentCell: number
): QATaskPlacementResult {
  const newPositions = new Map<string, TaskPosition>(existingPositions);
  const newLinks: TaskLink[] = [...existingLinks];

  devTasks.forEach(({ task: devTask, position: devPosition }) => {
    const qaTask = qaTasksMap.get(devTask.id);
    if (!qaTask) {
      return;
    }

    placeQaTaskForDevTask(
      devTask,
      devPosition,
      qaTask,
      developers,
      newPositions,
      newLinks,
      occupiedIntervals,
      currentCell
    );
  });

  return {
    positions: newPositions,
    links: newLinks,
  };
}
