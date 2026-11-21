/**
 * Хук для управления состоянием SprintPlanner
 * Выносит всю логику управления состоянием из основного компонента.
 *
 * **Задачи и разработчики:** из ответа `useTasks` (тот же кэш, что на странице). Оптимистичные правки списка задач — `setTasks` → `patchSprintTasksQuery` (поле `tasks` в `TasksResponse`).
 * Подробнее: `ARCHITECTURE.md` в корне репозитория.
 */

import type { GetTaskInfoFn } from '@/hooks/useApiStorage';
import type { PlanHistoryAppliedPayload } from '@/lib/layers/application/mobx/stores/taskPositionsStore';
import type { SprintPresenceViewer } from '@/lib/realtime/sprintRealtimeTypes';
import type { Task } from '@/types';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useDemoPlannerBoardsQueryScope } from '@/features/board/demoPlannerBoardsQueryScope';
import { applyPlanHistorySideEffects } from '@/features/sprint/components/SprintPlanner/utils/applyPlanHistorySideEffects';
import { reconcileTasksAfterPlanHistoryStep } from '@/features/sprint/components/SprintPlanner/utils/reconcileTasksAfterPlanHistoryStep';
import { AGENT_SESSIONS_QUERY_KEY } from '@/features/swimlane/hooks/useAgentSessions';
import {
  patchSprintTaskStatusInQueries,
  patchSprintTasksQuery,
  reloadSprintTasksQueries,
  removeSprintTaskFromQueries,
  upsertSprintTaskInQueries,
  sprintTasksQueryKey,
  useTasks,
} from '@/features/task/hooks/useTasks';
import { reloadFeatureLanesSession } from '@/hooks/featureLanesSessionStore';
import {
  useCommentsApi,
  useFeatureLanesApi,
  useTaskPositionsApi,
} from '@/hooks/useApiStorage';
import { useBoardViewModeStorage, useSidebarWidthStorage, useDataSyncEstimatesStorage } from '@/hooks/useLocalStorage';
import { useSprintRealtimeSync } from '@/hooks/useSprintRealtimeSync';
import { bumpPlannerDiagramRemoteEpoch } from '@/lib/comments/plannerDiagramPreviewStore';
import { useRootStore } from '@/lib/layers';
import { sprintPresenceViewersUiEqual } from '@/lib/realtime/sprintPresenceCollapse';
import { getBrowserRealtimeClientId } from '@/lib/realtime/sprintRealtimeClientId';

import { useTaskState } from '../../../hooks/useTaskState';
import { SprintBoard } from '../../../model/SprintBoard';
import { createSprintLinks } from '../../../model/sprintLinks';


interface UseSprintPlannerStateProps {
  selectedBoardId: number | null;
  selectedSprintId: number | null;
  /** Дата конца спринта (YYYY-MM-DD) — число рабочих дней сетки. */
  sprintEndDate?: string | null;
  /** Дата начала спринта (YYYY-MM-DD) — для fallback-позиций из start/deadline трекера. */
  sprintStartDate?: string | null;
}

