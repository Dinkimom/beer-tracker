import type { QueryClient } from '@tanstack/react-query';

export function invalidateSprintTasksQueries(
  queryClient: QueryClient,
  selectedSprintId: number,
  boardIdForPlannerData: number | null
) {
  queryClient.invalidateQueries({
    queryKey: ['tasks', selectedSprintId, boardIdForPlannerData ?? null],
  });
  queryClient.invalidateQueries({
    queryKey: ['tasks', 'occupancy', selectedSprintId, boardIdForPlannerData ?? null],
  });
}

export function shouldInvalidateOnOrgChange(
  prev: { orgId: string | null; sprintId: number | null } | null,
  orgId: string | null,
  selectedSprintId: number
): boolean {
  return (
    prev != null &&
    prev.sprintId === selectedSprintId &&
    prev.orgId !== orgId &&
    orgId != null &&
    prev.orgId != null
  );
}
