'use client';

import type { SprintInfo } from '@/features/sprint/components/SprintPlanner/occupancy/OccupancyView';
import type { Developer, Task, TaskLink, TaskPosition } from '@/types';
import type { SprintListItem } from '@/types/tracker';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { isTaskCompleted } from '@/features/task/hooks/useTaskFiltering';
import { fetchEpicDeep } from '@/lib/api/epics';
import { fetchTeamMembers } from '@/lib/api/quarterly';
import { deleteTaskLink, deleteTaskPosition, fetchSprintLinks, fetchSprintPositions, saveTaskLink } from '@/lib/beerTrackerApi';

import {
  applyEpicAssigneeUpdate,
  collectEpicSprintPositions,
  findTaskSprintIndex,
  mergeDevelopersFromMap,
  mergeSyntheticQaTasksIntoMap,
  saveEpicOccupancyPosition,
} from './useEpicOccupancyDataHelpers';

interface UseEpicOccupancyDataParams {
  boardId: number | null;
  /** Ключ эпика в трекере (например, NW-1234) */
  epicId: string;
  /** Квартал 1–4 (для страницы квартального планирования v2) */
  quarter?: 1 | 2 | 3 | 4;
  /** Триггер принудительной перезагрузки данных (например, после создания задачи) */
  reloadToken?: number;
  /** Список всех спринтов доски */
  sprints: SprintListItem[];
  /** Фильтр по статусу: при смене выполняется перезапрос к бэку и показ оверлея загрузки */
  statusFilter?: 'active' | 'all' | 'completed';
  /** Год квартала (для страницы квартального планирования v2; если не задан — текущий квартал) */
  year?: number;
}

interface UseEpicOccupancyDataResult {
  allDevelopers: Developer[];
  isLoading: boolean;
  /** Спринты для отображения (отсортированы по дате) */
  sprintInfos: SprintInfo[];
  /** Связи задач (из task_links) по всем спринтам */
  taskLinks: TaskLink[];
  /**
   * Скорректированные позиции: taskId → позиция с уже смещённым startDay.
   * Берётся первое вхождение задачи (из самого раннего спринта).
   */
  taskPositions: Map<string, TaskPosition>;
  /** Все задачи, принадлежащие эпику (включая незапланированные) */
  tasks: Task[];
  /** taskId → { sprintId, sprintIdx } — в каком спринте хранится позиция задачи. */
  taskSprintMap: Map<string, { sprintId: number; sprintIdx: number }>;
  /** Добавляет связь между задачами (сохраняет в спринт fromTask). */
  handleAddLink: (link: { fromTaskId: string; toTaskId: string; id: string }) => Promise<void>;
  /**
   * Оптимистично обновляет исполнителя задачи в локальном состоянии.
   * Для синтетических QA-задач обновляет и dev-задачу (qaEngineer), и QA-задачу (assignee),
   * т.к. QA-задачи в этом вью не пересоздаются автоматически.
   */
  handleAssigneeUpdate: (task: Task, assigneeId: string, assigneeName?: string) => void;
  /** Удаляет связь. */
  handleDeleteLink: (linkId: string) => Promise<void>;
  /** Сохраняет позицию задачи в нужный спринт (с обратным преобразованием offset). */
  handlePositionSave: (position: TaskPosition, isQa: boolean, devTaskKey?: string) => Promise<void>;
  /** Удаляет плановую фазу задачи (позицию) из БД и локального состояния. */
  handleRemoveFromPlan: (taskId: string) => Promise<void>;
}

/** Возвращает границы квартала (начало и конец). Если year/quarter не заданы — текущий квартал. */
function getQuarterBounds(year?: number, quarter?: 1 | 2 | 3 | 4): { quarterEnd: Date; quarterStart: Date } {
  if (year != null && quarter != null) {
    const quarterIndex = quarter - 1;
    const quarterStart = new Date(year, quarterIndex * 3, 1);
    quarterStart.setHours(0, 0, 0, 0);
    const quarterEnd = new Date(year, (quarterIndex + 1) * 3, 0);
    quarterEnd.setHours(23, 59, 59, 999);
    return { quarterStart, quarterEnd };
  }
  const now = new Date();
  const y = now.getFullYear();
  const quarterIndex = Math.floor(now.getMonth() / 3);
  const quarterStart = new Date(y, quarterIndex * 3, 1);
  quarterStart.setHours(0, 0, 0, 0);
  const quarterEnd = new Date(y, (quarterIndex + 1) * 3, 0);
  quarterEnd.setHours(23, 59, 59, 999);
  return { quarterStart, quarterEnd };
}

