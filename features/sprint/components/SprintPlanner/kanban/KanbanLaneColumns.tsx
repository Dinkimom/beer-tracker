'use client';

import type { KanbanColumnHeaderData } from './kanbanLane.types';

import { useKanbanBoard } from './KanbanBoardContext';
import { KanbanColumn } from './KanbanColumn';

/** Ряд колонок канбана: в дорожке группировки или вся доска без группировки (`laneKey` = null). */
interface KanbanLaneColumnsProps {
  className?: string;
  columnsWithHeaderData: KanbanColumnHeaderData[];
  containerRef?: React.RefObject<HTMLDivElement | null>;
  isLaneCollapsed?: boolean;
  laneKey: string | null;
}

export function KanbanLaneColumns({
  className = 'flex min-h-[120px] flex-none items-stretch gap-3 pr-4',
  columnsWithHeaderData,
  containerRef,
  isLaneCollapsed = false,
  laneKey,
}: KanbanLaneColumnsProps) {
  const { activeTaskId, canDropInColumn, sourceColumnId } = useKanbanBoard();
  if (isLaneCollapsed) return null;
  return (
    <div ref={containerRef} className={className}>
      {columnsWithHeaderData.map(({ column, tasks: columnTasks }) => (
        <KanbanColumn
          key={laneKey ? `${laneKey}-${column.id}` : column.id}
          columnId={laneKey ? `${laneKey}__${column.id}` : column.id}
          isDragging={Boolean(activeTaskId)}
          isDropDisabled={Boolean(activeTaskId) && !canDropInColumn(column)}
          isSourceColumn={column.id === sourceColumnId}
          tasks={columnTasks}
        />
      ))}
    </div>
  );
}
