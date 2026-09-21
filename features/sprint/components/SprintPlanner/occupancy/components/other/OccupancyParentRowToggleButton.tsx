'use client';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';

import { OccupancyParentRowToggleButtonLabels } from './OccupancyParentRowToggleButtonLabels';

interface OccupancyParentRowToggleButtonProps {
  displayLabel: string;
  isCollapsed: boolean;
  isInGoals: boolean;
  issueType?: string;
  quarterlySplitTaskColumns: boolean;
  row: { id: string; display: string; key?: string };
  status?: string;
  onToggle: (parentId: string) => void;
  t: (key: string, values?: Record<string, string>) => string;
}

export function OccupancyParentRowToggleButton({
  displayLabel,
  isCollapsed,
  isInGoals,
  issueType,
  quarterlySplitTaskColumns,
  row,
  status,
  t,
  onToggle,
}: OccupancyParentRowToggleButtonProps) {
  return (
    <Button
      aria-expanded={!isCollapsed}
      className="h-full min-h-10 min-w-0 flex-1 !justify-start !gap-2 !rounded-none !border-0 !bg-violet-50 !px-3 text-left shadow-none hover:!bg-violet-100/80 dark:!bg-slate-700/95 dark:hover:!bg-slate-600/95"
      type="button"
      variant="ghost"
      onClick={() => onToggle(row.id)}
    >
      <Icon
        className="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0"
        name={isCollapsed ? 'chevron-right' : 'chevron-down'}
      />
      <OccupancyParentRowToggleButtonLabels
        displayLabel={displayLabel}
        isInGoals={isInGoals}
        issueType={issueType}
        quarterlySplitTaskColumns={quarterlySplitTaskColumns}
        row={row}
        status={status}
        t={t}
      />
    </Button>
  );
}
