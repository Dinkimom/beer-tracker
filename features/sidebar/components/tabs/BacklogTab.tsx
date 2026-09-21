'use client';

import type { Task } from '@/types';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import { useTaskSidebar } from '@/features/sidebar/contexts/TaskSidebarContext';

import { BacklogTabTaskGroups } from './BacklogTabTaskGroups';

function isBacklogTabEmpty(
  groupKeys: string[],
  groupedTasks: Record<string, Task[]>,
): boolean {
  if (groupKeys.length === 0) {
    return true;
  }
  return groupKeys.every((key) => groupedTasks[key].length === 0);
}

export function BacklogTab() {
  const { t } = useI18n();
  const {
    backlogLoading,
    isInitialBacklogLoad,
    groupKeys,
    groupedTasks,
    groupBy,
    backlogDevelopers,
    onContextMenu,
    activeTaskId,
    activeTaskDuration,
    viewMode,
    width: sidebarWidth,
    selectedSprintId,
    backlogTasks,
    backlogTotalCount,
    backlogHasMore,
    isBacklogRateLimitError,
    onRetryBacklog,
    onLoadMore,
    contextMenuBlurOtherCards,
    contextMenuTaskId,
  } = useTaskSidebar();

  if (isBacklogRateLimitError && onRetryBacklog) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-4 py-12 text-center">
        <p className="text-sm text-amber-700 dark:text-amber-400">
          {t('sidebar.backlogTab.rateLimitMessage')}
        </p>
        <Button className="gap-2" type="button" variant="outline" onClick={onRetryBacklog}>
          <Icon className="h-4 w-4" name="refresh" />
          {t('sidebar.backlogTab.reload')}
        </Button>
      </div>
    );
  }

  if (backlogLoading && isInitialBacklogLoad) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400 text-sm py-12 font-medium">
        {t('sidebar.backlogTab.loadingTasks')}
      </div>
    );
  }

  if (isBacklogTabEmpty(groupKeys, groupedTasks)) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400 text-sm py-12 font-medium">
        {t('sidebar.backlogTab.empty')}
      </div>
    );
  }

  return (
    <BacklogTabTaskGroups
      activeTaskDuration={activeTaskDuration}
      activeTaskId={activeTaskId}
      backlogDevelopers={backlogDevelopers}
      backlogHasMore={backlogHasMore}
      backlogLoading={backlogLoading}
      backlogTasks={backlogTasks}
      backlogTotalCount={backlogTotalCount}
      contextMenuBlurOtherCards={contextMenuBlurOtherCards}
      contextMenuTaskId={contextMenuTaskId}
      groupBy={groupBy}
      groupKeys={groupKeys}
      groupedTasks={groupedTasks}
      isInitialBacklogLoad={isInitialBacklogLoad}
      selectedSprintId={selectedSprintId}
      sidebarWidth={sidebarWidth}
      t={t}
      viewMode={viewMode}
      onContextMenu={onContextMenu}
      onLoadMore={onLoadMore}
    />
  );
}
