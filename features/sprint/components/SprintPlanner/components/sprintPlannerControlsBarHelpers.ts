import type { BoardViewMode } from '@/hooks/useLocalStorage';

type Translate = (key: string) => string;

export type ControlsBarViewModeSelectValue = 'features' | 'kanban' | 'swimlanes';

export function resolveControlsBarViewModeSelectValue(
  viewMode: BoardViewMode
): ControlsBarViewModeSelectValue {
  if (viewMode === 'kanban') return 'kanban';
  if (viewMode === 'features') return 'features';
  return 'swimlanes';
}

export function resolveTasksReloadButtonTitle(
  isReloading: boolean,
  selectedSprintId: number | null,
  t: Translate
): string {
  if (isReloading) return t('sprintPlanner.controls.reloadInProgress');
  if (selectedSprintId) return t('sprintPlanner.controls.reloadFromTracker');
  return t('sprintPlanner.controls.selectSprintFirst');
}

export function applyControlsBarViewModeChange(
  value: ControlsBarViewModeSelectValue,
  setViewMode: (value: BoardViewMode | ((prev: BoardViewMode) => BoardViewMode)) => void
): void {
  if (value === 'kanban') {
    setViewMode('kanban');
    return;
  }
  if (value === 'features') {
    setViewMode('features');
    return;
  }
  setViewMode((prev: BoardViewMode) => (prev === 'full' || prev === 'compact' ? prev : 'full'));
}
