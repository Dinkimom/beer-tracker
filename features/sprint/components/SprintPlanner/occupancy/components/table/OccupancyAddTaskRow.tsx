'use client';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import { QUARTERLY_STATUS_COLUMN_WIDTH_PX } from '@/features/quarterly-planning-v2/components/planner/quarterlyPlannerLayout';

import { OccupancyAddTaskRowDayCells } from './OccupancyAddTaskRowDayCells';

const OCCUPANCY_TASK_ROW_MIN_HEIGHT = 56;
const OCCUPANCY_TASK_ROW_LEGACY_TM_MIN_HEIGHT = 40;
const ROW_BORDER_PX = 1;

interface OccupancyAddTaskRowProps {
  cellsPerDay?: 1 | 3;
  dayColumnWidth: number | undefined;
  displayAsWeeks?: boolean;
  effectiveColumns: number;
  holidayDayIndices?: Set<number>;
  legacyCompactLayout?: boolean;
  parent: { id: string; display: string; key?: string };
  quarterlySplitTaskColumns?: boolean;
  sprintStartDate: Date;
  taskColumnWidth: number;
  workingDays: number;
  onCreateTaskForParent: (row: { id: string; display: string; key?: string }) => void;
}

export function OccupancyAddTaskRow({
  dayColumnWidth,
  displayAsWeeks = false,
  effectiveColumns,
  holidayDayIndices,
  legacyCompactLayout = false,
  parent,
  quarterlySplitTaskColumns = false,
  sprintStartDate,
  taskColumnWidth,
  workingDays: _workingDays,
  cellsPerDay = 3,
  onCreateTaskForParent,
}: OccupancyAddTaskRowProps) {
  const { t } = useI18n();
  const baseMin = legacyCompactLayout ? OCCUPANCY_TASK_ROW_LEGACY_TM_MIN_HEIGHT : OCCUPANCY_TASK_ROW_MIN_HEIGHT;
  const rowHeight = baseMin - ROW_BORDER_PX;
  return (
    <tr className="border-t border-b border-gray-100 dark:border-gray-700">
      <td
        className="sticky left-0 z-[6] p-0 align-top relative bg-gray-50 dark:bg-gray-900"
        style={{
          width: taskColumnWidth,
          minWidth: taskColumnWidth,
          height: rowHeight,
          verticalAlign: 'top',
        }}
      >
        <div className="absolute right-0 top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-700 pointer-events-none" style={{ zIndex: 10 }} />
        <Button
          className="h-full w-full !min-h-0 items-center gap-2 !rounded-none !border border-dashed border-gray-300 !bg-transparent !px-3 text-sm text-gray-600 shadow-none hover:!border-gray-400 hover:!bg-gray-100 hover:!text-gray-900 dark:border-gray-600 dark:text-gray-400 dark:hover:!border-gray-500 dark:hover:!bg-gray-800 dark:hover:!text-gray-200"
          style={{ minHeight: rowHeight, boxSizing: 'border-box' }}
          type="button"
          variant="ghost"
          onClick={() => onCreateTaskForParent(parent)}
        >
          <Icon className="h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400" name="plus" />
          <span className="truncate">{t('sprintPlanner.occupancy.addTaskButton')}</span>
        </Button>
      </td>
      {quarterlySplitTaskColumns ? (
        <td
          className="sticky z-[6] border-b border-r border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900"
          style={{
            left: taskColumnWidth,
            width: QUARTERLY_STATUS_COLUMN_WIDTH_PX,
            minWidth: QUARTERLY_STATUS_COLUMN_WIDTH_PX,
            height: rowHeight,
          }}
        />
      ) : null}
      <td
        className="relative border-r border-gray-200 dark:border-gray-600 p-0 align-top bg-gray-50/50 dark:bg-gray-800/50"
        colSpan={effectiveColumns}
        style={{
          height: rowHeight,
          minHeight: rowHeight,
          verticalAlign: 'top',
          boxSizing: 'border-box',
        }}
      >
        <div className="relative h-full w-full">
          <OccupancyAddTaskRowDayCells
            cellsPerDay={displayAsWeeks ? 1 : cellsPerDay}
            dayColumnWidth={dayColumnWidth}
            holidayDayIndices={holidayDayIndices}
            rowHeight={rowHeight}
            sprintStartDate={sprintStartDate}
            workingDays={effectiveColumns}
          />
        </div>
      </td>
    </tr>
  );
}
