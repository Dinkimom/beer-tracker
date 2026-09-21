import type {
  OccupancyRowFieldsVisibility,
  OccupancyRowView,
  OccupancyTimelineScale,
  OccupancyTimelineSettings,
  SwimlaneCardFieldsVisibility,
} from '@/hooks/useLocalStorage';
import type { SidebarGroupBy } from '@/types';

export type PlanningGanttTab = 'epics' | 'kanban' | 'quarterly-v2' | 'sprint' | 'swimlane';

export interface SettingsPlanningTabProps {
  epicOccupancyRowFields: OccupancyRowFieldsVisibility;
  epicOccupancyRowView: OccupancyRowView;
  epicTimelineSettings: OccupancyTimelineSettings;
  ganttTab: PlanningGanttTab;
  kanbanGroupBy: SidebarGroupBy;
  linksDimOnHover: boolean;
  occupancyRowFields: OccupancyRowFieldsVisibility;
  occupancyRowView: OccupancyRowView;
  occupancyTimelineScale: OccupancyTimelineScale;
  quarterlyV2RowFields: OccupancyRowFieldsVisibility;
  quarterlyV2RowView: OccupancyRowView;
  quarterlyV2ShowPlannedTasks: boolean;
  quarterlyV2TimelineSettings: OccupancyTimelineSettings;
  swimlaneCalendarBusyVisible: boolean;
  swimlaneCardFields: SwimlaneCardFieldsVisibility;
  /** Fact timeline (“in progress”) under the swimlane row */
  swimlaneFactTimelineVisible: boolean;
  swimlaneLinksVisible: boolean;
  timelineSettings: OccupancyTimelineSettings;
  setEpicOccupancyRowFields: (
    v: OccupancyRowFieldsVisibility | ((prev: OccupancyRowFieldsVisibility) => OccupancyRowFieldsVisibility)
  ) => void;
  setEpicOccupancyRowView: (v: OccupancyRowView) => void;
  setEpicTimelineSettings: (
    v: OccupancyTimelineSettings | ((prev: OccupancyTimelineSettings) => OccupancyTimelineSettings)
  ) => void;
  setGanttTab: (v: PlanningGanttTab) => void;
  setKanbanGroupBy: (v: SidebarGroupBy) => void;
  setLinksDimOnHover: (v: boolean) => void;
  setOccupancyRowFields: (
    v: OccupancyRowFieldsVisibility | ((prev: OccupancyRowFieldsVisibility) => OccupancyRowFieldsVisibility)
  ) => void;
  setOccupancyRowView: (v: OccupancyRowView) => void;
  setOccupancyTimelineScale: (
    v: OccupancyTimelineScale | ((prev: OccupancyTimelineScale) => OccupancyTimelineScale)
  ) => void;
  setQuarterlyV2RowFields: (
    v: OccupancyRowFieldsVisibility | ((prev: OccupancyRowFieldsVisibility) => OccupancyRowFieldsVisibility)
  ) => void;
  setQuarterlyV2RowView: (v: OccupancyRowView) => void;
  setQuarterlyV2ShowPlannedTasks: (v: boolean) => void;
  setQuarterlyV2TimelineSettings: (
    v: OccupancyTimelineSettings | ((prev: OccupancyTimelineSettings) => OccupancyTimelineSettings)
  ) => void;
  setSwimlaneCalendarBusyVisible: (v: boolean) => void;
  setSwimlaneCardFields: (
    v: SwimlaneCardFieldsVisibility | ((prev: SwimlaneCardFieldsVisibility) => SwimlaneCardFieldsVisibility)
  ) => void;
  setSwimlaneFactTimelineVisible: (v: boolean) => void;
  setSwimlaneLinksVisible: (v: boolean) => void;
  setTimelineSettings: (
    v: OccupancyTimelineSettings | ((prev: OccupancyTimelineSettings) => OccupancyTimelineSettings)
  ) => void;
}
