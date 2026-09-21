import type { SprintGoalsQueryKey } from './sprintGoalManagementHelpers';
import type { QueryClient } from '@tanstack/react-query';

import { createSprintGoal } from '@/lib/api/sprintGoals';

import { reconcileAddedGoalWithServer } from './sprintGoalManagementRunHelpers';

export function createGoalOnServer(input: {
  boardId: number | null;
  getTeamByBoardId: (boardId: number) => string | null | undefined;
  goalType: 'delivery' | 'discovery';
  sprintId: number;
  text: string;
}): Promise<{ item?: { id?: string }; success: boolean; error?: string }> {
  const team = input.boardId != null ? input.getTeamByBoardId(input.boardId) ?? undefined : undefined;
  return createSprintGoal({
    sprintId: input.sprintId,
    goalType: input.goalType,
    text: input.text,
    team,
  });
}

export function handleAddGoalServerResult(input: {
  forDemoPlanner: boolean;
  item: { id?: string } | undefined;
  onGoalsUpdate?: () => void;
  queryClient: QueryClient | null;
  queryKey: SprintGoalsQueryKey;
  result: { item?: { id?: string }; success: boolean; error?: string };
  sprintId: number;
  tempId: string;
  text: string;
}): void {
  if (!input.result.success) {
    throw new Error(input.result.error ?? 'Failed to add goal');
  }
  if (input.queryClient && input.result.item) {
    reconcileAddedGoalWithServer({
      forDemoPlanner: input.forDemoPlanner,
      item: input.result.item,
      onGoalsUpdate: input.onGoalsUpdate,
      queryClient: input.queryClient,
      queryKey: input.queryKey,
      sprintId: input.sprintId,
      tempId: input.tempId,
      text: input.text,
    });
    return;
  }
  input.onGoalsUpdate?.();
}
