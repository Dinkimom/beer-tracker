import type { SidebarGroupBy } from '@/types';

import {
  parseSwimlaneBaselineLayoutMode,
  type SwimlaneBaselineLayoutMode,
} from '@/lib/swimlane/swimlaneBaselineLayoutMode';
import { TEAM_SWIMLANE_ASSIGNEE_ID } from '@/lib/swimlane/teamSwimlaneAssignee';

import { STORAGE_KEYS } from './storageKeys';
import { useLocalStorage as useLocalStorageBase } from './useLocalStorageBase';

const DEFAULT_PINNED_SWIMLANE_ROW_IDS: string[] = [TEAM_SWIMLANE_ASSIGNEE_ID];

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

/** Автосортировка карточек в строках свимлейна (по умолчанию включена). Выключена — ручные слои. */
export function useSwimlaneAutoArrangeStorage(): [boolean, (value: boolean | ((prev: boolean) => boolean)) => void] {
  return useLocalStorageBase<boolean>(STORAGE_KEYS.SWIMLANE_AUTO_ARRANGE, true);
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
 * Какие связи свимлейна видны без наведения: все, только важные (блокировки, планерные,
 * нарушенные) или никакие. Остальные проявляются в hover-кластере карточки.
 */
export type SwimlaneLinksIdleMode = 'all' | 'hover' | 'important';

export function useSwimlaneLinksIdleModeStorage(): [
  SwimlaneLinksIdleMode,
  (value: SwimlaneLinksIdleMode | ((prev: SwimlaneLinksIdleMode) => SwimlaneLinksIdleMode)) => void
] {
  return useLocalStorageBase<SwimlaneLinksIdleMode>(
    STORAGE_KEYS.SWIMLANE_LINKS_IDLE_MODE,
    'important'
  );
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
