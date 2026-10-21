/**
 * Перенос задачи или заметки в другой спринт с выбором места на доске.
 *
 * Планер открывает целевой спринт и ставит карточку в первый день дорожки. Задача стоит черновиком
 * и ничего не пишется, пока пользователь не подтвердит. Заметка переезжает сразу, отмена возвращает её.
 * После подтверждения или отмены планер возвращается в исходный спринт.
 */

import type { BoardViewMode } from '@/hooks/localStorage/hooksSidebarAndDevelopers';
import type { SprintMovePlacementSession } from '@/lib/layers/application/mobx/stores/sprintMovePlacementStore';
import type { Comment, Developer, Task, TaskLink, TaskPosition } from '@/types';
import type { SprintListItem } from '@/types/tracker';

import { useQueryClient } from '@tanstack/react-query';
import { autorun } from 'mobx';
import { useCallback, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';

import { useI18n } from '@/contexts/LanguageContext';
import { toSwimlaneCommentTaskId } from '@/features/comments/utils/swimlaneCommentTaskBridge';
import {
  PLANNER_NOTIFICATION_FOCUS_MS,
  tryScrollPlannerToTaskElement,
} from '@/features/sprint/hooks/plannerFocusTaskHelpers';
import {
  removeSprintTaskFromQueries,
  upsertSprintTaskInQueries,
} from '@/features/task/hooks/useTasks';
import {
  buildMovedTaskDraftPosition,
  hasPlanBaseline,
  withoutPlanBaseline,
  withPlanBaselineAtPosition,
} from '@/features/task/utils/planAssigneeDraft';
import { addIssueToSprint, deleteTaskLink, deleteTaskPosition } from '@/lib/beerTrackerApi';
import { useRootStore } from '@/lib/layers';
import { formatSprintListItemDisplayName } from '@/utils/sprintDisplayName';

import { moveCommentToSprintFirstDay, revertCommentMove } from './sprintMovePlacementComment';

interface UseSprintMovePlacementParams {
  comments: Comment[];
  developers: Developer[];
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  selectedSprintId: number | null;
  sprints: SprintListItem[];
  taskLinks: TaskLink[];
  taskPositions: Map<string, TaskPosition>;
  tasksLoading: boolean;
  tasksMap: Map<string, Task>;
  viewMode: BoardViewMode;
  onSprintChange: (sprintId: number | null) => void;
  setViewMode: (mode: BoardViewMode) => void;
}

const FAILED_KEY = 'sprintPlanner.swimlane.movePlacement.failed';

function linkIdsTouching(taskLinks: TaskLink[], nodeId: string): string[] {
  return taskLinks
    .filter((link) => link.fromTaskId === nodeId || link.toTaskId === nodeId)
    .map((link) => link.id);
}

function sprintName(sprints: SprintListItem[], sprintId: number): string {
  const sprint = sprints.find((item) => item.id === sprintId);
  return sprint ? formatSprintListItemDisplayName(sprint) : String(sprintId);
}

/** Убирает следы карточки в исходном спринте. Ошибки не мешают переносу. */
async function cleanupSourceSprint(session: SprintMovePlacementSession): Promise<void> {
  const { sourceLinkIds, sourceSprintId } = session;
  const deletions: Promise<boolean>[] = sourceLinkIds.map((linkId) =>
    deleteTaskLink(sourceSprintId, linkId)
  );
  if (session.kind === 'task' && session.sourcePositionDuration != null) {
    deletions.push(deleteTaskPosition(sourceSprintId, session.task.id));
  }
  await Promise.all(deletions);
}

export function useSprintMovePlacement({
  comments,
  developers,
  scrollContainerRef,
  selectedSprintId,
  sprints,
  taskLinks,
  taskPositions,
  tasksLoading,
  tasksMap,
  viewMode,
  onSprintChange,
  setViewMode,
}: UseSprintMovePlacementParams) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const {
    sprintMovePlacement: moveStore,
    sprintPlannerUi,
    taskPositions: positionsStore,
  } = useRootStore();

  const enterTargetSprint = useCallback(
    (targetSprintId: number) => {
      if (viewMode === 'kanban' || viewMode === 'occupancy') {
        setViewMode('full');
      }
      onSprintChange(targetSprintId);
    },
    [onSprintChange, setViewMode, viewMode]
  );

  const handlePlanInSprint = useCallback(
    (taskId: string, targetSprintId: number) => {
      const task = tasksMap.get(taskId);
      if (!task || selectedSprintId == null || targetSprintId === selectedSprintId) {
        return;
      }
      moveStore.start({
        kind: 'task',
        sourceLinkIds: linkIdsTouching(taskLinks, taskId),
        sourcePositionDuration: taskPositions.get(taskId)?.duration ?? null,
        sourceSprintId: selectedSprintId,
        targetSprintId,
        targetSprintName: sprintName(sprints, targetSprintId),
        task,
      });
      enterTargetSprint(targetSprintId);
    },
    [enterTargetSprint, moveStore, selectedSprintId, sprints, taskLinks, taskPositions, tasksMap]
  );

  const handlePlanCommentInSprint = useCallback(
    (commentId: string, targetSprintId: number) => {
      const comment = comments.find((item) => item.id === commentId);
      const sourceSprintId = selectedSprintId;
      if (!comment || sourceSprintId == null || targetSprintId === sourceSprintId) {
        return;
      }
      moveCommentToSprintFirstDay({ comment, fromSprintId: sourceSprintId, toSprintId: targetSprintId })
        .then((moved) => {
          if (!moved) {
            toast.error(t(FAILED_KEY));
            return;
          }
          moveStore.start({
            comment,
            kind: 'comment',
            sourceLinkIds: linkIdsTouching(taskLinks, toSwimlaneCommentTaskId(commentId)),
            sourceSprintId,
            targetSprintId,
            targetSprintName: sprintName(sprints, targetSprintId),
          });
          enterTargetSprint(targetSprintId);
        })
        .catch(() => toast.error(t(FAILED_KEY)));
    },
    [comments, enterTargetSprint, moveStore, selectedSprintId, sprints, t, taskLinks]
  );

  // Ушли из целевого спринта не через панель режима. Задача остаётся где была,
  // заметка уже переехала — снимаем её старые связи.
  useEffect(() => {
    const session = moveStore.session;
    if (!session || selectedSprintId === session.targetSprintId) {
      return;
    }
    if (moveStore.staged || selectedSprintId !== session.sourceSprintId) {
      if (session.kind === 'comment') {
        cleanupSourceSprint(session).catch(() => undefined);
      }
      moveStore.finish();
    }
  }, [moveStore, selectedSprintId]);

  // Целевой спринт загружен — ставим карточку. Задачу держим в черновике, даже если её сняли с доски,
  // чтобы повторная постановка тоже не записывалась до подтверждения. Бейзлайна у неё нет до сохранения:
  // иначе перенесённая карточка сразу «отстаёт» от места, где её впервые поставили.
  useEffect(
    () =>
      autorun(() => {
        const session = moveStore.session;
        if (
          !session ||
          moveStore.saving ||
          tasksLoading ||
          selectedSprintId !== session.targetSprintId ||
          positionsStore.positionsSettledSprintId !== session.targetSprintId ||
          positionsStore.positionsLoadPending
        ) {
          return;
        }
        if (session.kind === 'comment') {
          if (!moveStore.staged) moveStore.markStaged();
          return;
        }
        if (moveStore.staged) {
          const placed = positionsStore.positions.get(session.task.id);
          if (placed && hasPlanBaseline(placed)) {
            positionsStore.stagePlanDraft([withoutPlanBaseline(placed)], [session.task.id]);
          } else if (!positionsStore.draftTaskIds.has(session.task.id)) {
            positionsStore.stagePlanDraft([], [session.task.id]);
          }
          return;
        }
        const position = buildMovedTaskDraftPosition({
          developers,
          sourceDuration: session.sourcePositionDuration,
          task: session.task,
        });
        positionsStore.stagePlanDraft(position ? [position] : [], [session.task.id]);
        moveStore.markStaged();
      }),
    [developers, moveStore, positionsStore, selectedSprintId, tasksLoading]
  );

  const cancelMovePlacement = useCallback(async () => {
    const session = moveStore.session;
    if (!session || moveStore.saving) {
      return;
    }
    if (session.kind === 'task') {
      positionsStore.discardPlanDraft();
    } else {
      moveStore.setSaving(true);
      const reverted = await revertCommentMove({
        comment: session.comment,
        fromSprintId: session.sourceSprintId,
        toSprintId: session.targetSprintId,
      });
      if (!reverted) {
        moveStore.setSaving(false);
        toast.error(t(FAILED_KEY));
        return;
      }
    }
    moveStore.finish();
    onSprintChange(session.sourceSprintId);
  }, [moveStore, onSprintChange, positionsStore, t]);

  const confirmTaskMove = useCallback(
    async (session: Extract<SprintMovePlacementSession, { kind: 'task' }>) => {
      const placed = positionsStore.positions.get(session.task.id);
      if (!placed) {
        return;
      }
      moveStore.setSaving(true);
      const added = await addIssueToSprint(session.task.id, session.targetSprintId);
      if (!added) {
        moveStore.setSaving(false);
        toast.error(t(FAILED_KEY));
        return;
      }
      const finalPosition = positionsStore.positions.get(session.task.id) ?? placed;
      positionsStore.stagePlanDraft([withPlanBaselineAtPosition(finalPosition)], [session.task.id]);
      const committed = await positionsStore.commitPlanDraft();
      // Индекс Tracker отстаёт: кэши правим руками, без refetch.
      upsertSprintTaskInQueries(queryClient, session.targetSprintId, session.task);
      removeSprintTaskFromQueries(queryClient, session.sourceSprintId, session.task.id);
      await cleanupSourceSprint(session);
      moveStore.finish();
      onSprintChange(session.sourceSprintId);
      const params = { key: session.task.id, name: session.targetSprintName };
      if (committed.ok) {
        toast.success(t('sprintPlanner.swimlane.movePlacement.saved', params));
      } else {
        toast.error(t('sprintPlanner.swimlane.movePlacement.savedWithoutPlan', params));
      }
    },
    [moveStore, onSprintChange, positionsStore, queryClient, t]
  );

  const confirmMovePlacement = useCallback(async () => {
    const session = moveStore.session;
    if (!session || moveStore.saving) {
      return;
    }
    if (session.kind === 'task') {
      await confirmTaskMove(session);
      return;
    }
    moveStore.setSaving(true);
    await cleanupSourceSprint(session);
    moveStore.finish();
    onSprintChange(session.sourceSprintId);
    toast.success(
      t('sprintPlanner.swimlane.movePlacement.commentSaved', { name: session.targetSprintName })
    );
  }, [confirmTaskMove, moveStore, onSprintChange, t]);

  // Карточка могла оказаться за краем доски: прокручиваем к ней и подсвечиваем, как из уведомления.
  const focusMovedCard = useCallback(() => {
    const session = moveStore.session;
    if (!session) {
      return;
    }
    const cardId =
      session.kind === 'task' ? session.task.id : toSwimlaneCommentTaskId(session.comment.id);
    tryScrollPlannerToTaskElement({
      container: scrollContainerRef.current,
      focusTaskId: cardId,
      onFound: () => {
        sprintPlannerUi.setNotificationFocusTaskId(cardId);
        setTimeout(() => {
          if (sprintPlannerUi.notificationFocusTaskId === cardId) {
            sprintPlannerUi.clearNotificationFocusTaskId();
          }
        }, PLANNER_NOTIFICATION_FOCUS_MS);
      },
      onGiveUp: () => undefined,
    });
  }, [moveStore, scrollContainerRef, sprintPlannerUi]);

  const toolbar = useMemo(() => {
    const reportFailure = (error: unknown) => {
      console.error('Failed to finish sprint move placement:', error);
      moveStore.setSaving(false);
      toast.error(t(FAILED_KEY));
    };
    return {
      onFocusCard: focusMovedCard,
      onCancel: () => {
        cancelMovePlacement().catch(reportFailure);
      },
      onConfirm: () => {
        confirmMovePlacement().catch(reportFailure);
      },
    };
  }, [cancelMovePlacement, confirmMovePlacement, focusMovedCard, moveStore, t]);

  return { handlePlanCommentInSprint, handlePlanInSprint, toolbar };
}
