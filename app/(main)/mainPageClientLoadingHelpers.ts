import type { SprintTab } from '@/components/PageHeader';

export function isSprintBoardTab(tab: SprintTab): boolean {
  return tab === 'board';
}

export function isSprintPositionsGatePending(params: {
  positionsLoadPending: boolean;
  positionsSettledSprintId: number | null;
  selectedSprintId: number | null;
}): boolean {
  if (params.selectedSprintId == null) return false;
  if (params.positionsLoadPending) return true;
  return params.positionsSettledSprintId !== params.selectedSprintId;
}

/** Оверлей доски: список спринтов, задачи и позиции. Планер монтируется под оверлеем, чтобы свимлейн успел отрисоваться. */

export function isMainPageLoadingGatePending(params: {
  positionsPending: boolean;
  selectedBoardId: number | null;
  selectedSprintId: number | null;
  sprintsLoading: boolean;
  tasksPending: boolean;
}): boolean {
  if (params.selectedBoardId != null && params.sprintsLoading) return true;
  if (params.selectedSprintId == null) return false;
  return params.tasksPending || params.positionsPending;
}

export function resolveShowFullScreenLoadingFromGates(params: {
  activeTab: SprintTab;
  boardsLoading: boolean;
  boardSwitchPending: boolean;
  isMounted: boolean;
  selectedBoardId: number | null;
  sprintBoardGatesPending: boolean;
}): boolean {
  if (params.boardSwitchPending) return true;
  if (!params.isMounted) return true;
  if (params.boardsLoading && params.selectedBoardId == null) return true;
  if (!isSprintBoardTab(params.activeTab)) return false;
  return params.sprintBoardGatesPending;
}
