/**
 * Хук для управления состоянием задач и их мемоизации
 */

import type { Task, TaskPosition } from '@/types';

import { useMemo } from 'react';

import { createQATasksMap } from '@/features/qa/utils/qaTaskUtils';

interface UseTaskStateResult {
  allTasksForDrag: Task[];
  qaTasksByOriginalId: Map<string, Task>;
  qaTasksMap: Map<string, Task>;
  tasksByAssignee: Map<string, Task[]>;
  tasksMap: Map<string, Task>;
  unassignedTasks: Task[];
}

interface UseTaskStateProps {
  developers: Array<{ id: string }>;
  taskPositions: Map<string, TaskPosition>;
  tasks: Task[];
}

/**
 * Хук для управления состоянием задач
 */
export function useTaskState({ tasks, taskPositions, developers }: UseTaskStateProps): UseTaskStateResult {
  // Мемоизируем вычисления связанные с задачами
  const { qaTasksMap, allTasksForDrag, tasksMap, qaTasksByOriginalId } = useMemo(() => {
    // Создаем словарь QA задач
    const qaMap = createQATasksMap(tasks);

    // Массив всех QA задач для перетаскивания
    const qaTasksArray = Array.from(qaMap.values());

    // Объединяем обычные задачи и QA задачи для перетаскивания
    const allTasks = [...tasks, ...qaTasksArray];

    // Создаем Map для быстрого доступа к задачам по ID
    const tasksMapResult = new Map<string, Task>();
    allTasks.forEach((task) => {
      tasksMapResult.set(task.id, task);
    });

    // Создаем Map для быстрого доступа к QA задачам по originalTaskId
    const qaByOriginalId = new Map<string, Task>();
    qaTasksArray.forEach((qaTask) => {
      if (qaTask.originalTaskId) {
        qaByOriginalId.set(qaTask.originalTaskId, qaTask);
      }
    });

    return {
      qaTasksMap: qaMap,
      allTasksForDrag: allTasks,
      tasksMap: tasksMapResult,
      qaTasksByOriginalId: qaByOriginalId,
    };
  }, [tasks]);

  // taskPositions — тот же observable.map (стабильная ссылка); при переносе карточки мутирует на месте.
  // useMemo([..., taskPositions]) не пересчитывался — группировка и unassigned оставались со старыми assignee.
  const unassignedTasks = allTasksForDrag.filter((task) => !taskPositions.has(task.id));

  const tasksByAssignee = new Map<string, Task[]>();

  developers.forEach((dev) => {
    tasksByAssignee.set(dev.id, []);
  });

  allTasksForDrag.forEach((task) => {
    const position = taskPositions.get(task.id);
    const assigneeId = position?.assignee || 'unassigned';
    if (!tasksByAssignee.has(assigneeId)) {
      tasksByAssignee.set(assigneeId, []);
    }
    const bucket = tasksByAssignee.get(assigneeId);
    if (bucket) {
      bucket.push(task);
    }
  });

  return {
    qaTasksMap,
    allTasksForDrag,
    tasksMap,
    qaTasksByOriginalId,
    unassignedTasks,
    tasksByAssignee,
  };
}

