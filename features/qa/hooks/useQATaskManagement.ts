/**
 * Хук для управления QA задачами: размещение в swimlane, создание связей
 */

import type { Task, TaskLink, TaskPosition } from '@/types';
import type { Developer } from '@/types';

import { useCallback } from 'react';

import { getPartsPerDay } from '@/constants';
import { calculateOccupiedIntervals } from '@/features/task/utils/autoAssignTasks/utils/intervalUtils';
import { DELAYS } from '@/utils/constants';

import { calculateQATaskLinkAnchors, placeQaPhase } from '../utils/qaTaskPlacement';

interface UseQATaskManagementProps {
  filteredTaskLinks: TaskLink[];
  filteredTaskPositions: Map<string, TaskPosition>;
  selectedSprintId: number | null;
  sortedDevelopers: Developer[];
  /** Рабочие дни таймлайна спринта: QA-фаза не выходит за последний слот. */
  sprintTimelineWorkingDays: number;
  taskPositions: Map<string, TaskPosition>;
  saveLink: (link: TaskLink) => Promise<void>;
  /** Персист фазы QA (кнопка + на dev-карточке и др.) */
  savePosition?: (
    position: TaskPosition,
    isQa: boolean,
    devTaskKey?: string,
    immediate?: boolean
  ) => Promise<void>;
  setTaskLinks: (updater: (prev: TaskLink[]) => TaskLink[]) => void;
  setTaskPositions: (
    updater: (prev: Map<string, TaskPosition>) => Map<string, TaskPosition>,
    options?: { recordHistory?: boolean }
  ) => void;
  updateXarrow: () => void;
}

/**
 * Хук для управления QA задачами
 */
export function useQATaskManagement({
  taskPositions,
  filteredTaskPositions,
  filteredTaskLinks,
  sortedDevelopers,
  selectedSprintId,
  savePosition,
  sprintTimelineWorkingDays,
  setTaskPositions,
  setTaskLinks,
  saveLink,
  updateXarrow,
}: UseQATaskManagementProps) {
  const timelineTotalCells = Math.max(1, sprintTimelineWorkingDays) * getPartsPerDay();

  /** Ставит QA-фазу по `placeQaPhase`, сохраняет её (с историей) и связывает с dev. */
  const commitQaPhasePlacement = useCallback(
    (qaTask: Task, devTask: Task, devTaskPosition: TaskPosition, source: string): boolean => {
      const qaEngineerId = qaTask.assignee;
      if (!qaEngineerId) {
        console.warn('QA задача не имеет assignee', qaTask);
        return false;
      }
      if (taskPositions.has(qaTask.id)) {
        return false;
      }

      const laneIntervals =
        calculateOccupiedIntervals(filteredTaskPositions, [qaEngineerId]).get(qaEngineerId) ?? [];
      const qaTaskPosition = placeQaPhase({
        devPosition: devTaskPosition,
        laneIntervals,
        qaTask,
        totalCells: timelineTotalCells,
      });
      if (!qaTaskPosition) {
        console.warn('Нет свободного места для QA-фазы в спринте после dev', qaTask.id);
        return false;
      }

      setTaskPositions((prev) => {
        const newPositions = new Map(prev);
        newPositions.set(qaTask.id, qaTaskPosition);
        return newPositions;
      }, { recordHistory: true });

      if (selectedSprintId && savePosition) {
        const posWithSource = { ...qaTaskPosition, __source: source } as TaskPosition & {
          __source: string;
        };
        savePosition(posWithSource, true, devTask.id).catch((err) => {
          console.error('Error saving QA position:', err);
        });
      }

      const anchors = calculateQATaskLinkAnchors(
        devTask,
        devTaskPosition,
        qaTask,
        qaTaskPosition,
        sortedDevelopers
      );

      // Связь — после того как позиции обновятся
      setTimeout(() => {
        const existingLink = filteredTaskLinks.find(
          (link: TaskLink) => link.fromTaskId === devTask.id && link.toTaskId === qaTask.id
        );

        if (!existingLink) {
          const newLink: TaskLink = {
            id: `link-qa-${devTask.id}-${qaTask.id}-${Date.now()}`,
            fromTaskId: devTask.id,
            toTaskId: qaTask.id,
            fromAnchor: anchors.fromAnchor,
            toAnchor: anchors.toAnchor,
          };

          setTaskLinks((prev) => [...prev, newLink]);
          if (selectedSprintId) {
            saveLink(newLink).catch((error) => {
              console.error('Error saving link:', error);
            });
          }
        }

        updateXarrow();
      }, DELAYS.POSITIONING);

      return true;
    },
    [
      filteredTaskPositions,
      filteredTaskLinks,
      sortedDevelopers,
      selectedSprintId,
      taskPositions,
      timelineTotalCells,
      setTaskPositions,
      setTaskLinks,
      saveLink,
      savePosition,
      updateXarrow,
    ]
  );

  /**
   * Размещает QA-фазу после выбора qaEngineer в пикере (быстрое добавление QA).
   * false — исполнитель не на доске или места в спринте нет.
   */
  const placeQATaskAtNearestFreeSlot = useCallback(
    (qaTask: Task, devTask: Task, devTaskPosition: TaskPosition): boolean => {
      const qaEngineerId = qaTask.assignee;
      if (qaEngineerId && !sortedDevelopers.some((d) => d.id === qaEngineerId)) {
        console.warn('Исполнитель QA не в списке участников спринта', qaEngineerId);
        return false;
      }
      return commitQaPhasePlacement(
        qaTask,
        devTask,
        devTaskPosition,
        'useQATaskManagement.placeQATaskAtNearestFreeSlot'
      );
    },
    [commitQaPhasePlacement, sortedDevelopers]
  );

  /**
   * Размещает QA задачу из сайдбара в swimlane
   */
  const createQATask = useCallback(
    (devTaskId: string, qaTasksMap: Map<string, Task>, tasks: Task[]) => {
      const devTask = tasks.find((t) => t.id === devTaskId);
      if (!devTask) {
        return; // Нет задачи
      }

      // Находим QA задачу в qaTasksMap (она должна быть там, так как у задачи есть testPoints > 0)
      const qaTask = qaTasksMap.get(devTaskId);

      if (!qaTask) {
        console.warn('QA задача не найдена в qaTasksMap для задачи', devTaskId);
        return; // QA задача не найдена
      }

      // Проверяем, что QA задача еще не размещена (находится в сайдбаре)
      if (taskPositions.has(qaTask.id)) {
        return; // QA задача уже размещена
      }

      // Находим позицию задачи разработки
      const devTaskPosition = filteredTaskPositions.get(devTaskId);
      if (!devTaskPosition) {
        return; // Задача разработки не размещена
      }

      // Размещаем QA задачу в swimlane (она автоматически удалится из сайдбара)
      commitQaPhasePlacement(
        qaTask,
        devTask,
        devTaskPosition,
        'useQATaskManagement.createQATask'
      );
    },
    [taskPositions, filteredTaskPositions, commitQaPhasePlacement]
  );

  return {
    placeQATaskAtNearestFreeSlot,
    createQATask,
  };
}

