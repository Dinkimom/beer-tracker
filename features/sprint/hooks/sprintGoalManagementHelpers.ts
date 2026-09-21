import type { QueryClient } from '@tanstack/react-query';

export interface GoalsData {
  checklistDone: number;
  checklistItems: Array<{ id: string; text: string; checked: boolean; checklistItemType: string }>;
  checklistTotal: number;
}

export type SprintGoalsQueryKey =
  | readonly ['sprintGoals', 'demo', number | null, 'delivery' | 'discovery']
  | readonly ['sprintGoals', number | null, 'delivery' | 'discovery'];

export function invalidateSprintScoreQuery(
  queryClient: QueryClient | null | undefined,
  sprintId: number | null,
  forDemoPlanner: boolean
): void {
  if (!queryClient || sprintId == null || sprintId <= 0) {
    return;
  }
  const scoreKey = forDemoPlanner
    ? (['sprintScore', 'demo', sprintId] as const)
    : (['sprintScore', sprintId] as const);
  queryClient.invalidateQueries({ queryKey: scoreKey }).catch(() => {
    /* invalidate не критичен для UX целей */
  });
}

export function restoreGoalsQueryData(
  queryClient: QueryClient,
  queryKey: SprintGoalsQueryKey,
  prevGoalsData: GoalsData | undefined
): void {
  if (prevGoalsData !== undefined) {
    queryClient.setQueryData(queryKey, prevGoalsData);
    return;
  }
  queryClient.removeQueries({ queryKey });
}

export function applyCheckboxOptimisticUpdate(
  queryClient: QueryClient,
  queryKey: SprintGoalsQueryKey,
  itemId: string,
  checked: boolean
): GoalsData | undefined {
  const prevGoalsData = queryClient.getQueryData<GoalsData>(queryKey);
  queryClient.setQueryData<GoalsData>(queryKey, (old) => {
    if (!old?.checklistItems) return old;
    const nextItems = old.checklistItems.map((it) =>
      it.id === itemId ? { ...it, checked } : it
    );
    const checklistDone = nextItems.filter((it) => it.checked).length;
    return { ...old, checklistItems: nextItems, checklistDone };
  });
  return prevGoalsData;
}

export function applyAddGoalOptimisticUpdate(
  queryClient: QueryClient,
  queryKey: SprintGoalsQueryKey,
  optimisticItem: GoalsData['checklistItems'][number]
): GoalsData | undefined {
  const prevGoalsData = queryClient.getQueryData<GoalsData>(queryKey);
  queryClient.setQueryData<GoalsData>(queryKey, (old) => {
    const items = old?.checklistItems ?? [];
    const total = old?.checklistTotal ?? items.length;
    return {
      ...old,
      checklistItems: [...items, optimisticItem],
      checklistTotal: total + 1,
      checklistDone: old?.checklistDone ?? 0,
    } as GoalsData;
  });
  return prevGoalsData;
}

export function replaceTempGoalWithServerItem(
  queryClient: QueryClient,
  queryKey: SprintGoalsQueryKey,
  tempId: string,
  serverItem: GoalsData['checklistItems'][number],
  fallbackText: string
): void {
  queryClient.setQueryData<GoalsData>(queryKey, (old) => {
    if (!old) return old;
    const itemWithText = serverItem.text?.trim()
      ? serverItem
      : { ...serverItem, text: fallbackText };
    return {
      ...old,
      checklistItems: old.checklistItems.map((it) =>
        it.id === tempId ? itemWithText : it
      ),
    };
  });
}

export function applyEditGoalOptimisticUpdate(
  queryClient: QueryClient,
  queryKey: SprintGoalsQueryKey,
  itemId: string,
  text: string
): GoalsData | undefined {
  const prevGoalsData = queryClient.getQueryData<GoalsData>(queryKey);
  queryClient.setQueryData<GoalsData>(queryKey, (old) => {
    if (!old?.checklistItems) return old;
    return {
      ...old,
      checklistItems: old.checklistItems.map((it) =>
        it.id === itemId ? { ...it, text } : it
      ),
    };
  });
  return prevGoalsData;
}

export function applyDeleteGoalOptimisticUpdate(
  queryClient: QueryClient,
  queryKey: SprintGoalsQueryKey,
  itemId: string
): GoalsData | undefined {
  const prevGoalsData = queryClient.getQueryData<GoalsData>(queryKey);
  queryClient.setQueryData<GoalsData>(queryKey, (old) => {
    if (!old?.checklistItems) return old;
    const nextItems = old.checklistItems.filter((it) => it.id !== itemId);
    const checklistDone = nextItems.filter((it) => it.checked).length;
    return {
      ...old,
      checklistItems: nextItems,
      checklistTotal: nextItems.length,
      checklistDone,
    };
  });
  return prevGoalsData;
}
