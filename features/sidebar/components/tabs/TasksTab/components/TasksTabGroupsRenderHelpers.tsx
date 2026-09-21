import type { Developer, LayoutViewMode, SidebarGroupBy, Task } from '@/types';
import type { ReactNode } from 'react';

import { sidebarTaskGroupContainerClass } from '@/features/sidebar/utils/sidebarTaskGroupContainerClass';
import { formatTaskGroupLabel } from '@/features/task/utils/formatTaskGroupLabel';

import { renderTasksTabGroupRows } from './TasksTabGroupsHelpers';

interface RenderTasksTabGroupSectionParams {
  activeTaskDuration?: number | null;
  activeTaskId?: string | null;
  contextMenuBlurOtherCards?: boolean;
  contextMenuTaskId?: string | null;
  developers: Developer[];
  groupBy: SidebarGroupBy;
  groupedTasks: Record<string, Task[]>;
  groupIndex: number;
  groupKey: string;
  groupKeysLength: number;
  insertIndex: number | null;
  qaTasksMap: Map<string, Task>;
  selectedSprintId?: number | null;
  sidebarDropTargetActive: boolean;
  sidebarWidth?: number;
  viewMode?: LayoutViewMode;
  visibleTaskOrdinalRef: { value: number };
  onAutoAddToSwimlane?: (task: Task) => void;
  onContextMenu?: (e: React.MouseEvent, task: Task, isBacklogTask?: boolean) => void;
  registerTaskRowRef: (taskId: string, element: HTMLDivElement | null) => void;
  renderDropSlot: (slotKey: string) => ReactNode;
  t: (key: string) => string;
}

export function renderTasksTabGroupSection(
  params: RenderTasksTabGroupSectionParams
): ReactNode | null {
  const tasksInGroup = params.groupedTasks[params.groupKey];
  if (!tasksInGroup || tasksInGroup.length === 0) return null;

  const isLastGroup = params.groupIndex === params.groupKeysLength - 1;
  const hideDraggedTaskInList = params.sidebarDropTargetActive && params.activeTaskId != null;

  return (
    <div
      key={params.groupKey}
      className={sidebarTaskGroupContainerClass(params.groupBy, isLastGroup)}
    >
      {params.groupBy !== 'none' && (
        <div className="mb-3">
          <h3 className="w-full text-center text-xs font-semibold text-gray-800 dark:text-gray-200 px-3 py-1.5 bg-gray-200 dark:bg-gray-700 rounded-md">
            {formatTaskGroupLabel(params.groupKey, params.t)}
            <span className="ml-1.5 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold text-white bg-blue-600 rounded-full dark:bg-blue-500/25 dark:text-blue-200">
              {tasksInGroup.length}
            </span>
          </h3>
        </div>
      )}
      <div className="flex flex-col gap-2.5">
        {renderTasksTabGroupRows({
          activeTaskDuration: params.activeTaskDuration,
          activeTaskId: params.activeTaskId,
          contextMenuBlurOtherCards: params.contextMenuBlurOtherCards,
          contextMenuTaskId: params.contextMenuTaskId,
          developers: params.developers,
          hideDraggedTaskInList,
          insertIndex: params.insertIndex,
          onAutoAddToSwimlane: params.onAutoAddToSwimlane,
          onContextMenu: params.onContextMenu,
          qaTasksMap: params.qaTasksMap,
          registerTaskRowRef: params.registerTaskRowRef,
          renderDropSlot: params.renderDropSlot,
          selectedSprintId: params.selectedSprintId,
          sidebarDropTargetActive: params.sidebarDropTargetActive,
          sidebarWidth: params.sidebarWidth,
          tasksInGroup,
          viewMode: params.viewMode,
          visibleTaskOrdinalRef: params.visibleTaskOrdinalRef,
        })}
      </div>
    </div>
  );
}
