import type { Developer, LayoutViewMode, SidebarGroupBy, Task } from '@/types';
import type { ReactNode } from 'react';

import { renderTasksTabGroupSection } from './TasksTabGroupsRenderHelpers';

interface RenderTasksTabGroupsEmptyParams {
  insertIndex: number | null;
  sidebarDropTargetActive: boolean;
  renderDropSlot: (slotKey: string) => ReactNode;
  t: (key: string) => string;
}

export function renderTasksTabGroupsEmpty(params: RenderTasksTabGroupsEmptyParams): ReactNode {
  return (
    <div className="flex min-h-full flex-col gap-2.5">
      {params.sidebarDropTargetActive && params.insertIndex === 0
        ? params.renderDropSlot('sidebar-drop-slot-empty')
        : null}
      {!params.sidebarDropTargetActive ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {params.t('sidebar.tasksTabGroups.allTasksPlanned')}
          </p>
        </div>
      ) : null}
    </div>
  );
}

interface RenderTasksTabGroupsContentParams {
  activeTaskDuration?: number | null;
  activeTaskId?: string | null;
  contextMenuBlurOtherCards?: boolean;
  contextMenuTaskId?: string | null;
  developers: Developer[];
  groupBy: SidebarGroupBy;
  groupedTasks: Record<string, Task[]>;
  groupKeys: string[];
  insertIndex: number | null;
  qaTasksMap: Map<string, Task>;
  selectedSprintId?: number | null;
  sidebarDropTargetActive: boolean;
  sidebarWidth?: number;
  viewMode?: LayoutViewMode;
  visibleTaskOrdinal: { value: number };
  onAutoAddToSwimlane?: (task: Task) => void;
  onContextMenu?: (e: React.MouseEvent, task: Task, isBacklogTask?: boolean) => void;
  registerTaskRowRef: (taskId: string, element: HTMLDivElement | null) => void;
  renderDropSlot: (slotKey: string) => ReactNode;
  t: (key: string) => string;
}

export function renderTasksTabGroupsContent(params: RenderTasksTabGroupsContentParams): ReactNode {
  return (
    <>
      {params.groupKeys.map((groupKey, groupIndex) =>
        renderTasksTabGroupSection({
          activeTaskDuration: params.activeTaskDuration,
          activeTaskId: params.activeTaskId,
          contextMenuBlurOtherCards: params.contextMenuBlurOtherCards,
          contextMenuTaskId: params.contextMenuTaskId,
          developers: params.developers,
          groupBy: params.groupBy,
          groupIndex,
          groupKey,
          groupKeysLength: params.groupKeys.length,
          groupedTasks: params.groupedTasks,
          insertIndex: params.insertIndex,
          onAutoAddToSwimlane: params.onAutoAddToSwimlane,
          onContextMenu: params.onContextMenu,
          qaTasksMap: params.qaTasksMap,
          registerTaskRowRef: params.registerTaskRowRef,
          renderDropSlot: params.renderDropSlot,
          selectedSprintId: params.selectedSprintId,
          sidebarDropTargetActive: params.sidebarDropTargetActive,
          sidebarWidth: params.sidebarWidth,
          t: params.t,
          viewMode: params.viewMode,
          visibleTaskOrdinalRef: params.visibleTaskOrdinal,
        })
      )}
      {params.sidebarDropTargetActive && params.insertIndex === params.visibleTaskOrdinal.value ? (
        <div className="mt-2.5">{params.renderDropSlot('sidebar-drop-slot-end')}</div>
      ) : null}
    </>
  );
}
