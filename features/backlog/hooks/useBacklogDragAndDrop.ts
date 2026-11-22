/**
 * Хук для управления drag-and-drop операциями в бэклоге
 */

import type { BacklogPlace } from '../model/backlogTaskMove';
import type { Task } from '@/types';
import type { SprintListItem } from '@/types/tracker';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';
import toast from 'react-hot-toast';

import { useI18n } from '@/contexts/LanguageContext';
import { useDemoPlannerBoardsQueryScope } from '@/features/board/demoPlannerBoardsQueryScope';

import { moveBacklogTask, TrackerMoveRejectedError } from '../model/backlogTaskMove';

import { parseBacklogSprintColumnTargetId, resolveBacklogDragMoveContext } from './backlogDragAndDropMoveHelpers';

interface UseBacklogDragAndDropProps {
  activeSprints: SprintListItem[];
  backlogTasks: Task[];
  boardId: number | null;
  /** Пока идёт массовый перенос, одиночный drag не должен писать в тот же кэш. */
  bulkMovingRef?: { current: boolean };
}

interface UseBacklogDragAndDropResult {
  activeTaskId: string | null;
  isMovingTask: boolean;
  handleDragEnd: (event: DragEndEvent) => Promise<void>;
  handleDragStart: (event: DragStartEvent) => void;
}

/**
 * Управляет логикой drag-and-drop для перемещения задач между бэклогом и спринтами
 */
export function useBacklogDragAndDrop({
  activeSprints,
  boardId,
  backlogTasks,
  bulkMovingRef,
}: UseBacklogDragAndDropProps): UseBacklogDragAndDropResult {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const forDemoPlanner = useDemoPlannerBoardsQueryScope();
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [isMovingTask, setIsMovingTask] = useState(false);
  const isMovingRef = useRef(false);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveTaskId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveTaskId(null);
      if (bulkMovingRef?.current || isMovingRef.current) return;

      const moveContext = resolveBacklogDragMoveContext({
        activeSprints,
        backlogTasks,
        boardId,
        event,
        forDemoPlanner,
        queryClient,
        t,
      });
      if (!moveContext) return;
      const to: BacklogPlace | null =
        moveContext.targetId === 'backlog-column' ? 'backlog' : parseBacklogSprintColumnTargetId(moveContext.targetId, t);
      const from: BacklogPlace = moveContext.sourceSprintId ?? 'backlog';
      if (to == null || to === from) return;

      setIsMovingTask(true);
      isMovingRef.current = true;
      try {
        await moveBacklogTask({ boardId, forDemoPlanner, queryClient }, { from, task: moveContext.taskToMove, to });
        toast.success(t(to === 'backlog' ? 'backlog.dnd.movedToBacklog' : 'backlog.dnd.movedToSprint'));
      } catch (error) {
        console.error('Error moving task:', error);
        const message =
          error instanceof Error && !(error instanceof TrackerMoveRejectedError) ? error.message : t('common.unknownError');
        toast.error(t('backlog.dnd.moveError', { message }));
      } finally {
        setIsMovingTask(false);
        isMovingRef.current = false;
      }
    },
    [
      activeSprints,
      boardId,
      backlogTasks,
      bulkMovingRef,
      forDemoPlanner,
      queryClient,
      t,
    ]
  );

  return {
    activeTaskId,
    isMovingTask,
    handleDragStart,
    handleDragEnd,
  };
}
