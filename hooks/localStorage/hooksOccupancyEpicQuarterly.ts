import type { OccupancyTaskOrder } from '@/lib/api/types';
import type { SidebarGroupBy } from '@/types';

import {
  parseSwimlaneBaselineLayoutMode,
  type SwimlaneBaselineLayoutMode,
} from '@/lib/swimlane/swimlaneBaselineLayoutMode';
import { TEAM_SWIMLANE_ASSIGNEE_ID } from '@/lib/swimlane/teamSwimlaneAssignee';

import { STORAGE_KEYS } from './storageKeys';
import { useLocalStorage as useLocalStorageBase } from './useLocalStorageBase';

const DEFAULT_PINNED_SWIMLANE_ROW_IDS: string[] = [TEAM_SWIMLANE_ASSIGNEE_ID];

/**
 * Интерфейс настроек таймлайна занятости
 */
export interface OccupancyTimelineSettings {
  enabled: boolean;
  showComments: boolean;
  showFreeSlotPreview: boolean;
  /** События GitLab (merged / апрувы / pipeline) + checks в тултипе review */
  showGitlab: boolean;
  showLinks: boolean;
  showReestimations: boolean;
  showStatuses: boolean;
}

/**
 * Хук для работы с настройками таймлайна занятости
 */
export function useOccupancyTimelineSettingsStorage(): [
  OccupancyTimelineSettings,
  (settings: OccupancyTimelineSettings | ((prev: OccupancyTimelineSettings) => OccupancyTimelineSettings)) => void
] {
  const defaultValue: OccupancyTimelineSettings = {
    enabled: true,
    showStatuses: true,
    showComments: true,
    showGitlab: true,
    showReestimations: true,
    showLinks: true,
    showFreeSlotPreview: true,
  };
  return useLocalStorageBase<OccupancyTimelineSettings>(STORAGE_KEYS.OCCUPANCY_TIMELINE_SETTINGS, defaultValue);
}

/**
 * Масштаб таймлайна по ширине вьюпорта (режим «Доска» → занятость).
 * full — во вьюпорт помещается ~неделя, вторую неделю смотрите горизонтальным скроллом.
 * compact — весь спринт (10 рабочих дней) по ширине экрана.
 */
export type OccupancyTimelineScale = 'compact' | 'full';

export function useOccupancyTimelineScaleStorage(): [
  OccupancyTimelineScale,
  (value: OccupancyTimelineScale | ((prev: OccupancyTimelineScale) => OccupancyTimelineScale)) => void
] {
  return useLocalStorageBase<OccupancyTimelineScale>(STORAGE_KEYS.OCCUPANCY_TIMELINE_SCALE, 'compact');
}

/** Вид строк занятости: полный или компактный */
export type OccupancyRowView = 'full' | 'legacy';

/**
 * Компактный режим строк занятости (настройка «Компактный» в модалке).
 */
export function useOccupancyOldTmLayoutStorage(): [
  boolean,
  (value: boolean | ((prev: boolean) => boolean)) => void
] {
  return useLocalStorageBase<boolean>(STORAGE_KEYS.OCCUPANCY_OLD_TM_LAYOUT, false);
}

export function useOccupancyRowViewStorage(): [
  OccupancyRowView,
  (value: OccupancyRowView | ((prev: OccupancyRowView) => OccupancyRowView)) => void
] {
  const [legacyLayout, setLegacyLayout] = useOccupancyOldTmLayoutStorage();
  const rowView: OccupancyRowView = legacyLayout ? 'legacy' : 'full';
  const setRowView = (next: OccupancyRowView | ((prev: OccupancyRowView) => OccupancyRowView)) => {
    const value = typeof next === 'function' ? next(rowView) : next;
    setLegacyLayout(value === 'legacy');
  };
  return [rowView, setRowView];
}

/**
 * Компактный режим строк занятости эпика (в UI — «Компактный»).
 * Отдельная настройка от спринта.
 */
export function useEpicOccupancyOldTmLayoutStorage(): [
  boolean,
  (value: boolean | ((prev: boolean) => boolean)) => void
] {
  return useLocalStorageBase<boolean>(STORAGE_KEYS.EPIC_OCCUPANCY_OLD_TM_LAYOUT, false);
}

export interface OccupancyRowFieldsVisibility {
  showAssignee: boolean;
  showKey: boolean;
  showPriority: boolean;
  showQa: boolean;
  showSeverity: boolean;
  showStatus: boolean;
  showStoryPoints: boolean;
  showTeam: boolean;
  showTestPoints: boolean;
  showType: boolean;
}

