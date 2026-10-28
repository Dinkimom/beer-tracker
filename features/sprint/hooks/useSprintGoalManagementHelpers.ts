import type { QueryClient } from '@tanstack/react-query';

import { createSprintGoal, deleteSprintGoal, updateSprintGoal } from '@/lib/api/sprintGoals';

import {
  applyAddGoalOptimisticUpdate,
  applyCheckboxOptimisticUpdate,
  applyDeleteGoalOptimisticUpdate,
  applyEditGoalOptimisticUpdate,
  restoreGoalsQueryData,
  type GoalsData,
  type SprintGoalsQueryKey,
} from './sprintGoalManagementHelpers';
import {
  handleCheckboxGoalSuccess,
  handleDeleteGoalResult,
  reconcileAddedGoalWithServer,
  restoreGoalsOnFailure,
} from './sprintGoalManagementRunHelpers';

export async function runCheckboxGoalUpdate(input: {
  checked: boolean;
  forDemoPlanner: boolean;
  itemId: string;
  onGoalsUpdate?: () => void;
  queryClient: QueryClient | null;
  queryKey: SprintGoalsQueryKey;
  sprintId: number | null;
}): Promise<void> {
  let prevGoalsData: GoalsData | undefined;
  if (input.queryClient) {
    prevGoalsData = applyCheckboxOptimisticUpdate(input.queryClient, input.queryKey, input.itemId, input.checked);
  }

  try {
    const success = await updateSprintGoal(input.itemId, { checked: input.checked });
    if (success) {
      handleCheckboxGoalSuccess({
        forDemoPlanner: input.forDemoPlanner,
        onGoalsUpdate: input.onGoalsUpdate,
        queryClient: input.queryClient,
        sprintId: input.sprintId,
      });
      return;
    }
    if (input.queryClient) {
      restoreGoalsQueryData(input.queryClient, input.queryKey, prevGoalsData);
    }
  } catch (err) {
    restoreGoalsOnFailure(input.queryClient, input.queryKey, prevGoalsData, err, 'Failed to update checkbox:');
  }
}

export async function runAddGoalUpdate(input: {
  boardId: number | null;
  forDemoPlanner: boolean;
  getTeamByBoardId: (boardId: number) => string | null | undefined;
  goalType: 'delivery' | 'discovery';
  onGoalsUpdate?: () => void;
  queryClient: QueryClient | null;
  queryKey: SprintGoalsQueryKey;
  sprintId: number;
  text: string;
}): Promise<void> {
  const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const optimisticItem = {
    id: tempId,
    text: input.text,
    checked: false,
    checklistItemType: 'standard',
  };
  let prevGoalsData: GoalsData | undefined;

  if (input.queryClient) {
    prevGoalsData = applyAddGoalOptimisticUpdate(input.queryClient, input.queryKey, optimisticItem);
  }

  try {
    const team =
      input.boardId != null ? input.getTeamByBoardId(input.boardId) ?? undefined : undefined;
    const result = await createSprintGoal({
      sprintId: input.sprintId,
      goalType: input.goalType,
      text: input.text,
      team,
    });
    if (!result.success) {
      throw new Error(result.error ?? 'Failed to add goal');
    }
    if (input.queryClient && result.item) {
      reconcileAddedGoalWithServer({
        forDemoPlanner: input.forDemoPlanner,
        item: result.item,
        onGoalsUpdate: input.onGoalsUpdate,
        queryClient: input.queryClient,
        queryKey: input.queryKey,
        sprintId: input.sprintId,
        tempId,
        text: input.text,
      });
    } else {
      input.onGoalsUpdate?.();
    }
  } catch (err) {
    restoreGoalsOnFailure(input.queryClient, input.queryKey, prevGoalsData, err, 'Failed to add goal:');
  }
}

export async function runEditGoalUpdate(input: {
  itemId: string;
  onGoalsUpdate?: () => void;
  queryClient: QueryClient | null;
  queryKey: SprintGoalsQueryKey;
  text: string;
}): Promise<void> {
  let prevGoalsData: GoalsData | undefined;
  if (input.queryClient) {
    prevGoalsData = applyEditGoalOptimisticUpdate(input.queryClient, input.queryKey, input.itemId, input.text);
  }

  try {
    const success = await updateSprintGoal(input.itemId, { text: input.text });
    if (!success) throw new Error('Failed to edit goal');
    if (!input.queryClient) input.onGoalsUpdate?.();
  } catch (err) {
    restoreGoalsOnFailure(input.queryClient, input.queryKey, prevGoalsData, err, 'Failed to edit goal:');
  }
}

export async function runDeleteGoalUpdate(input: {
  forDemoPlanner: boolean;
  itemId: string;
  isTempId: boolean;
  onGoalsUpdate?: () => void;
  queryClient: QueryClient | null;
  queryKey: SprintGoalsQueryKey;
  sprintId: number | null;
  t: (key: string) => string;
}): Promise<void> {
  if (input.isTempId) return;

  let prevGoalsData: GoalsData | undefined;
  if (input.queryClient) {
    prevGoalsData = applyDeleteGoalOptimisticUpdate(input.queryClient, input.queryKey, input.itemId);
  }

  try {
    const result = await deleteSprintGoal(input.itemId);
    handleDeleteGoalResult({
      forDemoPlanner: input.forDemoPlanner,
      notFound: result.notFound,
      onGoalsUpdate: input.onGoalsUpdate,
      queryClient: input.queryClient,
      resultSuccess: result.success,
      sprintId: input.sprintId,
      t: input.t,
    });
  } catch (err) {
    restoreGoalsOnFailure(input.queryClient, input.queryKey, prevGoalsData, err, 'Failed to delete goal:');
  }
}
