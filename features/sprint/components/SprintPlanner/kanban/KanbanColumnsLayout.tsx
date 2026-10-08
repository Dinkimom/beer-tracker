'use client';

import type { KanbanColumnHeaderData, KanbanLaneWithColumns } from './kanbanLane.types';
import type { Developer, Task } from '@/types';
import type { BoardColumn } from '@/types/tracker';

import { KanbanColumn } from './KanbanColumn';
import { KanbanLaneSection } from './KanbanLaneSection';

interface KanbanColumnsLayoutProps {
  activeTaskId: string | null;
  collapsedLanes: Set<string>;
  columnsContainerRef: React.RefObject<HTMLDivElement | null>;
  columnsMinWidth: number | undefined;
  columnsWithHeaderData: KanbanColumnHeaderData[];
  contextMenuBlurOtherCards: boolean;
  contextMenuTaskId: string | null | undefined;
  developers: Developer[];
  globalNameFilter: string | undefined;
  groupByAssignee: boolean;
  groupByParent: boolean;
  hasLaneGrouping: boolean;
  lanesWithColumns: KanbanLaneWithColumns[];
  sourceColumnId: string | null | undefined;
  canDropInColumn: (column: BoardColumn) => boolean;
  onContextMenu?: (e: React.MouseEvent, task: Task) => void;
  onTaskClick?: (taskId: string) => void;
  t: (key: string, values?: Record<string, number | string>) => string;
  toggleLaneCollapsed: (laneKey: string) => void;
}

export function KanbanColumnsLayout({
  activeTaskId,
  canDropInColumn,
  collapsedLanes,
  columnsContainerRef,
  columnsMinWidth,
  columnsWithHeaderData,
  contextMenuBlurOtherCards,
  contextMenuTaskId,
  developers,
  globalNameFilter,
  groupByAssignee,
  groupByParent,
  hasLaneGrouping,
  lanesWithColumns,
  sourceColumnId,
  t,
  onContextMenu,
  onTaskClick,
  toggleLaneCollapsed,
}: KanbanColumnsLayoutProps) {
  if (hasLaneGrouping && lanesWithColumns.length > 0) {
    return (
      <div ref={columnsContainerRef} className="flex min-h-full flex-none flex-col pb-4 pl-4 pr-4">
        {lanesWithColumns.map((lane) => (
          <KanbanLaneSection
            key={lane.assigneeKey ?? lane.laneKey ?? ''}
            activeTaskId={activeTaskId}
            canDropInColumn={canDropInColumn}
            collapsedLanes={collapsedLanes}
            columnsMinWidth={columnsMinWidth}
            contextMenuBlurOtherCards={contextMenuBlurOtherCards}
            contextMenuTaskId={contextMenuTaskId}
            developers={developers}
            globalNameFilter={globalNameFilter}
            groupByAssignee={groupByAssignee}
            groupByParent={groupByParent}
            lane={lane}
            sourceColumnId={sourceColumnId}
            t={t}
            toggleLaneCollapsed={toggleLaneCollapsed}
            onContextMenu={onContextMenu}
            onTaskClick={onTaskClick}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      ref={columnsContainerRef}
      className="flex min-h-full flex-none items-stretch gap-3 px-4 pb-4 pt-0"
    >
      {columnsWithHeaderData.map(
        ({ column, tasks: columnTasks, filteredTasks, totalSp, totalTp }) => (
          <KanbanColumn
            key={column.id}
            columnId={column.id}
            contextMenuBlurOtherCards={contextMenuBlurOtherCards}
            contextMenuTaskId={contextMenuTaskId}
            developers={developers}
            globalNameFilter={globalNameFilter}
            header={{
              displayName: column.display,
              taskCount: filteredTasks.length,
              totalSp,
              totalTp,
            }}
            isDragging={Boolean(activeTaskId)}
            isDropDisabled={Boolean(activeTaskId) && !canDropInColumn(column)}
            isSourceColumn={column.id === sourceColumnId}
            tasks={columnTasks}
            onContextMenu={onContextMenu}
            onTaskClick={onTaskClick}
          />
        )
      )}
    </div>
  );
}
