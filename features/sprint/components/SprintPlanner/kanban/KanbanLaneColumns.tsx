'use client';

import type { KanbanColumnHeaderData } from './kanbanLane.types';
import type { Developer, Task } from '@/types';
import type { BoardColumn } from '@/types/tracker';

import { KanbanColumn } from './KanbanColumn';

/** Ряд колонок канбана: в дорожке группировки или вся доска без группировки (`laneKey` = null). */
interface KanbanLaneColumnsProps {
  activeTaskId: string | null;
  className?: string;
  columnsWithHeaderData: KanbanColumnHeaderData[];
  containerRef?: React.RefObject<HTMLDivElement | null>;
  contextMenuBlurOtherCards: boolean;
  contextMenuTaskId: string | null | undefined;
  developers: Developer[];
  globalNameFilter: string | undefined;
  isLaneCollapsed?: boolean;
  laneKey: string | null;
  sourceColumnId: string | null | undefined;
  canDropInColumn: (column: BoardColumn) => boolean;
  onContextMenu?: (e: React.MouseEvent, task: Task) => void;
  onTaskClick?: (taskId: string) => void;
}

export function KanbanLaneColumns({
  activeTaskId,
  canDropInColumn,
  className = 'flex min-h-[120px] flex-none items-stretch gap-3 pr-4',
  columnsWithHeaderData,
  containerRef,
  contextMenuBlurOtherCards,
  contextMenuTaskId,
  developers,
  globalNameFilter,
  isLaneCollapsed = false,
  laneKey,
  sourceColumnId,
  onContextMenu,
  onTaskClick,
}: KanbanLaneColumnsProps) {
  if (isLaneCollapsed) return null;
  return (
    <div ref={containerRef} className={className}>
      {columnsWithHeaderData.map(({ column, tasks: columnTasks }) => (
        <KanbanColumn
          key={laneKey ? `${laneKey}-${column.id}` : column.id}
          columnId={laneKey ? `${laneKey}__${column.id}` : column.id}
          contextMenuBlurOtherCards={contextMenuBlurOtherCards}
          contextMenuTaskId={contextMenuTaskId}
          developers={developers}
          globalNameFilter={globalNameFilter}
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
