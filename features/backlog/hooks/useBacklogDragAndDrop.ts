/**
 * Хук для управления drag-and-drop операциями в бэклоге
 */

import type { Developer, Task } from '@/types';
import type { SprintListItem } from '@/types/tracker';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';

import { useI18n } from '@/contexts/LanguageContext';
import { useDemoPlannerBoardsQueryScope } from '@/features/board/demoPlannerBoardsQueryScope';

import { resolveBacklogDragMoveContext } from './backlogDragAndDropMoveHelpers';
import { executeBacklogDragMove } from './useBacklogDragAndDropHelpers';

interface UseBacklogDragAndDropProps {
  activeSprints: SprintListItem[];
  backlogDevelopers: Developer[];
  backlogTasks: Task[];
  boardId: number | null;
  addTask: (task: Task) => void;
  removeTask: (taskId: string) => void;
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
  backlogDevelopers,
  addTask,
  removeTask,
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
      if (isMovingRef.current) return;

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

      setIsMovingTask(true);
      isMovingRef.current = true;
      try {
        await executeBacklogDragMove(moveContext, {
          addTask,
          backlogDevelopers,
          boardId,
          forDemoPlanner,
          queryClient,
          removeTask,
          t,
        });
      } catch (error) {
        console.error('Error moving task:', error);
      } finally {
        setIsMovingTask(false);
        isMovingRef.current = false;
      }
    },
    [activeSprints, addTask, boardId, backlogDevelopers, backlogTasks, forDemoPlanner, queryClient, removeTask, t]
  );

  return {
    activeTaskId,
    isMovingTask,
    handleDragStart,
    handleDragEnd,
  };
}
