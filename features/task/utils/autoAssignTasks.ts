/**
 * Автоматическая расстановка задач в спринте
 */

import type { AutoAssignResult } from './autoAssignTasks/types';
import type { Task, TaskPosition, Developer, TaskLink } from '@/types';

import { placeDevTasks } from './autoAssignTasks/algorithms/devTaskPlacement';
import { placeQATasks } from './autoAssignTasks/algorithms/qaTaskPlacement';
import { calculateOccupiedIntervals } from './autoAssignTasks/utils/intervalUtils';
import { filterUnassignedTasks, sortTasksByPriorityAndSize } from './autoAssignTasks/utils/taskUtils';
import { calculateWorkload } from './autoAssignTasks/utils/workloadUtils';

/**
 * Автоматически распределяет задачи между участниками
 * Алгоритм: для каждой задачи размещает её у указанного исполнителя, начиная с текущего времени спринта
 * Также размещает QA задачи и создает связи между dev и QA задачами
 */
export function autoAssignTasks(
  tasks: Task[],
  developers: Developer[],
  existingPositions: Map<string, TaskPosition>,
  qaTasksMap: Map<string, Task>, // Словарь QA задач: ключ - оригинальный ID dev задачи
  existingLinks: TaskLink[], // Существующие связи
  currentCell: number = 0 // Текущая позиция в спринте (в ячейках)
): AutoAssignResult {
  const newPositions = new Map<string, TaskPosition>(existingPositions);

  // Получаем неназначенные задачи
  const unassignedTasks = filterUnassignedTasks(tasks, newPositions);

  if (unassignedTasks.length === 0) {
    return {
      positions: newPositions,
      links: [...existingLinks],
    };
  }

  // Вычисляем текущую нагрузку каждого участника
  const { devWorkload } = calculateWorkload(tasks, newPositions, developers);

  // Вычисляем занятые интервалы для каждого участника
  const occupiedIntervals = calculateOccupiedIntervals(
    newPositions,
    developers.map(d => d.id)
  );

  // Сортируем задачи: сначала по приоритету, затем по размеру
  const sortedTasks = sortTasksByPriorityAndSize(unassignedTasks);

  // Размещаем dev задачи
  const devTaskPositions = placeDevTasks(
    sortedTasks,
    developers,
    occupiedIntervals,
    devWorkload,
    currentCell
  );

  // Объединяем новые позиции dev задач с существующими
  devTaskPositions.forEach((position, taskId) => {
    newPositions.set(taskId, position);
  });

  // Находим все размещенные dev задачи с testPoints > 0
  const placedDevTasks = Array.from(newPositions.entries())
    .map(([taskId, position]) => {
      const task = tasks.find(t => t.id === taskId);
      return task && task.team !== 'QA' && task.testPoints !== undefined && task.testPoints > 0
        ? { task, position }
        : null;
    })
    .filter((item): item is { position: TaskPosition; task: Task } => item !== null);

  // Размещаем QA задачи
  const qaResult = placeQATasks(
    placedDevTasks,
    qaTasksMap,
    developers,
    newPositions,
    existingLinks,
    occupiedIntervals,
    currentCell
  );

  return {
    positions: qaResult.positions,
    links: qaResult.links,
  };
}

// Экспортируем типы для удобства
