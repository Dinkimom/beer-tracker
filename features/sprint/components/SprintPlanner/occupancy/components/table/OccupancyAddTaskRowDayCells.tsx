'use client';

import { PARTS_PER_DAY } from '@/constants';
import { getPartStatus } from '@/utils/dateUtils';

interface OccupancyAddTaskRowDayCellsProps {
  cellsPerDay?: 1 | 3;
  dayColumnWidth: number | undefined;
  holidayDayIndices?: Set<number>;
  rowHeight: number;
  sprintStartDate: Date;
  workingDays: number;
}

export function OccupancyAddTaskRowDayCells({
  dayColumnWidth,
  holidayDayIndices,
  rowHeight,
  sprintStartDate,
  workingDays,
  cellsPerDay = 3,
}: OccupancyAddTaskRowDayCellsProps) {
  const partsPerDay = cellsPerDay === 1 ? 1 : PARTS_PER_DAY;
  return (
    <div
      className="relative flex w-full items-stretch"
      style={{
        height: rowHeight,
        minHeight: rowHeight,
        boxSizing: 'border-box',
      }}
    >
      {Array.from({ length: workingDays }, (_, dayIndex) => (
        <div
          key={dayIndex}
          className={`flex flex-1 min-w-0 items-stretch border-r border-gray-200 dark:border-gray-600 last:border-r-0 box-border ${
            holidayDayIndices?.has(dayIndex)
              ? 'bg-gray-50 dark:bg-gray-900/40'
              : ''
          }`}
          style={{ width: dayColumnWidth ?? '10%', minWidth: 0 }}
        >
          {Array.from({ length: partsPerDay }, (_, partIndex) => {
            const partStatus = getPartStatus(dayIndex, partIndex, sprintStartDate, workingDays);
            const isCurrent = partStatus === 'current';
            return (
              <div
                key={partIndex}
                className={`flex-1 min-w-0 border-r border-gray-200/50 dark:border-gray-700/50 last:border-r-0 box-border ${
                  isCurrent ? 'bg-blue-100/70 dark:bg-blue-900/30' : ''
                }`}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
