/**
 * Утилиты для вычисления нагрузки разработчиков
 */

import type { Task, TaskPosition, Developer } from '@/types';

import { getTaskPoints } from '../../taskUtils';

/**
 * Вычисляет текущую нагрузку каждого разработчика
 * Для обычных задач - story points, для QA задач - test points
 */
export function calculateWorkload(
  tasks: Task[],
  positions: Map<string, TaskPosition>,
  developers: Developer[]
): {
  devWorkload: Map<string, number>;
  qaWorkload: Map<string, number>;
} {
  const devWorkload = new Map<string, number>();
  const qaWorkload = new Map<string, number>();

  developers.forEach(dev => {
    devWorkload.set(dev.id, 0);
    qaWorkload.set(dev.id, 0);
  });

  // Считаем текущую нагрузку из существующих позиций
  positions.forEach((position, taskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (task && position.assignee) {
      const taskPoints = getTaskPoints(task);
      if (task.team === 'QA') {
        const currentLoad = qaWorkload.get(position.assignee) || 0;
        qaWorkload.set(position.assignee, currentLoad + taskPoints);
      } else {
        const currentLoad = devWorkload.get(position.assignee) || 0;
        devWorkload.set(position.assignee, currentLoad + taskPoints);
      }
    }
  });

  return { devWorkload, qaWorkload };
}

