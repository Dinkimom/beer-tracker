/**
 * Хук для управления логикой бэклога в сайдбаре
 * Выносит всю логику загрузки, фильтрации и управления задачами бэклога
 */

import type { BacklogResponse, Developer, Task } from '@/types';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { backlogQueryKey, useBacklog } from '@/features/backlog/hooks/useBacklog';
import { useDemoPlannerBoardsQueryScope } from '@/features/board/demoPlannerBoardsQueryScope';
import { isTaskCompleted } from '@/features/task/hooks/useTaskFiltering';
import { fetchBacklog } from '@/lib/beerTrackerApi';

function removeTaskFromBacklogPage(
  old: BacklogResponse | undefined,
  taskId: string
): BacklogResponse | undefined {
  if (!old) {
    return old;
  }
  return {
    ...old,
    tasks: old.tasks.filter((task) => task.id !== taskId),
  };
}

function removeTaskFromAdditionalPages(
  prev: Map<number, BacklogResponse>,
  taskId: string
): Map<number, BacklogResponse> {
  const newMap = new Map(prev);
  for (const [page, pageData] of newMap) {
    newMap.set(page, removeTaskFromBacklogPage(pageData, taskId)!);
  }
  return newMap;
}

interface UseBacklogManagementProps {
  goalTask?: Task | null;
  /** ID задач на цели (delivery + discovery), исключаются из бэклога */
  goalTaskIds?: string[];
  mainTab: string;
  nameFilter: string;
  selectedBoardId: number | null | undefined;
  statusFilter: string;
  onBacklogTaskRef?: (ref: {
    getTask: (taskId: string) => Task | undefined;
    removeTask: (taskId: string) => void;
  }) => void;
}

const BACKLOG_PER_PAGE = 50;

