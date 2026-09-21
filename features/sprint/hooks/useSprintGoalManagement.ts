'use client';

import type { QueryClient } from '@tanstack/react-query';

import { useState } from 'react';

import { useDemoPlannerBoardsQueryScope } from '@/features/board/demoPlannerBoardsQueryScope';
import { useBoards } from '@/features/board/hooks/useBoards';

import { applyDeleteGoalOptimisticUpdate } from './sprintGoalManagementHelpers';
import {
  runAddGoalUpdate,
  runCheckboxGoalUpdate,
  runDeleteGoalUpdate,
  runEditGoalUpdate,
} from './useSprintGoalManagementHelpers';

interface UseSprintGoalManagementProps {
  /** ID доски — используется для подстановки команды (team) при создании цели */
  boardId?: number | null;
  goalType: 'delivery' | 'discovery';
  queryClient?: QueryClient | null;
  sprintId: number | null;
  onGoalsUpdate?: () => void;
}

export function useSprintGoalManagement({
  goalType,
  sprintId,
  boardId = null,
  queryClient = null,
  onGoalsUpdate,
}: UseSprintGoalManagementProps) {
  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set());
  const { getTeamByBoardId } = useBoards();
  const forDemoPlanner = useDemoPlannerBoardsQueryScope();

  const queryKey = forDemoPlanner
    ? (['sprintGoals', 'demo', sprintId, goalType] as const)
    : (['sprintGoals', sprintId, goalType] as const);

  const handleCheckboxChange = async (itemId: string, checked: boolean): Promise<void> => {
    if (updatingItems.has(itemId)) return;

    setUpdatingItems((prev) => new Set(prev).add(itemId));
    try {
      await runCheckboxGoalUpdate({
        checked,
        forDemoPlanner,
        itemId,
        onGoalsUpdate,
        queryClient,
        queryKey,
        sprintId,
      });
    } finally {
      setUpdatingItems((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  };

  const handleAddGoal = async (text: string): Promise<void> => {
    if (sprintId == null) {
      throw new Error('Sprint must be selected');
    }

    setUpdatingItems((prev) => new Set(prev).add('new'));
    try {
      await runAddGoalUpdate({
        boardId,
        forDemoPlanner,
        getTeamByBoardId,
        goalType,
        onGoalsUpdate,
        queryClient,
        queryKey,
        sprintId,
        text,
      });
    } finally {
      setUpdatingItems((prev) => {
        const next = new Set(prev);
        next.delete('new');
        return next;
      });
    }
  };

  const handleEditGoal = async (itemId: string, text: string): Promise<void> => {
    setUpdatingItems((prev) => new Set(prev).add(itemId));
    try {
      await runEditGoalUpdate({
        itemId,
        onGoalsUpdate,
        queryClient,
        queryKey,
        text,
      });
    } finally {
      setUpdatingItems((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  };

  const handleDeleteGoal = async (itemId: string): Promise<void> => {
    if (updatingItems.has(itemId)) return;

    const isTempId = itemId.startsWith('temp-');
    setUpdatingItems((prev) => new Set(prev).add(itemId));

    if (isTempId) {
      if (queryClient) {
        applyDeleteGoalOptimisticUpdate(queryClient, queryKey, itemId);
      }
      setUpdatingItems((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
      return;
    }

    try {
      await runDeleteGoalUpdate({
        forDemoPlanner,
        isTempId: false,
        itemId,
        onGoalsUpdate,
        queryClient,
        queryKey,
        sprintId,
      });
    } finally {
      setUpdatingItems((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  };

  return {
    updatingItems,
    handleCheckboxChange,
    handleAddGoal,
    handleEditGoal,
    handleDeleteGoal,
  };
}
