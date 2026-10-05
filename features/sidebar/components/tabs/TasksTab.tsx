'use client';

import { useLayoutEffect, useMemo, useState } from 'react';

import { FLOATING_TOOLBAR_GLASS } from '@/features/context-menu/contextMenuClasses';
import { SIDEBAR_TAB_HEADER_HEIGHT_PX } from '@/features/sidebar/components/SidebarHeader';
import { useTaskSidebar } from '@/features/sidebar/contexts/TaskSidebarContext';

import { TasksTabActions } from './TasksTab/components/TasksTabActions';
import { TasksTabFilters } from './TasksTab/components/TasksTabFilters';
import { TasksTabGroups } from './TasksTab/components/TasksTabGroups';

function useOverlayHeight(node: HTMLElement | null): number {
  const [height, setHeight] = useState(0);

  useLayoutEffect(() => {
    if (!node) {
      return undefined;
    }
    const apply = () => setHeight(node.offsetHeight);
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(node);
    return () => observer.disconnect();
  }, [node]);

  return height;
}

export function TasksTab() {
  const {
    activeTab,
    setActiveTab,
    groupBy,
    setGroupBy,
    statusFilter,
    setStatusFilter,
    nameFilter,
    setNameFilter,
    allTasksCount,
    allSprintTasksForMetrics,
    goalsTasks,
    devTasksCount,
    qaTasksCount,
    groupKeys,
    groupedTasks,
    developers,
    qaTasksMap,
    activeTaskId,
    activeTaskDuration,
    viewMode,
    width: sidebarWidth,
    selectedBoardId,
    selectedSprintId,
    contextMenuBlurOtherCards,
    contextMenuTaskId,
    onContextMenu,
    onReturnAllTasks,
    onAutoAddToSwimlane,
    onSprintTaskUpserted,
  } = useTaskSidebar();

  const excludedIssueKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const task of allSprintTasksForMetrics ?? goalsTasks) {
      const id = task.id.trim();
      if (id) {
        keys.add(id);
      }
    }
    return keys;
  }, [allSprintTasksForMetrics, goalsTasks]);
  const [filtersEl, setFiltersEl] = useState<HTMLDivElement | null>(null);
  const [actionsEl, setActionsEl] = useState<HTMLDivElement | null>(null);
  const filtersHeight = useOverlayHeight(filtersEl);
  const actionsHeight = useOverlayHeight(actionsEl);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <div
        className="absolute inset-0 overflow-y-auto overscroll-contain"
        style={{
          paddingTop: SIDEBAR_TAB_HEADER_HEIGHT_PX + filtersHeight,
          paddingBottom: actionsHeight,
        }}
      >
        <TasksTabGroups
          activeTaskDuration={activeTaskDuration}
          activeTaskId={activeTaskId}
          contextMenuBlurOtherCards={contextMenuBlurOtherCards}
          contextMenuTaskId={contextMenuTaskId}
          developers={developers}
          groupBy={groupBy}
          groupKeys={groupKeys}
          groupedTasks={groupedTasks}
          qaTasksMap={qaTasksMap}
          selectedSprintId={selectedSprintId}
          sidebarWidth={sidebarWidth}
          viewMode={viewMode}
          onAutoAddToSwimlane={onAutoAddToSwimlane}
          onContextMenu={onContextMenu}
        />
      </div>
      <div
        ref={setFiltersEl}
        className={`absolute inset-x-0 z-10 ${FLOATING_TOOLBAR_GLASS}`}
        style={{ top: SIDEBAR_TAB_HEADER_HEIGHT_PX }}
      >
        <TasksTabFilters
          activeTab={activeTab}
          allTasksCount={allTasksCount}
          devTasksCount={devTasksCount}
          groupBy={groupBy}
          nameFilter={nameFilter}
          qaTasksCount={qaTasksCount}
          setActiveTab={setActiveTab}
          setGroupBy={setGroupBy}
          setNameFilter={setNameFilter}
          setStatusFilter={setStatusFilter}
          statusFilter={statusFilter}
        />
      </div>
      <div
        ref={setActionsEl}
        className={`absolute inset-x-0 bottom-0 z-10 ${FLOATING_TOOLBAR_GLASS}`}
      >
        <TasksTabActions
          boardId={selectedBoardId}
          excludedIssueKeys={excludedIssueKeys}
          selectedSprintId={selectedSprintId}
          onReturnAllTasks={onReturnAllTasks}
          onSprintTaskUpserted={onSprintTaskUpserted}
        />
      </div>
    </div>
  );
}
