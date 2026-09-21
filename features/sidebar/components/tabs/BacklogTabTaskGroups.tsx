'use client';

import type { Developer, LayoutViewMode, SidebarGroupBy, Task } from '@/types';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { sidebarTaskGroupContainerClass } from '@/features/sidebar/utils/sidebarTaskGroupContainerClass';
import { DraggableTask } from '@/features/task/components/DraggableTask';

interface BacklogTabTaskGroupsProps {
  activeTaskDuration?: number | null;
  activeTaskId?: string | null;
  backlogDevelopers: Developer[];
  backlogHasMore: boolean;
  backlogLoading: boolean;
  backlogTasks: Task[];
  backlogTotalCount: number;
  contextMenuBlurOtherCards?: boolean;
  contextMenuTaskId?: string | null;
  groupBy: SidebarGroupBy;
  groupedTasks: Record<string, Task[]>;
  groupKeys: string[];
  isInitialBacklogLoad: boolean;
  selectedSprintId?: number | null;
  sidebarWidth: number;
  viewMode?: LayoutViewMode;
  onContextMenu?: (e: React.MouseEvent, task: Task, isBacklogTask?: boolean) => void;
  onLoadMore: () => void;
  t: (key: string, params?: Record<string, number | string>) => string;
}

export function BacklogTabTaskGroups({
  groupKeys,
  groupedTasks,
  groupBy,
  backlogDevelopers,
  onContextMenu,
  activeTaskId,
  activeTaskDuration,
  viewMode,
  sidebarWidth,
  selectedSprintId,
  contextMenuBlurOtherCards,
  contextMenuTaskId,
  backlogTotalCount,
  backlogTasks,
  backlogHasMore,
  backlogLoading,
  isInitialBacklogLoad,
  onLoadMore,
  t,
}: BacklogTabTaskGroupsProps) {
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
        {groupKeys.map((groupKey, groupIndex) => {
          const tasksInGroup = groupedTasks[groupKey];
          if (tasksInGroup.length === 0) {
            return null;
          }

          const isLastGroup = groupIndex === groupKeys.length - 1;

          return (
            <div key={groupKey} className={sidebarTaskGroupContainerClass(groupBy, isLastGroup)}>
              {groupBy !== 'none' && (
                <div className="mb-3">
                  <h3 className="w-full text-center text-xs font-semibold text-gray-800 dark:text-gray-200 px-3 py-1.5 bg-gray-200 dark:bg-gray-700 rounded-md">
                    {groupKey}
                    <span className="ml-1.5 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold text-white bg-blue-600 rounded-full dark:bg-blue-500/25 dark:text-blue-200">
                      {tasksInGroup.length}
                    </span>
                  </h3>
                </div>
              )}
              <div className="space-y-2.5">
                {tasksInGroup.map((task) => (
                  <DraggableTask
                    key={task.id}
                    activeTaskDuration={activeTaskDuration}
                    activeTaskId={activeTaskId}
                    contextMenuBlurOtherCards={contextMenuBlurOtherCards}
                    contextMenuTaskId={contextMenuTaskId}
                    developers={backlogDevelopers}
                    selectedSprintId={selectedSprintId}
                    sidebarWidth={sidebarWidth}
                    task={task}
                    viewMode={viewMode}
                    onContextMenu={onContextMenu ? (e) => onContextMenu(e, task, true) : undefined}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {backlogTotalCount > 0 && (
          <div className="text-center text-xs text-gray-600 dark:text-gray-400 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            {t('sidebar.backlogTab.loadedCount', {
              loaded: backlogTasks.length,
              total: backlogTotalCount,
            })}
          </div>
        )}
        {backlogHasMore && (
          <div className="flex justify-center mt-3">
            <Button
              className="rounded px-4 py-2 text-xs font-medium"
              disabled={backlogLoading}
              type="button"
              variant="outline"
              onClick={onLoadMore}
            >
              {backlogLoading && !isInitialBacklogLoad ? (
                <span className="flex items-center gap-2">
                  <Icon className="h-3 w-3 animate-spin" name="spinner" />
                  {t('common.loading')}
                </span>
              ) : (
                t('sidebar.backlogTab.loadMore')
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
