import { formatPointsForDisplay, formatSprintTotalsPointsLabels } from '@/lib/pointsUtils';

export function kanbanLaneHeaderAriaLabel(
  isLaneCollapsed: boolean,
  t: (key: string) => string
): string {
  return isLaneCollapsed
    ? t('sprintPlanner.kanban.expandGroup')
    : t('sprintPlanner.kanban.collapseGroup');
}

export function kanbanLaneHeaderTotalsLabel(
  filteredCount: number,
  totalSp: number,
  totalTp: number
): string {
  const { tpLabel } = formatSprintTotalsPointsLabels(totalSp, totalTp, 'spaced');
  const tpSuffix = tpLabel ? ` · ${tpLabel}` : '';
  return `${filteredCount} · ${formatPointsForDisplay(totalSp)} sp${tpSuffix}`;
}

export function createKanbanLaneToggleKeyDownHandler(
  laneKey: string,
  toggleLaneCollapsed: (laneKey: string) => void
) {
  return (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    toggleLaneCollapsed(laneKey);
  };
}
