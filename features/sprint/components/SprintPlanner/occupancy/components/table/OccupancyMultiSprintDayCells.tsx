'use client';

import type { SprintInfo } from './occupancyTableHeaderTypes';

import { useI18n } from '@/contexts/LanguageContext';
import { DaysRow } from '@/features/sprint/components/DaysHeader/components/DaysRow';
import { WEEKS_PER_SPRINT } from '@/features/sprint/components/SprintPlanner/occupancy/quarterlyTimelineHeader';

import { sprintWorkingDaysForHeader } from './occupancyTableHeaderHelpers';

export function OccupancyMultiSprintDayCells({
  dayColumnWidth,
  displayAsWeeks,
  displayColumnCount,
  rowH,
  showHolidayEmoji,
  sprintInfos,
  twoLineDayHeader,
}: {
  dayColumnWidth: number | undefined;
  displayAsWeeks: boolean;
  displayColumnCount: number;
  rowH: number;
  showHolidayEmoji?: boolean;
  sprintInfos: SprintInfo[];
  twoLineDayHeader: boolean;
}) {
  const { t } = useI18n();

  if (displayAsWeeks) {
    return (
      <>
        {Array.from({ length: displayColumnCount }, (_, weekIndex) => (
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
            {t('sprintPlanner.occupancy.weekLabel', {
              n: weekIndex % WEEKS_PER_SPRINT + 1,
            })}
          </th>
        ))}
      </>
    );
  }

  return (
    <>
      {sprintInfos.map((sprint) => (
        <DaysRow
          key={sprint.id}
          dayColumnWidth={dayColumnWidth}
          multilineHeader={twoLineDayHeader}
          rowHeight={rowH}
          showHolidayEmoji={showHolidayEmoji}
          sprintStartDate={sprint.startDate}
          variant="occupancy"
          workingDaysCount={sprintWorkingDaysForHeader(sprint)}
        />
      ))}
    </>
  );
}
