import type { SprintGoalsQueryKey } from './sprintGoalManagementHelpers';
import type { QueryClient } from '@tanstack/react-query';

import {
  createGoalOnServer,
  handleAddGoalServerResult,
} from './sprintGoalManagementAddHelpers';

export async function submitAddGoalRequest(input: {
  boardId: number | null;
  forDemoPlanner: boolean;
  getTeamByBoardId: (boardId: number) => string | null | undefined;
  goalType: 'delivery' | 'discovery';
  onGoalsUpdate?: () => void;
  queryClient: QueryClient | null;
  queryKey: SprintGoalsQueryKey;
  sprintId: number;
  tempId: string;
  text: string;
}): Promise<void> {
  const result = await createGoalOnServer({
    boardId: input.boardId,
    getTeamByBoardId: input.getTeamByBoardId,
    goalType: input.goalType,
    sprintId: input.sprintId,
    text: input.text,
  });

  handleAddGoalServerResult({
    forDemoPlanner: input.forDemoPlanner,
    item: result.item,
    onGoalsUpdate: input.onGoalsUpdate,
    queryClient: input.queryClient,
    queryKey: input.queryKey,
    result,
    sprintId: input.sprintId,
    tempId: input.tempId,
    text: input.text,
  });
}