export function useSprintPlannerState({
  selectedBoardId,
  selectedSprintId,
  sprintStartDate = null,
  sprintEndDate = null,
}: UseSprintPlannerStateProps) {
  const queryClient = useQueryClient();
  const { sprintMovePlacement, taskPositions: positionsStore } = useRootStore();
  const [syncEstimates] = useDataSyncEstimatesStorage();
  const forDemoPlanner = useDemoPlannerBoardsQueryScope();
  // Запрос задач делает useTasks; данные доска читает из модели, которая смотрит в тот же кэш.
  useTasks(selectedSprintId, selectedBoardId);

  // Модель доски держит задачи из того же кэша (ссылку, не копию) и выводит из них карты.
  // Связи живут весь спринт: модель пересоздаётся при смене дат, а их загрузка и ожидающие правки — нет.
  const links = useMemo(() => createSprintLinks(selectedSprintId), [selectedSprintId]);
  useEffect(() => links.connect(), [links]);
  const board = useMemo(
    () =>
      new SprintBoard({
        links,
        movePlacement: sprintMovePlacement,
        positions: positionsStore,
        queryClient,
        sprintEndDate,
        sprintId: selectedSprintId,
        sprintStartDate,
        tasksQueryKey: sprintTasksQueryKey(selectedSprintId, selectedBoardId, forDemoPlanner),
      }),
    [
      forDemoPlanner,
      links,
      positionsStore,
      queryClient,
      selectedBoardId,
      selectedSprintId,
      sprintEndDate,
      sprintMovePlacement,
      sprintStartDate,
    ]
  );
  useEffect(() => board.connect(), [board]);
  const tasks = board.tasks;
  const developers = board.developers;

  const setTasks = useCallback(
    (patch: Task[] | ((prev: Task[]) => Task[])) => {
      patchSprintTasksQuery(queryClient, selectedSprintId, selectedBoardId, patch, forDemoPlanner);
    },
    [queryClient, selectedSprintId, selectedBoardId, forDemoPlanner]
  );

  const [sidebarWidth, setSidebarWidth] = useSidebarWidthStorage(320);
  const [viewMode, setViewMode] = useBoardViewModeStorage();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setIsMounted(true);
    });
  }, []);

  const getTaskInfoRef = useRef<GetTaskInfoFn | undefined>(undefined);

  const [, setTaskPositions, savePosition, deletePosition, positionHistory] = useTaskPositionsApi(
    selectedSprintId,
    getTaskInfoRef
  );
  const { delete: deleteLink, items: taskLinks, reloadFromRemote: reloadLinks, save: saveLink, setWithSave: setTaskLinks } =
    links;
  const [comments, setComments, , deleteComment, reloadComments] = useCommentsApi(selectedSprintId);
  const [, setFeatureLanes] = useFeatureLanesApi(selectedSprintId);
  const [boardViewers, setBoardViewers] = useState<SprintPresenceViewer[]>([]);

  useSprintRealtimeSync(selectedSprintId, {
    onComments: () => {
      bumpPlannerDiagramRemoteEpoch();
      reloadComments().catch(() => undefined);
    },
    onGoals: () => {
      queryClient.invalidateQueries({ queryKey: ['sprintGoals'] }).catch(() => undefined);
    },
    onLinks: () => {
      reloadLinks().catch(() => undefined);
    },
    onFeatureLanes: () => {
      if (selectedSprintId) {
        reloadFeatureLanesSession(selectedSprintId).catch(() => undefined);
      }
    },
    onAgentSessions: () => {
      queryClient
        .invalidateQueries({ queryKey: [AGENT_SESSIONS_QUERY_KEY] })
        .catch(() => undefined);
    },
    onPositions: () => {
      if (selectedSprintId) {
        positionsStore.reconcileRemoteSprint(selectedSprintId).catch(() => undefined);
      }
    },
    onPresence: (viewers) => {
      const ownClientId = getBrowserRealtimeClientId() || null;
      setBoardViewers((prev) =>
        sprintPresenceViewersUiEqual(prev, viewers, ownClientId) ? prev : viewers
      );
    },
    onTasks: (payload) => {
      if (payload.issueStatus) {
        patchSprintTaskStatusInQueries(queryClient, selectedSprintId, payload.issueStatus);
        return;
      }
      if (payload.issueMembership?.action === 'removed') {
        removeSprintTaskFromQueries(queryClient, selectedSprintId, payload.issueMembership.issueKey);
        return;
      }
      if (payload.issueMembership?.action === 'added' && payload.issueMembership.task) {
        upsertSprintTaskInQueries(queryClient, selectedSprintId, payload.issueMembership.task);
        return;
      }
      reloadSprintTasksQueries(queryClient, selectedSprintId).catch(() => undefined);
    },
  });

  // Позиции для показа (стор + даты из трекера) — из модели.
  const displayTaskPositions = board.displayPositions;

  const { allTasksForDrag, qaTasksByOriginalId, tasksMap } = board;
  const { tasksByAssignee, unassignedTasks } = useTaskState({
    allTasksForDrag,
    developers,
    taskPositions: displayTaskPositions,
  });

  useEffect(() => {
    getTaskInfoRef.current = (taskId: string) => {
      const task = tasksMap.get(taskId) || qaTasksByOriginalId.get(taskId);
      return task
        ? { isQa: task.team === 'QA', devTaskKey: task.team === 'QA' ? task.originalTaskId : undefined }
        : { isQa: false };
    };
  }, [tasksMap, qaTasksByOriginalId]);

  const historyReconcileCtxRef = useRef({
    developers,
    syncEstimates,
    tasksMap,
  });
  useEffect(() => {
    historyReconcileCtxRef.current = { developers, syncEstimates, tasksMap };
  }, [developers, syncEstimates, tasksMap]);

  useEffect(() => {
    const handler = (payload: PlanHistoryAppliedPayload) => {
      reconcileTasksAfterPlanHistoryStep(payload, historyReconcileCtxRef.current, setTasks);
      applyPlanHistorySideEffects(payload, {
        selectedSprintId,
        setComments,
        setFeatureLanes,
        setTasks,
      });
    };
    positionsStore.setOnPlanHistoryApplied(handler);
    return () => {
      positionsStore.setOnPlanHistoryApplied(undefined);
    };
  }, [positionsStore, selectedSprintId, setComments, setFeatureLanes, setTasks]);

  const filteredTaskLinks = useMemo(() => {
    return taskLinks.filter(
      (link) => tasksMap.has(link.fromTaskId) && tasksMap.has(link.toTaskId)
    );
  }, [taskLinks, tasksMap]);

  return {
    board,
    developers,
    tasks,
    setTasks,
    sidebarWidth,
    setSidebarWidth,
    viewMode,
    setViewMode,
    isMounted,

    taskPositions: displayTaskPositions,
    setTaskPositions,
    savePosition,
    deletePosition,
    positionHistory,
    taskLinks,
    setTaskLinks,
    saveLink,
    deleteLink,
    comments,
    setComments,
    deleteComment,
    boardViewers,

    allTasksForDrag,
    tasksMap,
    qaTasksByOriginalId,
    unassignedTasks,
    tasksByAssignee,
    filteredTaskPositions: board.visiblePositions,
    filteredTaskLinks,
  };
}
