import type { BoardViewMode } from '@/hooks/useLocalStorage';
import type { PositionHistoryOptions } from '@/lib/layers/application/mobx/stores/taskPositionsStore';
import type { Comment, Task, TaskParent, TaskPosition } from '@/types';
import type { MutableRefObject } from 'react';

import { useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';

import { useI18n } from '@/contexts/LanguageContext';
import {
  parseSwimlaneCommentTaskId,
  swimlanePositionToCommentPatch,
} from '@/features/comments/utils/swimlaneCommentTaskBridge';
import {
  applyFeatureLaneBacklogDrop,
  applyFeatureLaneCommentDrop,
  applyFeatureLanePositionDrop,
  buildFeatureSwimlaneProjection,
  mergeFeatureLaneDraftRowMeta,
  overlayFeatureLaneDraftParents,
} from '@/features/swimlane/utils/featureSwimlaneRows';
import { useFeatureLanesApi } from '@/hooks/useApiStorage';

interface FeatureLanePlannerDragHandlers {
  handleBacklogTaskDrop: (
    taskId: string,
    assigneeId: string,
    day: number,
    part: number,
    historyOptions?: PositionHistoryOptions
  ) => void;
  handleCommentMove: (
    commentId: string,
    patch: ReturnType<typeof swimlanePositionToCommentPatch>,
    options?: { recordHistory?: boolean }
  ) => void;
  handleCommentParentChange: (
    commentId: string,
    parent: TaskParent | null,
    options?: { recordHistory?: boolean }
  ) => void;
  handleCommentPlanChange: (
    commentId: string,
    patch: ReturnType<typeof swimlanePositionToCommentPatch>,
    parentChange: TaskParent | null | undefined
  ) => void;
  handleParentChange: (taskId: string, parent: TaskParent | null) => Promise<void> | void;
  handlePositionUpdate: (
    taskId: string,
    position: TaskPosition,
    historyOptions?: PositionHistoryOptions
  ) => void;
}

export function useFeatureLanePlannerDrag(input: {
  allTasksForDrag: Task[];
  comments: Comment[];
  backlogTaskRef: MutableRefObject<{
    getTask: (taskId: string) => Task | undefined;
  } | null>;
  handlers: FeatureLanePlannerDragHandlers;
  selectedSprintId: number | null;
  slaBugsTasks: Task[] | undefined;
  taskPositions: Map<string, TaskPosition>;
  tasksMap: Map<string, Task>;
  viewMode: BoardViewMode;
}): {
  handleBacklogTaskDrop: (taskId: string, assigneeId: string, day: number, part: number) => void;
  handlePositionUpdate: (taskId: string, position: TaskPosition) => void;
} {
  const { t } = useI18n();
  const [featureLanes] = useFeatureLanesApi(input.selectedSprintId);
  const tasksForLanes = useMemo(
    () => overlayFeatureLaneDraftParents(input.allTasksForDrag, featureLanes),
    [featureLanes, input.allTasksForDrag]
  );
  const tasksMapForLanes = useMemo(() => {
    const next = new Map(input.tasksMap);
    for (const task of tasksForLanes) {
      next.set(task.id, task);
    }
    return next;
  }, [input.tasksMap, tasksForLanes]);
  const projection = useMemo(() => {
    if (input.viewMode !== 'features') {
      return null;
    }
    const base = buildFeatureSwimlaneProjection(
      tasksForLanes,
      {
        noParentLabel: t('task.grouping.noParent'),
        teamLaneLabel: t('sprintPlanner.swimlane.teamLane.name'),
      },
      input.taskPositions
    );
    return {
      ...base,
      rowMetaById: mergeFeatureLaneDraftRowMeta(base.rowMetaById, featureLanes?.draftRows ?? []),
    };
  }, [
    featureLanes?.draftRows,
    input.taskPositions,
    input.viewMode,
    t,
    tasksForLanes,
  ]);

  const handlePositionUpdate = useCallback(
    (taskId: string, position: TaskPosition) => {
      const commentId = parseSwimlaneCommentTaskId(taskId);
      if (commentId) {
        const comment = input.comments.find((item) => item.id === commentId);
        if (input.viewMode === 'features' && projection && comment) {
          applyFeatureLaneCommentDrop({
            comment,
            droppedRowId: position.assignee,
            incoming: position,
            rowMetaById: projection.rowMetaById,
            onCommentPlanChange: input.handlers.handleCommentPlanChange,
          });
          return;
        }
        input.handlers.handleCommentMove(commentId, swimlanePositionToCommentPatch(position));
        return;
      }
      if (input.viewMode === 'features' && projection) {
        applyFeatureLanePositionDrop({
          droppedRowId: position.assignee,
          existing: input.taskPositions.get(taskId),
          incoming: position,
          rowMetaById: projection.rowMetaById,
          task: tasksMapForLanes.get(taskId),
          taskId,
          onParentChange: input.handlers.handleParentChange,
          onPositionUpdate: input.handlers.handlePositionUpdate,
        });
        return;
      }
      input.handlers.handlePositionUpdate(taskId, position);
    },
    [input.comments, input.handlers, input.taskPositions, input.viewMode, projection, tasksMapForLanes]
  );

  const handleBacklogTaskDrop = useCallback(
    (taskId: string, assigneeId: string, day: number, part: number) => {
      if (input.viewMode !== 'features' || !projection) {
        input.handlers.handleBacklogTaskDrop(taskId, assigneeId, day, part);
        return;
      }
      const sidebarTask = overlayFeatureLaneDraftParents(
        [
          input.backlogTaskRef.current?.getTask(taskId) ??
            input.slaBugsTasks?.find((item) => item.id === taskId) ??
            tasksMapForLanes.get(taskId),
        ].filter((task): task is Task => Boolean(task)),
        featureLanes
      )[0];
      applyFeatureLaneBacklogDrop({
        day,
        droppedRowId: assigneeId,
        part,
        rowMetaById: projection.rowMetaById,
        task: sidebarTask,
        taskId,
        onAssigneeRequired: () => toast.error(t('sprintPlanner.featureLanes.assigneeRequired')),
        onBacklogTaskDrop: input.handlers.handleBacklogTaskDrop,
        onParentChange: input.handlers.handleParentChange,
      });
    },
    [featureLanes, input.backlogTaskRef, input.handlers, input.slaBugsTasks, input.viewMode, projection, t, tasksMapForLanes]
  );

  return { handleBacklogTaskDrop, handlePositionUpdate };
}
