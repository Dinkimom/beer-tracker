import type { SprintTab } from '@/components/PageHeader';
import type { PlanningGanttTab } from '@/components/SettingsModal/tabs/SettingsPlanningTab.types';
import type { BoardViewMode } from '@/hooks/useLocalStorage';

type SettingsMainTab = 'general' | 'planning' | 'ytracker';

/**
 * Какой таб модалки настроек и подтаб «Планирование» соответствуют текущей странице приложения.
 *
 * @param boardViewMode — режим доски спринта из localStorage (`useBoardViewModeStorage`):
 * «Канбан» → kanban, иначе (и вне доски) → swimlane.
 */
export function getSettingsTabsForPage(
  activeSprintTab: SprintTab,
  boardViewMode: BoardViewMode | null
): { mainTab: SettingsMainTab; planningGanttTab: PlanningGanttTab } {
  const onKanban = activeSprintTab === 'board' && boardViewMode === 'kanban';
  return { mainTab: 'planning', planningGanttTab: onKanban ? 'kanban' : 'swimlane' };
}
