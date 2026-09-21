import type { QueryClient } from '@tanstack/react-query';

import toast from 'react-hot-toast';

import { deleteSprintGoal } from '@/lib/api/sprintGoals';

import {
  invalidateSprintScoreQuery,
  replaceTempGoalWithServerItem,
  restoreGoalsQueryData,
  type GoalsData,
  type SprintGoalsQueryKey,
} from './sprintGoalManagementHelpers';

export function handleCheckboxGoalSuccess(input: {
  forDemoPlanner: boolean;
  onGoalsUpdate?: () => void;
  queryClient: QueryClient | null;
  sprintId: number | null;
}): void {
  invalidateSprintScoreQuery(input.queryClient, input.sprintId, input.forDemoPlanner);
  if (!input.queryClient) input.onGoalsUpdate?.();
}

export function reconcileAddedGoalWithServer(input: {
  forDemoPlanner: boolean;
  item: { id?: string } | undefined;
  onGoalsUpdate?: () => void;
  queryClient: QueryClient;
  queryKey: SprintGoalsQueryKey;
  sprintId: number;
  tempId: string;
  text: string;
}): void {
  const current = input.queryClient.getQueryData<GoalsData>(input.queryKey);
  const tempStillInList = current?.checklistItems?.some((it) => it.id === input.tempId);
  if (tempStillInList && input.item) {
    replaceTempGoalWithServerItem(
      input.queryClient,
      input.queryKey,
      input.tempId,
      input.item as GoalsData['checklistItems'][number],
      input.text
    );
  } else if (input.item?.id) {
    void deleteSprintGoal(input.item.id);
  }
  invalidateSprintScoreQuery(input.queryClient, input.sprintId, input.forDemoPlanner);
}

export function handleDeleteGoalResult(input: {
  forDemoPlanner: boolean;
  notFound?: boolean;
  onGoalsUpdate?: () => void;
  queryClient: QueryClient | null;
  resultSuccess: boolean;
  sprintId: number | null;
}): void {
  if (input.resultSuccess || input.notFound) {
    invalidateSprintScoreQuery(input.queryClient, input.sprintId, input.forDemoPlanner);
    if (!input.queryClient) input.onGoalsUpdate?.();
    return;
  }
  toast.error('Не удалось удалить цель на сервере, она убрана только локально');
}

export function restoreGoalsOnFailure(
  queryClient: QueryClient | null,
  queryKey: SprintGoalsQueryKey,
  prevGoalsData: GoalsData | undefined,
  error: unknown,
  logMessage: string
): never {
  if (queryClient) {
    restoreGoalsQueryData(queryClient, queryKey, prevGoalsData);
  }
  console.error(logMessage, error);
  throw error;
}
