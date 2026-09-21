import type { Developer, LayoutViewMode, Task } from '@/types';
import type { ReactNode } from 'react';

import { DraggableTask } from '@/features/task/components/DraggableTask';

interface RenderTasksTabGroupRowsParams {
  activeTaskDuration?: number | null;
  activeTaskId?: string | null;
  contextMenuBlurOtherCards?: boolean;
  contextMenuTaskId?: string | null;
  developers: Developer[];
  hideDraggedTaskInList: boolean;
  insertIndex: number | null;
  qaTasksMap: Map<string, Task>;
  selectedSprintId?: number | null;
  sidebarDropTargetActive: boolean;
  sidebarWidth?: number;
  tasksInGroup: Task[];
  viewMode?: LayoutViewMode;
  visibleTaskOrdinalRef: { value: number };
  onAutoAddToSwimlane?: (task: Task) => void;
  onContextMenu?: (e: React.MouseEvent, task: Task, isBacklogTask?: boolean) => void;
  registerTaskRowRef: (taskId: string, element: HTMLDivElement | null) => void;
  renderDropSlot: (slotKey: string) => ReactNode;
}

function renderTasksTabTaskRow(params: {
  activeTaskDuration?: number | null;
  activeTaskId?: string | null;
  contextMenuBlurOtherCards?: boolean;
  contextMenuTaskId?: string | null;
  developers: Developer[];
  onAutoAddToSwimlane?: (task: Task) => void;
  onContextMenu?: (e: React.MouseEvent, task: Task, isBacklogTask?: boolean) => void;
  qaTasksMap: Map<string, Task>;
  registerTaskRowRef: (taskId: string, element: HTMLDivElement | null) => void;
  selectedSprintId?: number | null;
  sidebarWidth?: number;
  task: Task;
  viewMode?: LayoutViewMode;
}): ReactNode {
  return (
    <div key={params.task.id} ref={(el) => params.registerTaskRowRef(params.task.id, el)}>
      <DraggableTask
        activeTaskDuration={params.activeTaskDuration}
        activeTaskId={params.activeTaskId}
        contextMenuBlurOtherCards={params.contextMenuBlurOtherCards}
        contextMenuTaskId={params.contextMenuTaskId}
        developers={params.developers}
        qaTasksMap={params.qaTasksMap}
        selectedSprintId={params.selectedSprintId}
        sidebarWidth={params.sidebarWidth}
        task={params.task}
        viewMode={params.viewMode}
        onAutoAddToSwimlane={params.onAutoAddToSwimlane}
        onContextMenu={
          params.onContextMenu
            ? (e: React.MouseEvent) => params.onContextMenu!(e, params.task, false)
            : undefined
        }
      />
    </div>
  );
}

export function renderTasksTabGroupRows(params: RenderTasksTabGroupRowsParams): ReactNode[] {
  return params.tasksInGroup.flatMap((task) => {
    if (params.hideDraggedTaskInList && task.id === params.activeTaskId) {
      return [];
    }

    const showPlaceholderBefore =
      params.sidebarDropTargetActive && params.insertIndex === params.visibleTaskOrdinalRef.value;
    const slotKey = `sidebar-drop-slot-${params.visibleTaskOrdinalRef.value}`;
    params.visibleTaskOrdinalRef.value += 1;

    const row = renderTasksTabTaskRow({
      activeTaskDuration: params.activeTaskDuration,
      activeTaskId: params.activeTaskId,
      contextMenuBlurOtherCards: params.contextMenuBlurOtherCards,
      contextMenuTaskId: params.contextMenuTaskId,
      developers: params.developers,
      onAutoAddToSwimlane: params.onAutoAddToSwimlane,
      onContextMenu: params.onContextMenu,
      qaTasksMap: params.qaTasksMap,
      registerTaskRowRef: params.registerTaskRowRef,
      selectedSprintId: params.selectedSprintId,
      sidebarWidth: params.sidebarWidth,
      task,
      viewMode: params.viewMode,
    });

    return showPlaceholderBefore ? [params.renderDropSlot(slotKey), row] : [row];
  });
}

export function buildOrderedTaskIds(
  groupKeys: string[],
  groupedTasks: Record<string, Task[]>
): string[] {
  const ids: string[] = [];
  for (const groupKey of groupKeys) {
    const tasksInGroup = groupedTasks[groupKey] ?? [];
    for (const task of tasksInGroup) {
      ids.push(task.id);
    }
  }
  return ids;
}
