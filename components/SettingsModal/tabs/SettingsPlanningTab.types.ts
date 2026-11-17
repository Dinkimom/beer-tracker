import type { TaskCardBoard } from '@/lib/taskCard/taskCardSlots';
import type { SidebarGroupBy } from '@/types';

export type PlanningGanttTab = 'kanban' | 'swimlane';

export interface SettingsPlanningTabProps {
  ganttTab: PlanningGanttTab;
  kanbanGroupBy: SidebarGroupBy;
  linksDimOnHover: boolean;
  /** Fact timeline (“in progress”) under the swimlane row */
  swimlaneFactTimelineVisible: boolean;
  swimlaneLinksVisible: boolean;
  /** Открыть экран «Отображение карточки» для доски — внутри окна настроек. */
  onOpenCardDisplay: (board: TaskCardBoard) => void;
  setGanttTab: (v: PlanningGanttTab) => void;
  setKanbanGroupBy: (v: SidebarGroupBy) => void;
  setLinksDimOnHover: (v: boolean) => void;
  setSwimlaneFactTimelineVisible: (v: boolean) => void;
  setSwimlaneLinksVisible: (v: boolean) => void;
}
