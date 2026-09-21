/**
 * Компонент списка задач с группировкой для TasksTab
 */

import type { Developer, LayoutViewMode, SidebarGroupBy, Task } from '@/types';

import { useMemo } from 'react';

import { useI18n } from '@/contexts/LanguageContext';
import { SidebarTaskDropPlaceholder } from '@/features/sidebar/components/SidebarTaskDropPlaceholder';
import { useTaskSidebar } from '@/features/sidebar/contexts/TaskSidebarContext';
import { useSidebarDropInsertIndex } from '@/features/sidebar/hooks/useSidebarDropInsertIndex';

import { buildOrderedTaskIds } from './TasksTabGroupsHelpers';
import {
  renderTasksTabGroupsContent,
  renderTasksTabGroupsEmpty,
} from './TasksTabGroupsViewHelpers';

interface TasksTabGroupsProps {
  activeTaskDuration?: number | null;
  activeTaskId?: string | null;
  contextMenuBlurOtherCards?: boolean;
  contextMenuTaskId?: string | null;
  developers: Developer[];
  groupBy: SidebarGroupBy;
  groupedTasks: Record<string, Task[]>;
  groupKeys: string[];
  qaTasksMap: Map<string, Task>;
  selectedSprintId?: number | null;
  sidebarWidth?: number;
  viewMode?: LayoutViewMode;
  onAutoAddToSwimlane?: (task: Task) => void;
  onContextMenu?: (e: React.MouseEvent, task: Task, isBacklogTask?: boolean) => void;
}

export function TasksTabGroups({
  groupKeys,
  groupedTasks,
  groupBy,
  developers,
  onContextMenu,
  qaTasksMap,
  activeTaskId,
  activeTaskDuration,
  contextMenuBlurOtherCards = false,
  contextMenuTaskId = null,
  viewMode,
  sidebarWidth,
  selectedSprintId,
  onAutoAddToSwimlane,
}: TasksTabGroupsProps) {
  const { t } = useI18n();
  const { sidebarDropTargetActive = false, sidebarDropPointerY = null } = useTaskSidebar();

  const orderedTaskIds = useMemo(
    () => buildOrderedTaskIds(groupKeys, groupedTasks),
    [groupKeys, groupedTasks]
  );

  const { insertIndex, registerTaskRowRef, slotHeightPx } = useSidebarDropInsertIndex({
    isDropTarget: sidebarDropTargetActive,
    pointerY: sidebarDropPointerY,
    orderedTaskIds,
    activeTaskId,
  });

  const hasTasks = orderedTaskIds.length > 0;
  const visibleTaskOrdinal = { value: 0 };

  const renderDropSlot = (slotKey: string) => (
    <SidebarTaskDropPlaceholder key={slotKey} heightPx={slotHeightPx} />
  );

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0 overscroll-contain">
      {!hasTasks
        ? renderTasksTabGroupsEmpty({
            insertIndex,
            renderDropSlot,
            sidebarDropTargetActive,
            t,
          })
        : renderTasksTabGroupsContent({
            activeTaskDuration,
            activeTaskId,
            contextMenuBlurOtherCards,
            contextMenuTaskId,
            developers,
            groupBy,
            groupKeys,
            groupedTasks,
            insertIndex,
            onAutoAddToSwimlane,
            onContextMenu,
            qaTasksMap,
            registerTaskRowRef,
            renderDropSlot,
            selectedSprintId,
            sidebarDropTargetActive,
            sidebarWidth,
            t,
            viewMode,
            visibleTaskOrdinal,
          })}
    </div>
  );
}
