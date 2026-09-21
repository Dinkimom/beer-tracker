/**
 * Хук для управления QA задачами: размещение в swimlane, создание связей
 */

import type { Task, TaskLink, TaskPosition } from '@/types';
import type { Developer } from '@/types';

import { useCallback } from 'react';

import { PARTS_PER_DAY } from '@/constants';
import {
  calculateOccupiedIntervals,
  findQATaskPlacement,
} from '@/features/task/utils/autoAssignTasks/utils/intervalUtils';
import { getTaskPoints } from '@/features/task/utils/taskUtils';
import { storyPointsToTimeslots } from '@/lib/pointsUtils';
import { DELAYS } from '@/utils/constants';

import { calculateQATaskPosition, calculateQATaskLinkAnchors } from '../utils/qaTaskPlacement';

interface UseQATaskManagementProps {
  allTasksForDrag: Task[];
  filteredTaskLinks: TaskLink[];
  filteredTaskPositions: Map<string, TaskPosition>;
  selectedSprintId: number | null;
  sortedDevelopers: Developer[];
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
  setTaskPositions: (updater: (prev: Map<string, TaskPosition>) => Map<string, TaskPosition>) => void;
  updateXarrow: () => void;
}

/**
 * Хук для управления QA задачами
 */
export function useQATaskManagement({
  taskPositions,
  filteredTaskPositions,
  filteredTaskLinks,
  allTasksForDrag,
  sortedDevelopers,
  selectedSprintId,
  savePosition,
  setTaskPositions,
  setTaskLinks,
  saveLink,
  updateXarrow,
}: UseQATaskManagementProps) {
  /**
   * Размещает QA-фазу в ближайшем свободном слоте строки выбранного QA (от начала спринта).
   * Используется при быстром добавлении QA после выбора qaEngineer в пикере.
   */
  const placeQATaskAtNearestFreeSlot = useCallback(
    (qaTask: Task, devTask: Task, devTaskPosition: TaskPosition): boolean => {
      const qaEngineerId = qaTask.assignee;
      if (!qaEngineerId) {
        console.warn('QA задача не имеет assignee', qaTask);
        return false;
      }

      if (taskPositions.has(qaTask.id)) {
        return false;
      }

      const developerIds = sortedDevelopers.map((d) => d.id);
      if (!developerIds.includes(qaEngineerId)) {
        console.warn('Исполнитель QA не в списке участников спринта', qaEngineerId);
        return false;
      }

      const duration = Math.max(1, storyPointsToTimeslots(getTaskPoints(qaTask)));
      const devTaskEndCell =
        devTaskPosition.startDay * PARTS_PER_DAY +
        devTaskPosition.startPart +
        devTaskPosition.duration;

      const occupiedIntervals = calculateOccupiedIntervals(filteredTaskPositions, developerIds);
      const intervals = occupiedIntervals.get(qaEngineerId) ?? [];
      // Не раньше окончания dev-карточки на таймлайне (учёт длительности разработки)
      const startCell = findQATaskPlacement(intervals, duration, devTaskEndCell);
      if (startCell === null) {
        console.warn('Нет свободного места для QA-фазы у выбранного исполнителя после dev', qaTask.id);
        return false;
      }

      const startDay = Math.floor(startCell / PARTS_PER_DAY);
      const startPart = startCell % PARTS_PER_DAY;

      const qaTaskPosition: TaskPosition = {
        taskId: qaTask.id,
        assignee: qaEngineerId,
        startDay,
        startPart,
        duration,
        plannedStartDay: startDay,
        plannedStartPart: startPart,
        plannedDuration: duration,
      };

      setTaskPositions((prev) => {
        const newPositions = new Map(prev);
        newPositions.set(qaTask.id, qaTaskPosition);
        return newPositions;
      });

      if (selectedSprintId && savePosition) {
        const posWithSource = {
          ...qaTaskPosition,
          __source: 'useQATaskManagement.placeQATaskAtNearestFreeSlot',
        } as TaskPosition & { __source: string };
        savePosition(posWithSource, true, devTask.id).catch((err) => {
          console.error('Error saving QA position (nearest free slot):', err);
        });
      }

      const anchors = calculateQATaskLinkAnchors(
        devTask,
        devTaskPosition,
        qaTask,
        qaTaskPosition,
        sortedDevelopers
      );

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
      sortedDevelopers,
      selectedSprintId,
      taskPositions,
      setTaskPositions,
      setTaskLinks,
      saveLink,
      savePosition,
      updateXarrow,
      filteredTaskLinks,
    ]
  );

  /**
   * Размещает QA задачу в swimlane
   */
  const placeQATaskInSwimlane = useCallback(
    (qaTask: Task, devTask: Task, devTaskPosition: TaskPosition) => {
      const qaEngineerId = qaTask.assignee;
      if (!qaEngineerId) {
        console.warn('QA задача не имеет assignee', qaTask);
        return;
      }

      try {
        // Вычисляем позицию для QA задачи используя утилиту
        const qaTaskPosition = calculateQATaskPosition(
          qaTask,
          devTask,
          devTaskPosition,
          filteredTaskPositions,
          allTasksForDrag
        );

        setTaskPositions((prev) => {
          const newPositions = new Map(prev);
          newPositions.set(qaTask.id, qaTaskPosition);
          return newPositions;
        });

        if (selectedSprintId && savePosition) {
          const posWithSource = {
            ...qaTaskPosition,
            __source: 'useQATaskManagement.placeQATaskInSwimlane',
          } as TaskPosition & { __source: string };
          savePosition(posWithSource, true, devTask.id).catch((err) => {
            console.error('Error saving QA position (quick add / place):', err);
          });
        }

        // Вычисляем якоря для связи используя утилиту
        const anchors = calculateQATaskLinkAnchors(
          devTask,
          devTaskPosition,
          qaTask,
          qaTaskPosition,
          sortedDevelopers
        );

        // Создаем связь между задачами после небольшой задержки, чтобы позиции обновились
        setTimeout(() => {
          // Проверяем, нет ли уже такой связи
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
            // Сохраняем связь через API (асинхронно)
            if (selectedSprintId) {
              saveLink(newLink).catch((error) => {
                console.error('Error saving link:', error);
              });
            }
          }

          updateXarrow();
        }, DELAYS.POSITIONING);
      } catch (error) {
        console.error('Error placing QA task:', error);
      }
    },
    [
      filteredTaskPositions,
      allTasksForDrag,
      sortedDevelopers,
      selectedSprintId,
      setTaskPositions,
      setTaskLinks,
      saveLink,
      updateXarrow,
      filteredTaskLinks,
      savePosition,
    ]
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
      placeQATaskInSwimlane(qaTask, devTask, devTaskPosition);
    },
    [taskPositions, filteredTaskPositions, placeQATaskInSwimlane]
  );

  return {
    placeQATaskInSwimlane,
    placeQATaskAtNearestFreeSlot,
    createQATask,
  };
}

