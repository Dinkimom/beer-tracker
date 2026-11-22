import type { ReactNode } from 'react';

import { type RenderTasksTabGroupSectionParams, renderTasksTabGroupSection } from './TasksTabGroupsRenderHelpers';

interface RenderTasksTabGroupsEmptyParams {
  emptyLabel: string;
  insertIndex: number | null;
  sidebarDropTargetActive: boolean;
  renderDropSlot: (slotKey: string) => ReactNode;
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
            {params.emptyLabel}
          </p>
        </div>
      ) : null}
    </div>
  );
}

/** Все группы: то же, что у одной секции, но со списком ключей вместо одной группы. */
type RenderTasksTabGroupsContentParams = Omit<
  RenderTasksTabGroupSectionParams,
  'groupIndex' | 'groupKey' | 'groupKeysLength' | 'visibleTaskOrdinalRef'
> & {
  groupKeys: string[];
  visibleTaskOrdinal: { value: number };
};

export function renderTasksTabGroupsContent(params: RenderTasksTabGroupsContentParams): ReactNode {
  return (
    <>
      {params.groupKeys.map((groupKey, groupIndex) =>
        renderTasksTabGroupSection({
          activeTaskDuration: params.activeTaskDuration,
          activeTaskId: params.activeTaskId,
          developers: params.developers,
          groupBy: params.groupBy,
          groupIndex,
          groupKey,
          groupKeysLength: params.groupKeys.length,
          groupedTasks: params.groupedTasks,
          insertIndex: params.insertIndex,
          onAutoAddToSwimlane: params.onAutoAddToSwimlane,
          onPlanAssignees: params.onPlanAssignees,
          registerTaskRowRef: params.registerTaskRowRef,
          renderDropSlot: params.renderDropSlot,
          sidebarDropTargetActive: params.sidebarDropTargetActive,
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
