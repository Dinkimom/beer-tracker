/**
 * Алгоритм размещения dev задач
 */

import type { TimeInterval } from '../types';
import type { Task, TaskPosition, Developer } from '@/types';

import { PARTS_PER_DAY } from '@/constants';

import { getTaskPoints } from '../../taskUtils';
import { findNextAvailableCell } from '../utils/intervalUtils';

/**
 * Размещает dev задачи у назначенных разработчиков
 */
export function placeDevTasks(
  tasks: Task[],
  developers: Developer[],
  occupiedIntervals: Map<string, TimeInterval[]>,
  devWorkload: Map<string, number>,
  currentCell: number
): Map<string, TaskPosition> {
  const newPositions = new Map<string, TaskPosition>();

  tasks.forEach(task => {
    // Задача уже отфильтрована и имеет assignee
    const assigneeId = task.assignee!;

    // Находим участника-исполнителя
    const bestDeveloper = developers.find(dev => dev.id === assigneeId);

    if (!bestDeveloper) {
      return; // Исполнитель не найден в списке участников
    }

    const taskPoints = getTaskPoints(task);
    const taskDuration = taskPoints; // Длительность в частях дня = story points

    // Размещаем задачу у выбранного участника
    const intervals = occupiedIntervals.get(bestDeveloper.id) || [];
    const startCell = findNextAvailableCell(intervals, taskDuration, currentCell);

    // Проверяем, что задача поместится
    if (startCell === null) {
      return; // Задача не помещается в спринт
    }

    const startDay = Math.floor(startCell / PARTS_PER_DAY);
    const startPart = startCell % PARTS_PER_DAY;

    const position: TaskPosition = {
      taskId: task.id,
      assignee: bestDeveloper.id,
      startDay,
      startPart,
      duration: taskDuration,
      plannedStartDay: startDay,
      plannedStartPart: startPart,
      plannedDuration: taskDuration,
    };

    newPositions.set(task.id, position);

    // Обновляем нагрузку и занятые интервалы
    const currentLoad = devWorkload.get(bestDeveloper.id) || 0;
    devWorkload.set(bestDeveloper.id, currentLoad + taskPoints);
    intervals.push({ start: startCell, end: startCell + taskDuration });
    occupiedIntervals.set(bestDeveloper.id, intervals);
  });

  return newPositions;
}