export interface SwimlaneCardFieldsVisibility {
  showEstimates: boolean;
  showKey: boolean;
  showParent: boolean;
  showPriority: boolean;
  showSeverity: boolean;
  showStatus: boolean;
  showType: boolean;
}

/**
 * Набор полей, которые показываются в строке занятости
 * (как в полном, так и в компактном/легаси режиме).
 */
export function useOccupancyRowFieldsStorage(): [
  OccupancyRowFieldsVisibility,
  (value: OccupancyRowFieldsVisibility | ((prev: OccupancyRowFieldsVisibility) => OccupancyRowFieldsVisibility)) => void
] {
  const defaultValue: OccupancyRowFieldsVisibility = {
    showAssignee: true,
    showQa: true,
    showStoryPoints: true,
    showTeam: true,
    showTestPoints: true,
    showKey: true,
    showStatus: true,
    showSeverity: true,
    showType: true,
    showPriority: true,
  };
  return useLocalStorageBase<OccupancyRowFieldsVisibility>(
    STORAGE_KEYS.OCCUPANCY_ROW_FIELDS,
    defaultValue
  );
}

/** Набор полей строки занятости эпика (отдельно от спринта). */
export function useEpicOccupancyRowFieldsStorage(): [
  OccupancyRowFieldsVisibility,
  (
    value:
      | OccupancyRowFieldsVisibility
      | ((prev: OccupancyRowFieldsVisibility) => OccupancyRowFieldsVisibility)
  ) => void
] {
  const defaultValue: OccupancyRowFieldsVisibility = {
    showAssignee: true,
    showQa: true,
    showStoryPoints: true,
    showTeam: true,
    showTestPoints: true,
    showKey: true,
    showStatus: true,
    showSeverity: true,
    showType: true,
    showPriority: true,
  };
  return useLocalStorageBase<OccupancyRowFieldsVisibility>(
    STORAGE_KEYS.EPIC_OCCUPANCY_ROW_FIELDS,
    defaultValue
  );
}

/**
 * Набор полей, которые показываются в карточке задачи на свимлейне.
 */
export function useSwimlaneCardFieldsStorage(): [
  SwimlaneCardFieldsVisibility,
  (
    value:
      | SwimlaneCardFieldsVisibility
      | ((prev: SwimlaneCardFieldsVisibility) => SwimlaneCardFieldsVisibility)
  ) => void
] {
  const defaultValue: SwimlaneCardFieldsVisibility = {
    showParent: true,
    showKey: true,
    showPriority: true,
    showType: true,
    showEstimates: true,
    showSeverity: true,
    showStatus: true,
  };
  return useLocalStorageBase<SwimlaneCardFieldsVisibility>(
    STORAGE_KEYS.SWIMLANE_CARD_FIELDS,
    defaultValue
  );
}

/**
 * Упаковка бейзлайна просрочки на свимлейне.
 * Компактный — хвост поверх карточек; без пересечений — хвост занимает слой.
 */
export function useSwimlaneBaselineLayoutModeStorage(): [
  SwimlaneBaselineLayoutMode,
  (
    value: SwimlaneBaselineLayoutMode | ((prev: SwimlaneBaselineLayoutMode) => SwimlaneBaselineLayoutMode)
  ) => void
] {
  const [stored, setStored] = useLocalStorageBase<SwimlaneBaselineLayoutMode | boolean>(
    STORAGE_KEYS.SWIMLANE_BASELINE_LAYOUT_MODE,
    'noOverlap'
  );
  const mode = parseSwimlaneBaselineLayoutMode(stored);
  const setMode = (
    next: SwimlaneBaselineLayoutMode | ((prev: SwimlaneBaselineLayoutMode) => SwimlaneBaselineLayoutMode)
  ) => {
    setStored(typeof next === 'function' ? next(mode) : next);
  };
  return [mode, setMode];
}

/** Вид строк занятости эпика. */
export function useEpicOccupancyRowViewStorage(): [
  OccupancyRowView,
  (value: OccupancyRowView | ((prev: OccupancyRowView) => OccupancyRowView)) => void
] {
  const [legacyLayout, setLegacyLayout] = useEpicOccupancyOldTmLayoutStorage();
  const rowView: OccupancyRowView = legacyLayout ? 'legacy' : 'full';
  const setRowView = (next: OccupancyRowView | ((prev: OccupancyRowView) => OccupancyRowView)) => {
    const value = typeof next === 'function' ? next(rowView) : next;
    setLegacyLayout(value === 'legacy');
  };
  return [rowView, setRowView];
}

