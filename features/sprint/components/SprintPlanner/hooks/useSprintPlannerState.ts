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
import type { Task, TaskPosition } from '@/types';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useDemoPlannerBoardsQueryScope } from '@/features/board/demoPlannerBoardsQueryScope';
import { applyPlanHistorySideEffects } from '@/features/sprint/components/SprintPlanner/utils/applyPlanHistorySideEffects';
import { reconcileTasksAfterPlanHistoryStep } from '@/features/sprint/components/SprintPlanner/utils/reconcileTasksAfterPlanHistoryStep';
import {
  patchSprintTaskStatusInQueries,
  patchSprintTasksQuery,
  reloadSprintTasksQueries,
  removeSprintTaskFromQueries,
  upsertSprintTaskInQueries,
  useTasks,
} from '@/features/task/hooks/useTasks';
import {
  useCommentsApi,
  useFeatureLanesApi,
  useTaskLinksApi,
  useTaskPositionsApi,
} from '@/hooks/useApiStorage';
import { useBoardViewModeStorage, useSidebarWidthStorage, useDataSyncEstimatesStorage } from '@/hooks/useLocalStorage';
import { useSprintRealtimeSync } from '@/hooks/useSprintRealtimeSync';
import { bumpPlannerDiagramRemoteEpoch } from '@/lib/comments/plannerDiagramPreviewStore';
import { useRootStore } from '@/lib/layers';
import { mergeDbPositionsWithTrackerDateFallbacks, parseTrackerIsoDateOnlyLocal } from '@/lib/planner-timeline';
import { sprintPresenceViewersUiEqual } from '@/lib/realtime/sprintPresenceCollapse';
import { getBrowserRealtimeClientId } from '@/lib/realtime/sprintRealtimeClientId';
import { resolveSprintTimelineWorkingDaysCount } from '@/utils/dateUtils';

import { useTaskState } from '../../../hooks/useTaskState';

import { retainTaskPositionMap } from './retainTaskPositionMap';

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
  const { taskPositions: positionsStore } = useRootStore();
  const [syncEstimates] = useDataSyncEstimatesStorage();
  const forDemoPlanner = useDemoPlannerBoardsQueryScope();
  const tasksQuery = useTasks(selectedSprintId, selectedBoardId);

  const tasks = tasksQuery.data?.tasks ?? [];
  const developers = useMemo(
    () => tasksQuery.data?.developers ?? [],
    [tasksQuery.data?.developers],
  );

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

  const [taskPositions, setTaskPositions, savePosition, deletePosition, positionHistory] = useTaskPositionsApi(
    selectedSprintId,
    getTaskInfoRef
  );
  const [taskLinks, setTaskLinks, saveLink, deleteLink, reloadLinks] = useTaskLinksApi(selectedSprintId);
  const [comments, setComments, , deleteComment, reloadComments] = useCommentsApi(selectedSprintId);
  const [, setFeatureLanes] = useFeatureLanesApi(selectedSprintId);
  const [boardViewers, setBoardViewers] = useState<SprintPresenceViewer[]>([]);
  const [filteredTaskPositions, setFilteredTaskPositions] = useState(
    () => new Map<string, TaskPosition>()
  );

  useSprintRealtimeSync(selectedSprintId, {
    onComments: () => {
      bumpPlannerDiagramRemoteEpoch();
      reloadComments().catch(() => undefined);
    },
    onLinks: () => {
      reloadLinks().catch(() => undefined);
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

  const workingDaysCount = useMemo(
    () => resolveSprintTimelineWorkingDaysCount(sprintStartDate, sprintEndDate),
    [sprintEndDate, sprintStartDate]
  );

  const sprintStartDateObj = useMemo(
    () => parseTrackerIsoDateOnlyLocal(sprintStartDate),
    [sprintStartDate]
  );

  // Без useMemo: MobX мутирует `taskPositions` in-place при DnD, ссылка стабильна.
  const displayTaskPositions =
    sprintStartDateObj == null
      ? taskPositions
      : mergeDbPositionsWithTrackerDateFallbacks({
          dbPositions: taskPositions,
          sprintStartDate: sprintStartDateObj,
          tasks,
          workingDaysCount,
        });

  const taskState = useTaskState({ tasks, taskPositions: displayTaskPositions, developers });
  const { qaTasksMap, allTasksForDrag, tasksMap, qaTasksByOriginalId, unassignedTasks, tasksByAssignee } =
    taskState;

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

  // displayTaskPositions — DB + fallback из start/deadline трекера. Новый filtered Map только при смене
  // ссылок на позиции: hover/presence не должны сбрасывать React.memo свимлейнов.
  const nextFilteredTaskPositions = new Map<string, TaskPosition>();
  displayTaskPositions.forEach((pos, taskId) => {
    if (tasksMap.has(taskId) || qaTasksByOriginalId.has(taskId)) {
      nextFilteredTaskPositions.set(taskId, pos);
    }
  });
  const retainedFilteredTaskPositions = retainTaskPositionMap(
    filteredTaskPositions,
    nextFilteredTaskPositions
  );
  if (retainedFilteredTaskPositions !== filteredTaskPositions) {
    setFilteredTaskPositions(retainedFilteredTaskPositions);
  }

  const filteredTaskLinks = useMemo(() => {
    return taskLinks.filter(
      (link) => tasksMap.has(link.fromTaskId) && tasksMap.has(link.toTaskId)
    );
  }, [taskLinks, tasksMap]);

  return {
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

    qaTasksMap,
    allTasksForDrag,
    tasksMap,
    qaTasksByOriginalId,
    unassignedTasks,
    tasksByAssignee,
    filteredTaskPositions: retainedFilteredTaskPositions,
    filteredTaskLinks,
  };
}
