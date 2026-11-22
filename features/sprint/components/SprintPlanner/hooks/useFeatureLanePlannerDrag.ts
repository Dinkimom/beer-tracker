import type { SprintNotes } from '@/features/sprint/model/sprintNotes';
import type { SprintPlan } from '@/features/sprint/model/sprintPlan';
import type { BoardViewMode } from '@/hooks/useLocalStorage';
import type { Comment, Task, TaskParent, TaskPosition } from '@/types';

import { useCallback, useMemo } from 'react';

import { useI18n } from '@/contexts/LanguageContext';
import {
  parseSwimlaneCommentTaskId,
  swimlanePositionToCommentPatch,
} from '@/features/comments/utils/swimlaneCommentTaskBridge';
import {
  applyFeatureLaneCommentDrop,
  applyFeatureLanePositionDrop,
  buildFeatureSwimlaneProjection,
  mergeFeatureLaneDraftRowMeta,
  overlayFeatureLaneDraftParents,
} from '@/features/swimlane/utils/featureSwimlaneRows';
import { useFeatureLanesApi } from '@/hooks/useApiStorage';

interface FeatureLanePlannerDragHandlers {
  handleParentChange: (taskId: string, parent: TaskParent | null) => Promise<void> | void;
}

export function useFeatureLanePlannerDrag(input: {
  allTasksForDrag: Task[];
  comments: Comment[];
  handlers: FeatureLanePlannerDragHandlers;
  /** Перемещение заметки и смена её родителя — методы модели заметок. */
  notes: Pick<SprintNotes, 'changePlan' | 'move'>;
  /** Поставить задачу на план — модель. */
  plan: Pick<SprintPlan, 'place'>;
  selectedSprintId: number | null;
  taskPositions: Map<string, TaskPosition>;
  tasksMap: Map<string, Task>;
  viewMode: BoardViewMode;
}): {
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
            onCommentPlanChange: input.notes.changePlan,
          });
          return;
        }
        input.notes.move(commentId, swimlanePositionToCommentPatch(position));
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
          onPositionUpdate: input.plan.place,
        });
        return;
      }
      input.plan.place(taskId, position);
    },
    [input.comments, input.handlers, input.notes, input.plan, input.taskPositions, input.viewMode, projection, tasksMapForLanes]
  );


  return { handlePositionUpdate };
}
