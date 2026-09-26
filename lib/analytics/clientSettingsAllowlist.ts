import { STORAGE_KEYS } from '@/hooks/localStorage/storageKeys';

/** Версия JSON снимка настроек; повышение само меняет хеш и переотправляет снимок. */
export const CLIENT_SETTINGS_PAYLOAD_VERSION = 3;

/**
 * Канонические ключи payload → ключи localStorage.
 * Секреты, контент заметок и легаси positions/links/comments сюда не входят.
 */
export const CLIENT_SETTINGS_FIELDS = {
  boardViewMode: STORAGE_KEYS.BOARD_VIEW_MODE,
  christmasTheme: STORAGE_KEYS.CHRISTMAS_THEME,
  dataSyncAssignees: STORAGE_KEYS.DATA_SYNC_ASSIGNEES,
  dataSyncEstimates: STORAGE_KEYS.DATA_SYNC_ESTIMATES,
  developersSort: STORAGE_KEYS.DEVELOPERS_SORT,
  epicOccupancyOldTmLayout: STORAGE_KEYS.EPIC_OCCUPANCY_OLD_TM_LAYOUT,
  epicOccupancyRowFields: STORAGE_KEYS.EPIC_OCCUPANCY_ROW_FIELDS,
  epicOccupancyTimelineSettings: STORAGE_KEYS.EPIC_OCCUPANCY_TIMELINE_SETTINGS,
  experimentalFeatures: STORAGE_KEYS.EXPERIMENTAL_FEATURES,
  holidayCountry: STORAGE_KEYS.HOLIDAY_COUNTRY,
  kanbanGroupBy: STORAGE_KEYS.KANBAN_GROUP_BY,
  language: STORAGE_KEYS.LANGUAGE,
  linksDimOnHover: STORAGE_KEYS.LINKS_DIM_ON_HOVER,
  occupancyFactVisible: STORAGE_KEYS.OCCUPANCY_FACT_VISIBLE,
  occupancyOldTmLayout: STORAGE_KEYS.OCCUPANCY_OLD_TM_LAYOUT,
  occupancyRowFields: STORAGE_KEYS.OCCUPANCY_ROW_FIELDS,
  occupancyStatusFilter: STORAGE_KEYS.OCCUPANCY_STATUS_FILTER,
  occupancyTimelineScale: STORAGE_KEYS.OCCUPANCY_TIMELINE_SCALE,
  occupancyTimelineSettings: STORAGE_KEYS.OCCUPANCY_TIMELINE_SETTINGS,
  planningPhaseCardColorScheme: STORAGE_KEYS.PLANNING_PHASE_CARD_COLOR_SCHEME,
  quarterlyV2OccupancyOldTmLayout: STORAGE_KEYS.QUARTERLY_V2_OCCUPANCY_OLD_TM_LAYOUT,
  quarterlyV2OccupancyRowFields: STORAGE_KEYS.QUARTERLY_V2_OCCUPANCY_ROW_FIELDS,
  quarterlyV2OccupancyTimelineSettings: STORAGE_KEYS.QUARTERLY_V2_OCCUPANCY_TIMELINE_SETTINGS,
  quarterlyV2ShowPlannedTasks: STORAGE_KEYS.QUARTERLY_V2_SHOW_PLANNED_TASKS,
  selectedBoard: STORAGE_KEYS.SELECTED_BOARD,
  selectedSprint: STORAGE_KEYS.SELECTED_SPRINT,
  showHolidays: STORAGE_KEYS.SHOW_HOLIDAYS,
  sidebarGroupBy: STORAGE_KEYS.SIDEBAR_GROUP_BY,
  sidebarStatusFilter: STORAGE_KEYS.SIDEBAR_STATUS_FILTER,
  sidebarTabs: STORAGE_KEYS.SIDEBAR_TABS,
  swimlaneBaselineLayoutMode: STORAGE_KEYS.SWIMLANE_BASELINE_LAYOUT_MODE,
  swimlaneCalendarBusyVisible: STORAGE_KEYS.SWIMLANE_CALENDAR_BUSY_VISIBLE,
  swimlaneCardFields: STORAGE_KEYS.SWIMLANE_CARD_FIELDS,
  swimlaneFactTimelineVisible: STORAGE_KEYS.SWIMLANE_FACT_TIMELINE_VISIBLE,
  swimlaneImagesVisible: STORAGE_KEYS.SWIMLANE_IMAGES_VISIBLE,
  swimlaneLinksVisible: STORAGE_KEYS.SWIMLANE_LINKS_VISIBLE,
  swimlaneNotesVisible: STORAGE_KEYS.SWIMLANE_NOTES_VISIBLE,
  theme: STORAGE_KEYS.THEME,
} as const;

type ClientSettingsFieldKey = keyof typeof CLIENT_SETTINGS_FIELDS;

const CLIENT_SETTINGS_STORAGE_KEY_SET = new Set<string>(Object.values(CLIENT_SETTINGS_FIELDS));

export function isClientSettingsStorageKey(key: string): boolean {
  return CLIENT_SETTINGS_STORAGE_KEY_SET.has(key);
}

export const CLIENT_SETTINGS_FIELD_KEYS = Object.keys(
  CLIENT_SETTINGS_FIELDS
) as ClientSettingsFieldKey[];
