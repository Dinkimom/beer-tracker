'use client';

import type { BoardViewMode } from '@/hooks/useLocalStorage';
import type { SprintPresenceViewer } from '@/lib/realtime/sprintRealtimeTypes';
import type { Developer, StatusFilter, Task } from '@/types';
import type { SprintListItem } from '@/types/tracker';

import { observer } from 'mobx-react-lite';
import { useCallback, useMemo } from 'react';

import { useI18n } from '@/contexts/LanguageContext';
import { collectBacklogFilterPeople } from '@/features/backlog/utils/backlogFilterPeople';
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
  /** Задачи спринта — для аватар-фильтра на канбане (как на бэклоге). */
  assigneeFilterTasks?: Task[];
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
  assigneeFilterTasks = [],
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

  const handleAssigneeToggle = useCallback(
    (id: string) => {
      setSelectedAssigneeIds((current) => {
        const next = new Set(current);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    [setSelectedAssigneeIds]
  );

  const assigneeFilterPeople = useMemo(
    () =>
      viewMode === 'kanban'
        ? collectBacklogFilterPeople({
            backlogDevelopers: developers,
            backlogTasks: assigneeFilterTasks,
            sprintBundles: [],
          })
        : [],
    [assigneeFilterTasks, developers, viewMode]
  );

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

  const blendWithBoard = viewMode === 'kanban';

  return (
    <div
      className={`relative z-10 flex-shrink-0 px-4 py-3 ${
        blendWithBoard
          ? 'border-b border-transparent'
          : 'border-b border-gray-200 dark:border-gray-700'
      }`}
    >
      <div className="flex w-full min-w-0 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <SprintPlannerControlsBarLeftSection
            assigneeFilterPeople={assigneeFilterPeople}
            boardId={boardId}
            globalNameFilter={globalNameFilter}
            selectedAssigneeIds={selectedAssigneeIds}
            selectedSprintId={selectedSprintId}
            setGlobalNameFilter={setGlobalNameFilter}
            sprints={sprints}
            sprintsLoading={sprintsLoading}
            tasksLoading={tasksLoading}
            viewMode={viewMode}
            onAssigneeToggle={handleAssigneeToggle}
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