function filterTasksByStatus(tasks: Task[], statusFilter: 'active' | 'all' | 'completed'): Task[] {
  if (statusFilter === 'all') {
    return tasks;
  }
  if (statusFilter === 'completed') {
    return tasks.filter(isTaskCompleted);
  }
  return tasks.filter((task) => !isTaskCompleted(task));
}

async function fetchSprintPositionsSafe(sprintId: number): Promise<TaskPosition[]> {
  try {
    return await fetchSprintPositions(sprintId);
  } catch (err) {
    console.error(`[useEpicOccupancyData] Failed to load positions for sprint ${sprintId}:`, err);
    return [];
  }
}

function addEpicDeepTasksToMap(
  stories: Awaited<ReturnType<typeof fetchEpicDeep>>['stories'],
  tasksMap: Map<string, Task>
): void {
  for (const story of stories) {
    for (const task of story.tasks) {
      tasksMap.set(task.id, task);
    }
  }
}

async function fetchSprintLinksSafe(sprintId: number): Promise<TaskLink[]> {
  try {
    return await fetchSprintLinks(sprintId);
  } catch (err) {
    console.error(`[useEpicOccupancyData] Failed to load links for sprint ${sprintId}:`, err);
    return [];
  }
}

/**
 * Хук для загрузки данных «Планирование эпика»:
 * - диапазон спринтов: все спринты текущего квартала
 * - фильтрация: только задачи из стори, относящихся к эпику
 * - задачи из CH (глубокий запрос), спринт задачи — по полю sprints в CH
 * - разработчики — один запрос /api/teams/members
 * - позиции с корректировкой startDay на смещение спринта
 * - связи из task_links
 */
