import type { DevelopersSort, SidebarGroupBy, StatusFilter } from '@/types';

import { useEffect, useState } from 'react';

import { STORAGE_KEYS } from './storageKeys';
import { getFromStorage, saveToStorage } from './storagePrimitives';
import { useLocalStorage as useLocalStorageBase } from './useLocalStorageBase';

/** `occupancy` скрыт; в storage ещё может лежать — сбрасываем на свимлейн. */
export type BoardViewMode = 'compact' | 'features' | 'full' | 'kanban' | 'occupancy';

export function isAnySwimlaneViewMode(viewMode: BoardViewMode): boolean {
  return viewMode === 'full' || viewMode === 'compact' || viewMode === 'features';
}

export function resolveVisibleBoardViewMode(viewMode: BoardViewMode): BoardViewMode {
  return viewMode === 'occupancy' ? 'full' : viewMode;
}

export function useBoardViewModeStorage(): [
  BoardViewMode,
  (value: BoardViewMode | ((prev: BoardViewMode) => BoardViewMode)) => void
] {
  const [viewMode, setViewMode] = useLocalStorageBase<BoardViewMode>(
    STORAGE_KEYS.BOARD_VIEW_MODE,
    'full'
  );
  useEffect(() => {
    if (viewMode === 'occupancy') {
      setViewMode('full');
    }
  }, [setViewMode, viewMode]);
  return [resolveVisibleBoardViewMode(viewMode), setViewMode];
}

export function useSidebarGroupByStorage(): [
  SidebarGroupBy,
  (groupBy: SidebarGroupBy | ((prev: SidebarGroupBy) => SidebarGroupBy)) => void
] {
  return useLocalStorageBase<SidebarGroupBy>(STORAGE_KEYS.SIDEBAR_GROUP_BY, 'none');
}

export function useSidebarStatusFilterStorage(): [
  StatusFilter,
  (filter: StatusFilter | ((prev: StatusFilter) => StatusFilter)) => void
] {
  return useLocalStorageBase<StatusFilter>(STORAGE_KEYS.SIDEBAR_STATUS_FILTER, 'all');
}

/**
 * Фильтр по статусам задач в отображении занятости. Сохраняется в localStorage.
 */
export function useOccupancyStatusFilterStorage(): [
  StatusFilter,
  (filter: StatusFilter | ((prev: StatusFilter) => StatusFilter)) => void
] {
  return useLocalStorageBase<StatusFilter>(STORAGE_KEYS.OCCUPANCY_STATUS_FILTER, 'all');
}

// ==================== Настройки табов сайдбара ====================

type SidebarMainTabId =
  'backlog' | 'bugs' | 'daily' | 'goals' | 'invalid' | 'metrics' | 'tasks';

export interface SidebarTabSettings {
  id: SidebarMainTabId;
  visible: boolean;
}

const DEFAULT_SIDEBAR_TABS: SidebarTabSettings[] = [
  { id: 'tasks', visible: true },
  { id: 'invalid', visible: true },
  { id: 'goals', visible: true },
  { id: 'daily', visible: false },
  { id: 'metrics', visible: true },
  { id: 'bugs', visible: true },
  { id: 'backlog', visible: true },
];

export function useSidebarTabsSettingsStorage(): [
  SidebarTabSettings[],
  (value: SidebarTabSettings[] | ((prev: SidebarTabSettings[]) => SidebarTabSettings[])) => void
] {
  return useLocalStorageBase<SidebarTabSettings[]>(STORAGE_KEYS.SIDEBAR_TABS, DEFAULT_SIDEBAR_TABS);
}

export function useDevelopersSortStorage(): [
  DevelopersSort,
  (sort: DevelopersSort | ((prev: DevelopersSort) => DevelopersSort)) => void
] {
  return useLocalStorageBase<DevelopersSort>(STORAGE_KEYS.DEVELOPERS_SORT, 'name');
}

export function useDevelopersHiddenStorage(): [
  Set<string>,
  (hidden: Set<string> | ((prev: Set<string>) => Set<string>)) => void
] {
  const [hidden, setHiddenState] = useState<Set<string>>(() =>
    getFromStorage<string[]>(STORAGE_KEYS.DEVELOPERS_HIDDEN, []).reduce(
      (set, id) => {
        set.add(id);
        return set;
      },
      new Set<string>()
    )
  );

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.DEVELOPERS_HIDDEN, Array.from(hidden));
  }, [hidden]);

  const setHidden = (
    newHidden: Set<string> | ((prev: Set<string>) => Set<string>)
  ) => {
    setHiddenState((prev) =>
      typeof newHidden === 'function' ? newHidden(prev) : newHidden
    );
  };

  return [hidden, setHidden];
}

/**
 * Фильтр по исполнителям в отображении занятости. Сохраняется в localStorage.
 */
export function useOccupancyAssigneeFilterStorage(): [
  Set<string>,
  (ids: Set<string> | ((prev: Set<string>) => Set<string>)) => void
] {
  const [selectedIds, setSelectedIdsState] = useState<Set<string>>(() =>
    getFromStorage<string[]>(STORAGE_KEYS.OCCUPANCY_ASSIGNEE_FILTER, []).reduce(
      (set, id) => {
        set.add(id);
        return set;
      },
      new Set<string>()
    )
  );

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.OCCUPANCY_ASSIGNEE_FILTER, Array.from(selectedIds));
  }, [selectedIds]);

  const setSelectedIds = (
    newIds: Set<string> | ((prev: Set<string>) => Set<string>)
  ) => {
    setSelectedIdsState((prev) =>
      typeof newIds === 'function' ? newIds(prev) : newIds
    );
  };

  return [selectedIds, setSelectedIds];
}

export function useDevelopersOrderStorage(): [
  string[],
  (order: string[] | ((prev: string[]) => string[])) => void
] {
  return useLocalStorageBase<string[]>(STORAGE_KEYS.DEVELOPERS_ORDER, []);
}