export function useBacklogManagement({
  selectedBoardId,
  mainTab,
  statusFilter,
  nameFilter,
  goalTask,
  goalTaskIds,
  onBacklogTaskRef,
}: UseBacklogManagementProps) {
  const queryClient = useQueryClient();
  const forDemoPlannerBoards = useDemoPlannerBoardsQueryScope();
  const backlogPage1Key = useMemo(
    () => backlogQueryKey(selectedBoardId ?? null, 1, forDemoPlannerBoards),
    [selectedBoardId, forDemoPlannerBoards]
  );

  const {
    data: firstPageData,
    error: firstPageError,
    isLoading: firstPageLoading,
    refetch: refetchBacklog,
  } = useBacklog(
    mainTab === 'backlog' ? (selectedBoardId ?? null) : null,
    1
  );

  const isBacklogRateLimitError =
    !!firstPageError &&
    typeof firstPageError === 'object' &&
    'response' in firstPageError &&
    (firstPageError as { response?: { status?: number } }).response?.status === 429;

  // Состояние для дополнительных страниц (для пагинации)
  const [additionalPages, setAdditionalPages] = useState<Map<number, BacklogResponse>>(new Map());
  const [backlogLoading, setBacklogLoading] = useState(false);
  const [backlogNextPage, setBacklogNextPage] = useState(2);
  const [backlogHasMore, setBacklogHasMore] = useState(false);
  const [backlogTotalCount, setBacklogTotalCount] = useState(0);

  const { backlogTasks, backlogDevelopers } = useMemo(() => {
    if (!firstPageData) {
      return { backlogTasks: [], backlogDevelopers: [] };
    }

    const allTasks = [...firstPageData.tasks];
    const allDevelopersMap = new Map<string, Developer>(
      firstPageData.developers.map(d => [d.id, d])
    );

    additionalPages.forEach((pageData) => {
      allTasks.push(...pageData.tasks);
      pageData.developers.forEach((dev) => {
        if (!allDevelopersMap.has(dev.id)) {
          allDevelopersMap.set(dev.id, dev);
        }
      });
    });

    return {
      backlogTasks: allTasks,
      backlogDevelopers: Array.from(allDevelopersMap.values()),
    };
  }, [firstPageData, additionalPages]);

  useEffect(() => {
    if (firstPageData) {
      setBacklogNextPage(2);
      setBacklogHasMore(
        firstPageData.pagination.page < firstPageData.pagination.totalPages
      );
      setBacklogTotalCount(firstPageData.pagination.totalCount);
    } else {
      setBacklogHasMore(false);
      setBacklogTotalCount(0);
    }
  }, [firstPageData]);

  useEffect(() => {
    if (mainTab !== 'backlog') {
      setAdditionalPages(new Map());
      setBacklogNextPage(2);
    }
  }, [mainTab, selectedBoardId]);

  useEffect(() => {
    if (onBacklogTaskRef) {
      onBacklogTaskRef({
        getTask: (taskId: string) => backlogTasks.find(t => t.id === taskId),
        removeTask: (taskId: string) => {
          queryClient.setQueryData<BacklogResponse>(
            backlogPage1Key,
            (old) => removeTaskFromBacklogPage(old, taskId)
          );
          setAdditionalPages((prev) => removeTaskFromAdditionalPages(prev, taskId));
        },
      });
    }
  }, [backlogTasks, backlogPage1Key, onBacklogTaskRef, queryClient]);

  const loadMoreBacklogTasks = useCallback(async () => {
    if (!selectedBoardId || backlogLoading || !backlogHasMore) {
      return;
    }

    try {
      setBacklogLoading(true);
      const data = await fetchBacklog(selectedBoardId, backlogNextPage, BACKLOG_PER_PAGE);

      setAdditionalPages((prev) => {
        const newMap = new Map(prev);
        newMap.set(backlogNextPage, data);
        return newMap;
      });

      if (data.pagination) {
        setBacklogNextPage(prev => prev + 1);
        setBacklogHasMore(data.pagination.page < data.pagination.totalPages);
        setBacklogTotalCount(data.pagination.totalCount);
      }
    } catch (err) {
      console.error('Error loading more backlog tasks:', err);
    } finally {
      setBacklogLoading(false);
    }
  }, [selectedBoardId, backlogLoading, backlogHasMore, backlogNextPage]);

  const goalIds = useMemo(
    () => goalTaskIds ?? (goalTask ? [goalTask.id] : []),
    [goalTaskIds, goalTask]
  );

  const filteredBacklogTasks = useCallback(() => {
    let filtered = [...backlogTasks];

    if (goalIds.length > 0) {
      const set = new Set(goalIds);
      filtered = filtered.filter(task => !set.has(task.id));
    }

    if (statusFilter === 'completed') {
      filtered = filtered.filter(isTaskCompleted);
    } else if (statusFilter === 'active') {
      filtered = filtered.filter(task => !isTaskCompleted(task));
    }

    if (nameFilter.trim()) {
      const searchTerm = nameFilter.trim().toLowerCase();
      filtered = filtered.filter(task =>
        task.name.toLowerCase().includes(searchTerm) ||
        task.id.toLowerCase().includes(searchTerm)
      );
    }

    return filtered;
  }, [backlogTasks, goalIds, statusFilter, nameFilter]);

  const addTask = useCallback((task: Task) => {
    queryClient.setQueryData<BacklogResponse>(
      backlogPage1Key,
      (old) => {
        if (!old) return old;
        if (old.tasks.some(t => t.id === task.id)) {
          return old;
        }
        return {
          ...old,
          tasks: [...old.tasks, task],
        };
      }
    );
  }, [backlogPage1Key, queryClient]);

  const removeTask = useCallback((taskId: string) => {
    queryClient.setQueryData<BacklogResponse>(
      backlogPage1Key,
      (old) => removeTaskFromBacklogPage(old, taskId)
    );
    setAdditionalPages((prev) => removeTaskFromAdditionalPages(prev, taskId));
  }, [backlogPage1Key, queryClient]);

  const isLoading = firstPageLoading || backlogLoading;
  const isInitialBacklogLoad = firstPageLoading && backlogTasks.length === 0;

  return {
    addTask,
    backlogDevelopers,
    backlogHasMore,
    backlogLoading: isLoading,
    backlogTasks,
    backlogTotalCount,
    filteredBacklogTasks: filteredBacklogTasks(),
    isBacklogRateLimitError,
    isInitialBacklogLoad,
    loadMoreBacklogTasks,
    refetchBacklog,
    removeTask,
  };
}

