import type { SidebarGroupBy } from '@/types';

export type PlanningGanttTab = 'kanban' | 'swimlane';

export interface SettingsPlanningTabProps {
  ganttTab: PlanningGanttTab;
  kanbanGroupBy: SidebarGroupBy;
  linksDimOnHover: boolean;
  /** Fact timeline (“in progress”) under the swimlane row */
  swimlaneFactTimelineVisible: boolean;
  swimlaneLinksVisible: boolean;
  setGanttTab: (v: PlanningGanttTab) => void;
  setKanbanGroupBy: (v: SidebarGroupBy) => void;
  setLinksDimOnHover: (v: boolean) => void;
  setSwimlaneFactTimelineVisible: (v: boolean) => void;
  setSwimlaneLinksVisible: (v: boolean) => void;
}
