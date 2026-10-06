import type { Developer, LayoutViewMode, SidebarGroupBy, Task } from '@/types';
import type { ReactNode } from 'react';

import { Button } from '@/components/Button';
import { sidebarTaskGroupContainerClass } from '@/features/sidebar/utils/sidebarTaskGroupContainerClass';
import { formatTaskGroupLabel } from '@/features/task/utils/formatTaskGroupLabel';

import { SidebarTaskGroupLabel } from '../../../SidebarTaskGroupLabel';

import { renderTasksTabGroupRows } from './TasksTabGroupsHelpers';

function assigneeIdsInGroup(tasks: readonly Task[]): ReadonlySet<string> {
  const ids = new Set<string>();
  for (const task of tasks) {
    if (task.assignee) {
      ids.add(task.assignee);
    }
  }
  return ids;
}

function planAssigneeGroupAction(
  tasks: readonly Task[],
  groupBy: SidebarGroupBy,
  onPlanAssignees: ((assigneeIds: ReadonlySet<string>) => void) | undefined,
  t: (key: string) => string
): ReactNode {
  if (groupBy !== 'assignee' || !onPlanAssignees) {
    return null;
  }
  const assigneeIds = assigneeIdsInGroup(tasks);
  if (assigneeIds.size === 0) {
    return null;
  }
  return (
    <Button
      className="h-6 shrink-0 px-2 py-0 text-[11px] font-semibold"
      title={t('sidebar.tasksTab.planAssigneeTitle')}
      type="button"
      variant="accent"
      onClick={() => onPlanAssignees(assigneeIds)}
    >
      {t('sidebar.tasksTab.planAssignee')}
    </Button>
  );
}

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
  onPlanAssignees?: (assigneeIds: ReadonlySet<string>) => void;
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
        <SidebarTaskGroupLabel
          action={planAssigneeGroupAction(
            tasksInGroup,
            params.groupBy,
            params.onPlanAssignees,
            params.t
          )}
          count={tasksInGroup.length}
          label={formatTaskGroupLabel(params.groupKey, params.t)}
        />
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
