import type { PlanningGanttTab } from '@/components/SettingsModal/tabs/SettingsPlanningTab.types';
import type { BoardViewMode } from '@/hooks/useLocalStorage';

export function resolveSprintBoardPlanningGanttTab(
  boardViewMode: BoardViewMode
): PlanningGanttTab {
  if (boardViewMode === 'kanban') {
    return 'kanban';
  }
  return 'swimlane';
}