/** Настройки таймлайна факта занятости эпика (отдельная настройка от спринта). */
export function useEpicOccupancyTimelineSettingsStorage(): [
  OccupancyTimelineSettings,
  (settings: OccupancyTimelineSettings | ((prev: OccupancyTimelineSettings) => OccupancyTimelineSettings)) => void
] {
  const defaultValue: OccupancyTimelineSettings = {
    enabled: true,
    showStatuses: true,
    showComments: true,
    showGitlab: true,
    showReestimations: true,
    showLinks: true,
    showFreeSlotPreview: true,
  };
  return useLocalStorageBase<OccupancyTimelineSettings>(STORAGE_KEYS.EPIC_OCCUPANCY_TIMELINE_SETTINGS, defaultValue);
}

/** Компактный режим строк занятости на странице квартального планирования v2. */
function useQuarterlyV2OccupancyOldTmLayoutStorage(): [
  boolean,
  (value: boolean | ((prev: boolean) => boolean)) => void
] {
  return useLocalStorageBase<boolean>(STORAGE_KEYS.QUARTERLY_V2_OCCUPANCY_OLD_TM_LAYOUT, false);
}

/** Вид строк занятости на странице квартального планирования v2. */
export function useQuarterlyV2OccupancyRowViewStorage(): [
  OccupancyRowView,
  (value: OccupancyRowView | ((prev: OccupancyRowView) => OccupancyRowView)) => void
] {
  const [legacyLayout, setLegacyLayout] = useQuarterlyV2OccupancyOldTmLayoutStorage();
  const rowView: OccupancyRowView = legacyLayout ? 'legacy' : 'full';
  const setRowView = (next: OccupancyRowView | ((prev: OccupancyRowView) => OccupancyRowView)) => {
    const value = typeof next === 'function' ? next(rowView) : next;
    setLegacyLayout(value === 'legacy');
  };
  return [rowView, setRowView];
}

/** Набор полей строки занятости на странице квартального планирования v2. */
export function useQuarterlyV2OccupancyRowFieldsStorage(): [
  OccupancyRowFieldsVisibility,
  (
    value:
      | OccupancyRowFieldsVisibility
      | ((prev: OccupancyRowFieldsVisibility) => OccupancyRowFieldsVisibility)
  ) => void
] {
  const defaultValue: OccupancyRowFieldsVisibility = {
    showAssignee: true,
    showQa: true,
    showStoryPoints: true,
    showTeam: true,
    showTestPoints: true,
    showKey: true,
    showStatus: true,
    showSeverity: true,
    showType: true,
    showPriority: true,
  };
  return useLocalStorageBase<OccupancyRowFieldsVisibility>(
    STORAGE_KEYS.QUARTERLY_V2_OCCUPANCY_ROW_FIELDS,
    defaultValue
  );
}

/** Настройки таймлайна факта на странице квартального планирования v2. */
export function useQuarterlyV2OccupancyTimelineSettingsStorage(): [
  OccupancyTimelineSettings,
  (settings: OccupancyTimelineSettings | ((prev: OccupancyTimelineSettings) => OccupancyTimelineSettings)) => void
] {
  const defaultValue: OccupancyTimelineSettings = {
    enabled: true,
    showStatuses: true,
    showComments: true,
    showGitlab: true,
    showReestimations: true,
    showLinks: true,
    showFreeSlotPreview: true,
  };
  return useLocalStorageBase<OccupancyTimelineSettings>(
    STORAGE_KEYS.QUARTERLY_V2_OCCUPANCY_TIMELINE_SETTINGS,
    defaultValue
  );
}

/** Показывать полосы «запланировано в спринт» на квартальном планировании v2. */
export function useQuarterlyV2ShowPlannedTasksStorage(): [
  boolean,
  (value: boolean | ((prev: boolean) => boolean)) => void
] {
  return useLocalStorageBase<boolean>(STORAGE_KEYS.QUARTERLY_V2_SHOW_PLANNED_TASKS, true);
}

/**
 * Хук для работы с настройкой группировки канбана
 */
