'use client';

import type { DayErrorDetail } from '@/features/sprint/utils/occupancyValidation';
import type { OccupancyTaskOrder } from '@/lib/api/types';
import type { Task } from '@/types';

import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import { DaysRow } from '@/features/sprint/components/DaysHeader/components/DaysRow';

import { OccupancyTableTaskColumnHeader } from './OccupancyTableTaskColumnHeader';

export function OccupancySingleSprintTableHeader({
  allExpanded,
  dayColumnWidth,
  displayAsWeeks,
  displayColumnCount,
  errorDayDetails,
  errorDayIndices,
  holidayDayIndices,
  isReorderMode,
  isResizing,
  onCollapseAll,
  onExpandAll,
  onHoveredErrorTaskIdChange,
  onTaskOrderChange,
  parentIds,
  setIsReorderMode,
  setIsResizing,
  showHolidayEmoji,
  sprintStartDate,
  sprintWorkingDaysCount,
  taskColumnWidth,
  tasks,
  totalStoryPoints,
  totalTestPoints,
  twoLineDayHeader,
}: {
  allExpanded: boolean;
  dayColumnWidth: number | undefined;
  displayAsWeeks: boolean;
  displayColumnCount: number;
  errorDayDetails: Map<number, DayErrorDetail[]>;
  errorDayIndices: Set<number>;
  holidayDayIndices?: Set<number>;
  isReorderMode: boolean;
  isResizing: boolean;
  onCollapseAll: () => void;
  onExpandAll: () => void;
  onHoveredErrorTaskIdChange: (taskId: string | null) => void;
  onTaskOrderChange?: (order: OccupancyTaskOrder) => void;
  parentIds: string[];
  setIsReorderMode: React.Dispatch<React.SetStateAction<boolean>>;
  setIsResizing: (value: boolean) => void;
  showHolidayEmoji?: boolean;
  sprintStartDate: Date;
  sprintWorkingDaysCount: number;
  taskColumnWidth: number;
  tasks: Task[];
  totalStoryPoints: number;
  totalTestPoints: number;
  twoLineDayHeader: boolean;
}) {
  const { t } = useI18n();
  const rowH = 41;

  return (
    <thead>
      <tr
        className="sticky top-0 bg-gray-100 dark:bg-gray-800 [&>th]:overflow-hidden [box-shadow:0_1px_0_0_#e5e7eb] dark:[box-shadow:0_1px_0_0_#374151]"
        style={{ zIndex: ZIndex.stickyMainHeader }}
      >
        <OccupancyTableTaskColumnHeader
          allExpanded={allExpanded}
          headerRowHeight={rowH}
          isReorderMode={isReorderMode}
          isResizing={isResizing}
          parentIds={parentIds}
          setIsReorderMode={setIsReorderMode}
          setIsResizing={setIsResizing}
          taskColumnWidth={taskColumnWidth}
          totalStoryPoints={totalStoryPoints}
          totalTestPoints={totalTestPoints}
          onCollapseAll={onCollapseAll}
          onExpandAll={onExpandAll}
          onTaskOrderChange={onTaskOrderChange}
        />
        {displayAsWeeks ? (
          Array.from({ length: displayColumnCount }, (_, weekIndex) => (
            <th
              key={weekIndex}
              className="px-2 text-center align-middle text-xs text-gray-600 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
              style={{
                width: dayColumnWidth ?? '10%',
                minWidth: dayColumnWidth,
                height: rowH,
                minHeight: rowH,
              }}
            >
              {t('sprintPlanner.occupancy.weekLabel', { n: weekIndex + 1 })}
            </th>
          ))
        ) : (
          <DaysRow
            dayColumnWidth={dayColumnWidth}
            errorDayDetails={errorDayDetails}
            errorDayIndices={errorDayIndices}
            holidayDayIndices={holidayDayIndices}
            multilineHeader={twoLineDayHeader}
            rowHeight={rowH}
            showHolidayEmoji={showHolidayEmoji}
            sprintStartDate={sprintStartDate}
            tasks={tasks}
            variant="occupancy"
            workingDaysCount={sprintWorkingDaysCount}
            onHoveredErrorTaskIdChange={onHoveredErrorTaskIdChange}
          />
        )}
      </tr>
    </thead>
  );
}
