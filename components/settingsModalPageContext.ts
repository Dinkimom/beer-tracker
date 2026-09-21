import type { SprintTab } from '@/components/PageHeader';
import type { PlanningGanttTab } from '@/components/SettingsModal/tabs/SettingsPlanningTab.types';
import type { BoardViewMode } from '@/hooks/useLocalStorage';

import { resolveSprintBoardPlanningGanttTab } from '@/components/settingsModalSprintBoardTab';

type SettingsMainTab = 'general' | 'planning' | 'ytracker';

/**
 * Какой таб модалки настроек и подтаб «Планирование» соответствуют текущей странице приложения.
 *
 * @param boardViewMode — режим доски спринта из localStorage (`useBoardViewModeStorage`):
 * «По исполнителям» / «По фичам» → swimlane, «Канбан» → kanban. Занятость скрыта (как swimlane). Иначе `null`.
 */
export function getSettingsTabsForPage(
  activeSprintTab: SprintTab,
  boardViewMode: BoardViewMode | null
): { mainTab: SettingsMainTab; planningGanttTab: PlanningGanttTab } {
  if (activeSprintTab === 'board' && boardViewMode != null) {
    return { mainTab: 'planning', planningGanttTab: resolveSprintBoardPlanningGanttTab(boardViewMode) };
  }
  return { mainTab: 'planning', planningGanttTab: 'sprint' };
}