export function useEpicOccupancyData({
  boardId,
  epicId,
  sprints,
  reloadToken,
  statusFilter = 'all',
  year,
  quarter,
}: UseEpicOccupancyDataParams): UseEpicOccupancyDataResult {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskPositions, setTaskPositions] = useState<Map<string, TaskPosition>>(new Map());
  const [taskLinks, setTaskLinks] = useState<TaskLink[]>([]);
  const [allDevelopers, setAllDevelopers] = useState<Developer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [taskSprintMap, setTaskSprintMap] = useState<Map<string, { sprintId: number; sprintIdx: number }>>(new Map());
  const [linkSprintMap, setLinkSprintMap] = useState<Map<string, number>>(new Map());

  const sprintInfos = useMemo((): SprintInfo[] => {
    if (sprints.length === 0) return [];

    const { quarterStart, quarterEnd } = getQuarterBounds(year, quarter);

    return sprints
      .filter((s) => {
        const sprintEnd = new Date(s.endDate);
        sprintEnd.setHours(23, 59, 59, 999);
        const sprintStart = new Date(s.startDate);
        sprintStart.setHours(0, 0, 0, 0);
        return sprintEnd >= quarterStart && sprintStart <= quarterEnd;
      })
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      .map((s) => ({
        id: s.id,
        name: s.name,
        quarter: s.quarter ?? null,
        startDate: new Date(s.startDate),
        endDate: new Date(s.endDate),
      }));
  }, [sprints, year, quarter]);

  useEffect(() => {
    if (!boardId) {
      setIsLoading(false);
      setTasks([]);
      setTaskPositions(new Map());
      setTaskLinks([]);
      setAllDevelopers([]);
      return;
    }

    if (sprintInfos.length === 0) {
      setIsLoading(true);
      setTasks([]);
      setTaskPositions(new Map());
      setTaskLinks([]);
      setAllDevelopers([]);
      return;
    }

    let cancelled = false;

    async function loadData() {
      setIsLoading(true);
      try {
        const tasksMap = new Map<string, Task>();
        try {
          const deep = await fetchEpicDeep(epicId);
          addEpicDeepTasksToMap(deep.stories, tasksMap);
        } catch (err) {
          console.error('[useEpicOccupancyData] Failed to fetch epic deep:', err);
        }

        const developersMap = new Map<string, Developer>();
        const taskTrackerSprintIdx = new Map<string, number>();

        tasksMap.forEach((task, taskId) => {
          const sprintIdx = findTaskSprintIndex(task, sprintInfos);
          if (sprintIdx != null) {
            taskTrackerSprintIdx.set(taskId, sprintIdx);
          }
        });

        try {
          const devs = await fetchTeamMembers(boardId!);
          devs.forEach((d) => developersMap.set(d.id, d));
        } catch (err) {
          console.warn('[useEpicOccupancyData] Failed to fetch team members:', err);
        }

        const [positionsPerSprint, linksPerSprint] = await Promise.all([
          Promise.all(sprintInfos.map((sprint) => fetchSprintPositionsSafe(sprint.id as number))),
          Promise.all(sprintInfos.map((sprint) => fetchSprintLinksSafe(sprint.id as number))),
        ]);

        const { posMap, taskSprintMap: newTaskSprintMap, linksMap, linkSprintMap: newLinkSprintMap } =
          collectEpicSprintPositions({
            linksPerSprint,
            positionsPerSprint,
            sprintInfos,
            taskTrackerSprintIdx,
          });

        mergeSyntheticQaTasksIntoMap(tasksMap);

        const filteredTasks = filterTasksByStatus(Array.from(tasksMap.values()), statusFilter);
        if (cancelled) return;

        setTasks(filteredTasks);
        setTaskPositions(posMap);
        setTaskLinks(Array.from(linksMap.values()));
        setAllDevelopers(mergeDevelopersFromMap(developersMap));
        setTaskSprintMap(newTaskSprintMap);
        setLinkSprintMap(newLinkSprintMap);
      } catch (err) {
        console.error('[useEpicOccupancyData] Error loading data:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, [sprintInfos, boardId, epicId, reloadToken, statusFilter]);

  const handlePositionSave = useCallback(
    async (position: TaskPosition, isQa: boolean, devTaskKey?: string) => {
      setTaskPositions((prev) => {
        const next = new Map(prev);
        next.set(position.taskId, position);
        return next;
      });

      const saved = await saveEpicOccupancyPosition({
        devTaskKey,
        isQa,
        position,
        sprintInfos,
        taskSprintMap,
      });
      if (!saved) return;

      setTaskSprintMap((prev) => {
        const next = new Map(prev);
        next.set(position.taskId, { sprintId: saved.sprintId, sprintIdx: saved.newSprintIdx });
        return next;
      });
    },
    [sprintInfos, taskSprintMap]
  );

  const handleAssigneeUpdate = useCallback((task: Task, assigneeId: string, assigneeName?: string) => {
    setTasks((prev) => applyEpicAssigneeUpdate(prev, task, assigneeId, assigneeName));
  }, []);

  const handleAddLink = useCallback(
    async (link: { fromTaskId: string; toTaskId: string; id: string }) => {
      setTaskLinks((prev) => [...prev, link]);

      const sprintInfo = taskSprintMap.get(link.fromTaskId);
      const sprintId = sprintInfo?.sprintId ?? (sprintInfos[0]?.id as number | undefined);
      if (!sprintId) return;

      const success = await saveTaskLink(sprintId, {
        id: link.id,
        fromTaskId: link.fromTaskId,
        toTaskId: link.toTaskId,
      });

      if (success) {
        setLinkSprintMap((prev) => {
          const next = new Map(prev);
          next.set(link.id, sprintId);
          return next;
        });
      }
    },
    [sprintInfos, taskSprintMap]
  );

  const handleDeleteLink = useCallback(
    async (linkId: string) => {
      setTaskLinks((prev) => prev.filter((l) => l.id !== linkId));

      const sprintId = linkSprintMap.get(linkId);
      if (!sprintId) return;

      await deleteTaskLink(sprintId, linkId);

      setLinkSprintMap((prev) => {
        const next = new Map(prev);
        next.delete(linkId);
        return next;
      });
    },
    [linkSprintMap]
  );

  const handleRemoveFromPlan = useCallback(
    async (taskId: string) => {
      setTaskPositions((prev) => {
        const next = new Map(prev);
        next.delete(taskId);
        return next;
      });

      const sprintInfo = taskSprintMap.get(taskId);
      if (!sprintInfo) return;

      await deleteTaskPosition(sprintInfo.sprintId, taskId);

      setTaskSprintMap((prev) => {
        const next = new Map(prev);
        next.delete(taskId);
        return next;
      });
    },
    [taskSprintMap]
  );

  return {
    tasks,
    taskPositions,
    taskLinks,
    taskSprintMap,
    sprintInfos,
    allDevelopers,
    isLoading,
    handlePositionSave,
    handleAssigneeUpdate,
    handleAddLink,
    handleDeleteLink,
    handleRemoveFromPlan,
  };
}
