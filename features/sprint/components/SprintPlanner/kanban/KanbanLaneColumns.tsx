'use client';

import type { KanbanLaneWithColumns } from './kanbanLane.types';
import type { Developer, Task } from '@/types';
import type { BoardColumn } from '@/types/tracker';

import { KanbanColumn } from './KanbanColumn';

interface KanbanLaneColumnsProps {
  activeTaskId: string | null;
  contextMenuBlurOtherCards: boolean;
  contextMenuTaskId: string | null | undefined;
  developers: Developer[];
  globalNameFilter: string | undefined;
  isLaneCollapsed: boolean;
  lane: KanbanLaneWithColumns;
  laneKey: string;
  sourceColumnId: string | null | undefined;
  canDropInColumn: (column: BoardColumn) => boolean;
  onContextMenu?: (e: React.MouseEvent, task: Task) => void;
  onTaskClick?: (taskId: string) => void;
}

export function KanbanLaneColumns({
  activeTaskId,
  canDropInColumn,
  contextMenuBlurOtherCards,
  contextMenuTaskId,
  developers,
  globalNameFilter,
  isLaneCollapsed,
  lane,
  laneKey,
  sourceColumnId,
  onContextMenu,
  onTaskClick,
}: KanbanLaneColumnsProps) {
  if (isLaneCollapsed) return null;
  return (
    <div className="flex gap-4 items-stretch min-h-[120px] flex-none pr-4">
      {lane.columnsWithHeaderData.map(({ column, tasks: columnTasks }) => (
        <KanbanColumn
          key={`${laneKey}-${column.id}`}
          columnId={`${laneKey}__${column.id}`}
          contextMenuBlurOtherCards={contextMenuBlurOtherCards}
          contextMenuTaskId={contextMenuTaskId}
          developers={developers}
          globalNameFilter={globalNameFilter}
          groupByAssignee
          isDragging={Boolean(activeTaskId)}
          isDropDisabled={Boolean(activeTaskId) && !canDropInColumn(column)}
          isSourceColumn={column.id === sourceColumnId}
          tasks={columnTasks}
          onContextMenu={onContextMenu}
          onTaskClick={onTaskClick}
        />
      ))}
    </div>
  );
}
