import type { SidebarTasksTab } from '@/types';

import { OCCUPANCY_FACT_STATUS_BAND_PX } from '@/features/gitlab/utils/gitlabFactTimelineLayoutHelpers';

import { applyUnplannedWarningHeight, computeUnplannedWarning } from './occupancyTableBodyRowMetricsHelpers';

const OCCUPANCY_TASK_ROW_MIN_HEIGHT = 56;
const OCCUPANCY_TASK_ROW_LEGACY_TM_MIN_HEIGHT = 40;
const ROW_BORDER_PX = 1;

export { computeUnplannedWarning };

export function computeRowMinHeight(
  legacyCompactLayout: boolean,
  factVisible: boolean,
  factRowHeightPx: number = OCCUPANCY_FACT_STATUS_BAND_PX
): number {
  if (legacyCompactLayout) {
    return factVisible
      ? OCCUPANCY_TASK_ROW_LEGACY_TM_MIN_HEIGHT + factRowHeightPx + 12
      : OCCUPANCY_TASK_ROW_LEGACY_TM_MIN_HEIGHT;
  }
  return factVisible
    ? OCCUPANCY_TASK_ROW_MIN_HEIGHT + factRowHeightPx + 12
    : OCCUPANCY_TASK_ROW_MIN_HEIGHT;
}

export function computePlanRowHeightPx(params: {
  legacyCompactLayout: boolean;
  rowMinHeight: number;
  taskId: string;
  taskRowHeights: Map<string, number>;
  unplannedWarning: SidebarTasksTab | null;
}): number {
  const { taskRowHeights, taskId, rowMinHeight, unplannedWarning, legacyCompactLayout } = params;

  let planRowHeight = Math.max(
    rowMinHeight - ROW_BORDER_PX,
    (taskRowHeights.get(taskId) ?? rowMinHeight) - ROW_BORDER_PX
  );
  planRowHeight = applyUnplannedWarningHeight(
    planRowHeight,
    rowMinHeight,
    unplannedWarning,
    legacyCompactLayout
  );
  return planRowHeight;
}
