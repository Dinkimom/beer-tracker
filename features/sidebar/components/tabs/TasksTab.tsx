'use client';

import { useMemo } from 'react';

import { useTaskSidebar } from '@/features/sidebar/contexts/TaskSidebarContext';

import { TasksTabActions } from './TasksTab/components/TasksTabActions';
import { TasksTabFilters } from './TasksTab/components/TasksTabFilters';
import { TasksTabGroups } from './TasksTab/components/TasksTabGroups';

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

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
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

      <TasksTabActions
        boardId={selectedBoardId}
        excludedIssueKeys={excludedIssueKeys}
        selectedSprintId={selectedSprintId}
        onReturnAllTasks={onReturnAllTasks}
        onSprintTaskUpserted={onSprintTaskUpserted}
      />
    </div>
  );
}
