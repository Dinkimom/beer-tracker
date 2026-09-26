import { DEVELOPER_CALDAV_CREDENTIALS_STORAGE_KEY } from '@/lib/calendar/developerCalDavCredentialsStorage';
import { TRACKER_OAUTH_LOCAL_STORAGE_KEY } from '@/lib/trackerTokenStorage';

export const STORAGE_KEYS = {
  POSITIONS: 'beer-tracker-task-positions',
  LINKS: 'beer-tracker-task-links',
  SIDEBAR_OPEN: 'beer-tracker-sidebar-open',
  SIDEBAR_WIDTH: 'beer-tracker-sidebar-width',
  /** Ширина правого сайдера «Информация о задаче» */
  TASK_INFO_SIDEBAR_WIDTH: 'beer-tracker-task-info-sidebar-width',
  /** Ширина правого сайдера уведомлений */
  NOTIFICATIONS_SIDEBAR_WIDTH: 'beer-tracker-notifications-sidebar-width',
  COMMENTS: 'beer-tracker-comments',
  SIDEBAR_GROUP_BY: 'beer-tracker-sidebar-group-by',
  SIDEBAR_STATUS_FILTER: 'beer-tracker-sidebar-status-filter',
  DEVELOPERS_SORT: 'beer-tracker-developers-sort',
  DEVELOPERS_HIDDEN: 'beer-tracker-developers-hidden',
  DEVELOPERS_ORDER: 'beer-tracker-developers-order',
  SELECTED_SPRINT: 'beer-tracker-selected-sprint',
  SELECTED_BOARD: 'beer-tracker-selected-board',
  THEME: 'beer-tracker-theme',
  LANGUAGE: 'beer-tracker-language',
  CHRISTMAS_THEME: 'beer-tracker-christmas-theme',
  TRACKER_TOKEN: TRACKER_OAUTH_LOCAL_STORAGE_KEY,
  /** CalDAV Mail.ru (URL + app-password) по id исполнителя — только localStorage */
  DEVELOPER_CALDAV_CREDENTIALS: DEVELOPER_CALDAV_CREDENTIALS_STORAGE_KEY,
  OCCUPANCY_FACT_VISIBLE: 'beer-tracker-occupancy-fact-visible',
  SWIMLANE_LINKS_VISIBLE: 'beer-tracker-swimlane-links-visible',
  /** Таймлайн факта «В работе» под строкой свимлейна (независимо от факта в занятости) */
  SWIMLANE_FACT_TIMELINE_VISIBLE: 'beer-tracker-swimlane-fact-timeline-visible',
  /** Дорожка занятости из CalDAV под строкой свимлейна */
  SWIMLANE_CALENDAR_BUSY_VISIBLE: 'beer-tracker-swimlane-calendar-busy-visible',
  /** Текстовые стикеры на свимлейне */
  SWIMLANE_NOTES_VISIBLE: 'beer-tracker-swimlane-notes-visible',
  /** Последний цвет стикера для инструмента «Заметка» */
  SWIMLANE_STICKY_NOTE_COLOR: 'beer-tracker-swimlane-sticky-note-color',
  /** Фотокарточки на свимлейне */
  SWIMLANE_IMAGES_VISIBLE: 'beer-tracker-swimlane-images-visible',
  /** Закреплённые строки свимлейна (id исполнителей, включая общую строку) */
  SWIMLANE_PINNED_ROW_IDS: 'beer-tracker-swimlane-pinned-row-ids',
  /** Заранее заложенное число слоёв карточек в строке свимлейна (per sprint, JSON assigneeId→layers) */
  SWIMLANE_ROW_RESERVED_LAYERS: 'beer-tracker-swimlane-row-reserved-layers',
  LINKS_DIM_ON_HOVER: 'beer-tracker-links-dim-on-hover',
  OCCUPANCY_TASK_COLUMN_WIDTH: 'beer-tracker-occupancy-task-column-width',
  BOARD_VIEW_MODE: 'beer-tracker-board-view-mode',
  PARTICIPANTS_COLUMN_WIDTH: 'beer-tracker-participants-column-width',
  EXPERIMENTAL_FEATURES: 'beer-tracker-experimental-features',
  /** Показывать эмодзи праздников в шапке с датами (занятость, свимлейны) */
  SHOW_HOLIDAYS: 'beer-tracker-show-holidays',
  /** Страна календаря нерабочих дней (ISO 3166-1 alpha-2) */
  HOLIDAY_COUNTRY: 'beer-tracker-holiday-country',
  OCCUPANCY_ASSIGNEE_FILTER: 'beer-tracker-occupancy-assignee-filter',
  OCCUPANCY_STATUS_FILTER: 'beer-tracker-occupancy-status-filter',
  OCCUPANCY_TIMELINE_SETTINGS: 'beer-tracker-occupancy-timeline-settings',
  /**
   * Масштаб таймлайна занятости: полный — ~неделя во вьюпорте, остальное горизонтальным скроллом;
   * компактный — весь спринт (10 рабочих дней) по ширине экрана.
   */
  OCCUPANCY_TIMELINE_SCALE: 'beer-tracker-occupancy-timeline-scale',
  /** Компактный режим строк занятости (в UI — «Компактный») */
  OCCUPANCY_OLD_TM_LAYOUT: 'beer-tracker-occupancy-old-tm-layout',
  /** Набор полей, отображаемых в строке занятости */
  OCCUPANCY_ROW_FIELDS: 'beer-tracker-occupancy-row-fields',
  /** Настройки отображения занятости эпиков (отдельно от спринта) */
  EPIC_OCCUPANCY_TIMELINE_SETTINGS: 'beer-tracker-epic-occupancy-timeline-settings',
  EPIC_OCCUPANCY_OLD_TM_LAYOUT: 'beer-tracker-epic-occupancy-old-tm-layout',
  EPIC_OCCUPANCY_ROW_FIELDS: 'beer-tracker-epic-occupancy-row-fields',
  /** Настройки отображения квартального планирования v2 (отдельно от эпика) */
  QUARTERLY_V2_OCCUPANCY_TIMELINE_SETTINGS: 'beer-tracker-quarterly-v2-occupancy-timeline-settings',
  QUARTERLY_V2_OCCUPANCY_OLD_TM_LAYOUT: 'beer-tracker-quarterly-v2-occupancy-old-tm-layout',
  QUARTERLY_V2_OCCUPANCY_ROW_FIELDS: 'beer-tracker-quarterly-v2-occupancy-row-fields',
  QUARTERLY_V2_SHOW_PLANNED_TASKS: 'beer-tracker-quarterly-v2-show-planned-tasks',
  SWIMLANE_CARD_FIELDS: 'beer-tracker-swimlane-card-fields',
  /**
   * Упаковка бейзлайна просрочки: compact | noOverlap.
   * Тот же ключ, что раньше был boolean «показывать просрочку».
   */
  SWIMLANE_BASELINE_LAYOUT_MODE: 'beer-tracker-swimlane-overdue-visible',
  KANBAN_GROUP_BY: 'beer-tracker-kanban-group-by',
  SIDEBAR_TABS: 'beer-tracker-sidebar-tabs',
  /** Глобальные настройки синхронизации данных с трекером */
  DATA_SYNC_ESTIMATES: 'beer-tracker-data-sync-estimates',
  DATA_SYNC_ASSIGNEES: 'beer-tracker-data-sync-assignees',
  /** Раскраска фаз занятости и карточек на доске: по статусу или монохром (как бэклог) */
  PLANNING_PHASE_CARD_COLOR_SCHEME: 'beer-tracker-planning-phase-card-color-scheme',
  /** Закрытый истёкший таймер планера (префикс + id спринта) */
  SPRINT_TIMER_DISMISSED_FINISHED_PREFIX: 'beer-tracker-sprint-timer-dismissed',
  /** Тур планера и одноразовые подсказки (JSON) */
  PLANNER_ONBOARDING: 'beer-tracker-planner-onboarding',
} as const;
