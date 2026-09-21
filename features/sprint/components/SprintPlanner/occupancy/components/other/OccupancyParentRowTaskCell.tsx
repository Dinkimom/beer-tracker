'use client';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { StickyTaskColumnRightEdge } from '@/features/sprint/components/SprintPlanner/occupancy/components/table/StickyTaskColumnRightEdge';

import { OccupancyParentRowToggleButton } from './OccupancyParentRowToggleButton';

interface OccupancyParentRowTaskCellProps {
  displayLabel: string;
  dragHandle: { attributes: object; listeners: object | undefined } | null;
  isCollapsed: boolean;
  isInGoals: boolean;
  issueType?: string;
  quarterlySplitTaskColumns: boolean;
  row: { id: string; display: string; key?: string };
  status?: string;
  taskColumnWidth: number;
  onCreateTaskForParent?: (row: { id: string; display: string; key?: string }) => void;
  onToggle: (parentId: string) => void;
  t: (key: string, values?: Record<string, string>) => string;
}

export function OccupancyParentRowTaskCell({
  displayLabel,
  dragHandle,
  isCollapsed,
  isInGoals,
  issueType,
  quarterlySplitTaskColumns,
  row,
  status,
  taskColumnWidth,
  t,
  onCreateTaskForParent,
  onToggle,
}: OccupancyParentRowTaskCellProps) {
  return (
    <td
      className="sticky left-0 z-[11] bg-violet-50 dark:bg-slate-700 p-0 align-middle relative overflow-hidden"
      style={{
        width: taskColumnWidth,
        minWidth: taskColumnWidth,
        height: 40,
        maxHeight: 40,
        boxSizing: 'border-box',
      }}
    >
      <StickyTaskColumnRightEdge />
      <div
        className="absolute left-0 top-0 right-0 h-px bg-gray-200 dark:bg-slate-600 pointer-events-none"
        style={{ zIndex: 61 }}
      />
      <div
        className="absolute left-0 bottom-0 right-0 h-px bg-gray-200 dark:bg-slate-600 pointer-events-none"
        style={{ zIndex: 12 }}
      />
      <div className="flex items-center w-full h-10 max-h-10 min-h-10">
        {dragHandle ? (
          <div
            {...dragHandle.attributes}
            {...dragHandle.listeners}
            className="cursor-grab active:cursor-grabbing flex-shrink-0 p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            title={t('sprintPlanner.occupancy.dragToReorder')}
            onClick={(e) => e.stopPropagation()}
          >
            <Icon className="w-4 h-4 text-gray-400 dark:text-gray-500" name="grip-vertical" />
          </div>
        ) : null}
        <OccupancyParentRowToggleButton
          displayLabel={displayLabel}
          isCollapsed={isCollapsed}
          isInGoals={isInGoals}
          issueType={issueType}
          quarterlySplitTaskColumns={quarterlySplitTaskColumns}
          row={row}
          status={status}
          t={t}
          onToggle={onToggle}
        />
        {onCreateTaskForParent && row.key ? (
          <Button
            className="mr-2 !min-h-0 !p-1.5 text-xs font-medium text-blue-600 shadow-none hover:!bg-blue-50 dark:text-blue-300 dark:hover:!bg-blue-900/40"
            title={t('sprintPlanner.occupancy.createTaskInStory')}
            type="button"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onCreateTaskForParent(row);
            }}
          >
            <Icon className="h-4 w-4" name="plus" />
          </Button>
        ) : null}
      </div>
    </td>
  );
}
