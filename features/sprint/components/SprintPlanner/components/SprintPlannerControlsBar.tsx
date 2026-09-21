'use client';

import type { BoardViewMode } from '@/hooks/useLocalStorage';
import type { SprintPresenceViewer } from '@/lib/realtime/sprintRealtimeTypes';
import type { Developer, StatusFilter } from '@/types';
import type { SprintListItem } from '@/types/tracker';

import { observer } from 'mobx-react-lite';

import { useI18n } from '@/contexts/LanguageContext';
import { useRootStore } from '@/lib/layers';

import {
  buildOccupancyStatusFilterOptions,
  resolveControlsBarViewModeSelectValue,
  resolveTasksReloadButtonTitle,
} from './sprintPlannerControlsBarHelpers';
import { SprintPlannerControlsBarLeftSection } from './SprintPlannerControlsBarLeftSection';
import { SprintPlannerControlsBarRightSection } from './SprintPlannerControlsBarSections';
import { SprintPlannerOccupancyFiltersRow } from './SprintPlannerOccupancyFiltersRow';

interface SprintPlannerControlsBarProps {
  boardId: number | null;
  boardViewers?: readonly SprintPresenceViewer[];
  developers: Developer[];
  /** Фильтр по статусу задач (только для режима занятости) */
  occupancyStatusFilter?: StatusFilter;
  planHistory?: {
    canRedo: boolean;
    canUndo: boolean;
    redo: () => void;
    undo: () => void;
  };
  selectedAssigneeIds: Set<string>;
  selectedSprintId: number | null;
  /** Сайдбар открыт — кнопка меню в активном состоянии */
  sidebarOpen?: boolean;
  sprints: SprintListItem[];
  sprintsLoading?: boolean;
  tasksLoading: boolean;
  /** Идёт перезагрузка по кнопке «Обновить задачи» */
  tasksReloading?: boolean;
  viewMode: BoardViewMode;
  /** Переключить сайдбар открыт/закрыт (кнопка с иконкой меню) */
  onOpenSidebar?: () => void;
  onSprintChange: (sprintId: number | null) => void;
  /** Внешний обработчик перезагрузки задач из трекера/БД (showToast — показывать тост только при явном нажатии кнопки) */
  onTasksReload?: (options?: { showToast?: boolean }) => void;
  setOccupancyStatusFilter?: (value: StatusFilter) => void;
  setSelectedAssigneeIds: (ids: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  setViewMode: (value: BoardViewMode | ((prev: BoardViewMode) => BoardViewMode)) => void;
}

/**
 * Панель контролов спринт-планнера: спринт, поиск, фильтр исполнителей, режим отображения.
 */
export const SprintPlannerControlsBar = observer(function SprintPlannerControlsBar({
  boardId,
  boardViewers = [],
  developers,
  occupancyStatusFilter = 'all',
  planHistory,
  selectedAssigneeIds,
  selectedSprintId,
  setOccupancyStatusFilter,
  setSelectedAssigneeIds,
  setViewMode,
  sidebarOpen = false,
  sprints,
  sprintsLoading = false,
  tasksLoading,
  tasksReloading = false,
  viewMode,
  onOpenSidebar,
  onSprintChange,
  onTasksReload,
}: SprintPlannerControlsBarProps) {
  const { t } = useI18n();
  const { sprintPlannerUi, taskPositions: positionsStore } = useRootStore();
  const globalNameFilter = sprintPlannerUi.globalNameFilter;
  const setGlobalNameFilter = sprintPlannerUi.setGlobalNameFilter;
  const isReloading = tasksLoading || tasksReloading;

  const livePlanHistory = planHistory
    ? {
        canRedo: positionsStore.canRedo,
        canUndo: positionsStore.canUndo,
        redo: () => positionsStore.redo(),
        undo: () => positionsStore.undo(),
      }
    : undefined;

  const viewModeSelectValue = resolveControlsBarViewModeSelectValue(viewMode);
  const tasksReloadButtonTitle = resolveTasksReloadButtonTitle(isReloading, selectedSprintId, t);
  const statusFilterOptions = buildOccupancyStatusFilterOptions(t);

  const occupancyFiltersRow =
    viewMode === 'occupancy' && setOccupancyStatusFilter ? (
      <SprintPlannerOccupancyFiltersRow
        developers={developers}
        occupancyStatusFilter={occupancyStatusFilter}
        selectedAssigneeIds={selectedAssigneeIds}
        setOccupancyStatusFilter={setOccupancyStatusFilter}
        setSelectedAssigneeIds={setSelectedAssigneeIds}
        statusFilterOptions={statusFilterOptions}
      />
    ) : null;

  return (
    <div className="flex-shrink-0 border-b border-ds-border-subtle bg-ds-surface-header px-4 py-3">
      <div className="flex w-full min-w-0 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <SprintPlannerControlsBarLeftSection
            boardId={boardId}
            globalNameFilter={globalNameFilter}
            selectedSprintId={selectedSprintId}
            setGlobalNameFilter={setGlobalNameFilter}
            sprints={sprints}
            sprintsLoading={sprintsLoading}
            tasksLoading={tasksLoading}
            onSprintChange={onSprintChange}
          />
          <SprintPlannerControlsBarRightSection
            boardViewers={boardViewers}
            isReloading={isReloading}
            planHistory={livePlanHistory}
            selectedSprintId={selectedSprintId}
            setViewMode={setViewMode}
            sidebarOpen={sidebarOpen}
            tasksReloadButtonTitle={tasksReloadButtonTitle}
            viewMode={viewMode}
            viewModeSelectValue={viewModeSelectValue}
            onOpenSidebar={onOpenSidebar}
            onTasksReload={onTasksReload}
          />
        </div>
        {occupancyFiltersRow}
      </div>
    </div>
  );
});
