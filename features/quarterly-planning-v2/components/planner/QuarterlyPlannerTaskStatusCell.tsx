'use client';

import type { Task } from '@/types';

import { QuarterlyPlannerTaskStatusCellContent } from './QuarterlyPlannerTaskStatusCellContent';


interface QuarterlyPlannerTaskStatusCellProps {
  className?: string;
  rowHeightPx: number;
  rowOpacity?: number;
  rowSpan?: number;
  sizeToContent?: boolean;
  status?: string;
  statusColorKey?: string;
  statusColumnWidth: number;
  task?: Pick<Task, 'id' | 'name' | 'originalStatus' | 'originalTaskId' | 'statusColorKey' | 'type'>;
  taskColumnWidth: number;
  onStatusChange?: (
    transitionId: string,
    targetStatusKey?: string,
    targetStatusDisplay?: string,
    screenId?: string
  ) => void;
}

export function QuarterlyPlannerTaskStatusCell({
  className = 'bg-white dark:bg-gray-900',
  onStatusChange,
  rowHeightPx,
  rowOpacity = 1,
  rowSpan,
  sizeToContent = false,
  status,
  statusColorKey,
  statusColumnWidth,
  task,
  taskColumnWidth,
}: QuarterlyPlannerTaskStatusCellProps) {
  return (
    <td
      className={`sticky z-[6] border-b border-r border-gray-200 dark:border-gray-600 p-0 relative overflow-hidden ${className}`}
      rowSpan={rowSpan}
      style={{
        left: taskColumnWidth,
        width: statusColumnWidth,
        minWidth: statusColumnWidth,
        minHeight: rowHeightPx,
        height: sizeToContent ? undefined : rowHeightPx,
        maxHeight: sizeToContent ? undefined : rowHeightPx,
        boxSizing: 'border-box',
        verticalAlign: 'middle',
        opacity: rowOpacity,
        transition: 'opacity 0.2s ease',
      }}
    >
      <div className="absolute inset-0 flex items-center justify-center px-1">
        <QuarterlyPlannerTaskStatusCellContent
          status={status}
          statusColorKey={statusColorKey}
          task={task}
          onStatusChange={onStatusChange}
        />
      </div>
    </td>
  );
}