export function useKanbanGroupByStorage(): [
  SidebarGroupBy,
  (value: SidebarGroupBy | ((prev: SidebarGroupBy) => SidebarGroupBy)) => void
] {
  return useLocalStorageBase<SidebarGroupBy>(STORAGE_KEYS.KANBAN_GROUP_BY, 'none');
}

/**
 * Хук для управления видимостью связей между задачами в свимлейнах
 */
export function useSwimlaneLinksVisibilityStorage(): [
  boolean,
  (value: boolean | ((prev: boolean) => boolean)) => void
] {
  return useLocalStorageBase<boolean>(STORAGE_KEYS.SWIMLANE_LINKS_VISIBLE, true);
}

/**
 * Показывать под свимлейном таймлайн факта «В работе» (отдельно от факта в занятости).
 */
export function useSwimlaneFactTimelineVisibleStorage(): [
  boolean,
  (value: boolean | ((prev: boolean) => boolean)) => void
] {
  return useLocalStorageBase<boolean>(STORAGE_KEYS.SWIMLANE_FACT_TIMELINE_VISIBLE, false);
}

/**
 * Показывать под свимлейном дорожку занятости из календаря (CalDAV).
 */
export function useSwimlaneCalendarBusyVisibleStorage(): [
  boolean,
  (value: boolean | ((prev: boolean) => boolean)) => void
] {
  return useLocalStorageBase<boolean>(STORAGE_KEYS.SWIMLANE_CALENDAR_BUSY_VISIBLE, true);
}

/**
 * Показывать текстовые заметки (стикеры) на свимлейне.
 */
export function useSwimlaneNotesVisibleStorage(): [
  boolean,
  (value: boolean | ((prev: boolean) => boolean)) => void
] {
  return useLocalStorageBase<boolean>(STORAGE_KEYS.SWIMLANE_NOTES_VISIBLE, true);
}

/**
 * Показывать фотокарточки на свимлейне.
 */
export function useSwimlaneImagesVisibleStorage(): [
  boolean,
  (value: boolean | ((prev: boolean) => boolean)) => void
] {
  return useLocalStorageBase<boolean>(STORAGE_KEYS.SWIMLANE_IMAGES_VISIBLE, true);
}

/**
 * Закреплённые строки свимлейна (id исполнителей). По умолчанию закреплена общая строка.
 */
export function useSwimlanePinnedRowIdsStorage(): [
  string[],
  (value: string[] | ((prev: string[]) => string[])) => void
] {
  return useLocalStorageBase<string[]>(
    STORAGE_KEYS.SWIMLANE_PINNED_ROW_IDS,
    DEFAULT_PINNED_SWIMLANE_ROW_IDS
  );
}

function swimlaneRowReservedLayersStorageKey(sprintId: number | null | undefined): string {
  return `${STORAGE_KEYS.SWIMLANE_ROW_RESERVED_LAYERS}-${sprintId ?? 'none'}`;
}

/**
 * Число слоёв карточек, заранее заложенных пользователем в строке свимлейна (per sprint).
 */
export function useSwimlaneRowReservedLayersStorage(sprintId: number | null | undefined): [
  Record<string, number>,
  (value:
    | Record<string, number>
    | ((prev: Record<string, number>) => Record<string, number>)) => void
] {
  return useLocalStorageBase<Record<string, number>>(
    swimlaneRowReservedLayersStorageKey(sprintId),
    {}
  );
}

/**
 * Хук для настройки затемнения несвязанных карточек/фаз при наведении на связь
 */
export function useLinksDimOnHoverStorage(): [
  boolean,
  (value: boolean | ((prev: boolean) => boolean)) => void
] {
  return useLocalStorageBase<boolean>(STORAGE_KEYS.LINKS_DIM_ON_HOVER, true);
}

/**
 * Хук для хранения порядка задач в виде занятости эпика (per-epic, в localStorage).
 * Отдельный от спринтового, т.к. вид охватывает несколько спринтов.
 */
export function useEpicOccupancyTaskOrder(epicId: string): [
  OccupancyTaskOrder | undefined,
  (updater: (prev: OccupancyTaskOrder | undefined) => OccupancyTaskOrder) => void
] {
  const storageKey = `beer-tracker-epic-task-order-${epicId}`;
  const [value, setValue] = useLocalStorageBase<OccupancyTaskOrder | null>(storageKey, null);

  const setOrder = (updater: (prev: OccupancyTaskOrder | undefined) => OccupancyTaskOrder) => {
    setValue((prev) => updater(prev ?? undefined));
  };

  return [value ?? undefined, setOrder];
}
