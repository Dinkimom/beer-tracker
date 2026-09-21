'use client';

import type { AvailabilitySegment } from '@/features/swimlane/utils/availabilitySegments';
import type { Developer } from '@/types';

import { Avatar } from '@/components/Avatar';
import { PARTS_PER_DAY } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';

import {
  PHASE_BAR_HEIGHT_COMPACT_PX,
  PHASE_BAR_HEIGHT_PX,
} from '../task-row/plan/occupancyPhaseBarConstants';

import { OccupancyAvailabilityBar } from './OccupancyAvailabilityBar';

const OCCUPANCY_TASK_ROW_MIN_HEIGHT = 56;
/** Согласовано с OccupancyTableBody — компактный режим строк */
const OCCUPANCY_TASK_ROW_LEGACY_TM_MIN_HEIGHT = 40;
const OCCUPANCY_DAY_ROW_HEIGHT = 40;
const ROW_BORDER_PX = 1;

interface OccupancyAvailabilitySectionProps {
  availabilityDevelopersWithSegments: Array<{
    developer: Developer;
    segments: AvailabilitySegment[];
  }>;
  dayColumnWidth: number | undefined;
  /** Компактный режим — ниже строки и более узкие полосы доступности */
  legacyCompactLayout?: boolean;
  taskColumnWidth: number;
  workingDays: number;
}

export function OccupancyAvailabilitySection({
  availabilityDevelopersWithSegments,
  taskColumnWidth,
  dayColumnWidth,
  legacyCompactLayout = false,
  workingDays,
}: OccupancyAvailabilitySectionProps) {
  const { t } = useI18n();
  if (availabilityDevelopersWithSegments.length === 0) {
    return null;
  }

  const dayCount = Math.max(1, workingDays);
  const dayWidthPercent = 100 / dayCount;
  const totalTimelineParts = dayCount * PARTS_PER_DAY;

  const taskRowMin =
    legacyCompactLayout ? OCCUPANCY_TASK_ROW_LEGACY_TM_MIN_HEIGHT : OCCUPANCY_TASK_ROW_MIN_HEIGHT;
  const rowHeight = taskRowMin - ROW_BORDER_PX;
  const availabilityBarHeightPx = legacyCompactLayout ? PHASE_BAR_HEIGHT_COMPACT_PX : PHASE_BAR_HEIGHT_PX;

  return (
    <>
      <tr
        className="sticky z-10 bg-blue-50/90 dark:bg-slate-700/95 border-b-2 border-blue-200/80 dark:border-slate-600 shadow-[0_1px_0_0_rgba(0,0,0,0.05)] dark:shadow-[0_1px_0_0_rgba(255,255,255,0.05)]"
        style={{ top: OCCUPANCY_DAY_ROW_HEIGHT, minHeight: 40, height: 40 }}
      >
        <td
          className="sticky left-0 z-[11] border-b-2 border-r border-blue-200/80 dark:border-slate-600 bg-blue-50/90 dark:bg-slate-700/95 px-3 align-middle"
          style={{
            width: taskColumnWidth,
            minWidth: taskColumnWidth,
            height: 40,
          }}
        >
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            {t('sprintPlanner.occupancy.availabilityTitle')}
          </span>
        </td>
        <td
          className="sticky z-10 border-b-2 border-blue-200/80 dark:border-slate-600 bg-blue-50/90 dark:bg-slate-700/95 p-0 align-middle"
          colSpan={dayCount}
          style={{ height: 40, top: OCCUPANCY_DAY_ROW_HEIGHT }}
        >
          <div
            className="flex w-full h-full"
            style={{ height: 40, minHeight: 40 }}
          >
            {Array.from({ length: dayCount }, (_, dayIndex) => (
              <div
                key={`day-${dayIndex}`}
                className="flex flex-1 min-w-0 border-r border-blue-200/80 dark:border-slate-600 last:border-r-0"
                style={{
                  width: dayColumnWidth ?? `${dayWidthPercent}%`,
                  minWidth: 0,
                }}
              >
                {Array.from({ length: PARTS_PER_DAY }, (_, partIndex) => (
                  <div
                    key={partIndex}
                    className={`flex-1 min-w-0 box-border ${
                      partIndex !== PARTS_PER_DAY - 1
                        ? 'border-r border-blue-200/50 dark:border-slate-600/50'
                        : ''
                    }`}
                  />
                ))}
              </div>
            ))}
          </div>
        </td>
      </tr>
      {availabilityDevelopersWithSegments.map(({ developer, segments }) => (
        <tr
          key={developer.id}
          className="relative border-b border-gray-300 dark:border-gray-600 bg-gray-50/30 dark:bg-gray-800/30 overflow-hidden"
          style={{
            height: rowHeight,
            minHeight: taskRowMin - ROW_BORDER_PX,
          }}
        >
          <td
            className="sticky left-0 z-[9] border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-3 align-middle"
            style={{
              width: taskColumnWidth,
              minWidth: taskColumnWidth,
              height: rowHeight,
              verticalAlign: 'middle',
            }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Avatar
                avatarUrl={developer.avatarUrl}
                initials={developer.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                size={legacyCompactLayout ? 'sm' : 'md'}
              />
              <span className="text-sm text-gray-800 dark:text-gray-200 truncate">
                {developer.name}
              </span>
            </div>
          </td>
          <td
            className="relative border-r border-gray-300 dark:border-gray-600 p-0 align-top bg-gray-50/50 dark:bg-gray-800/50"
            colSpan={dayCount}
            style={{
              height: rowHeight,
              minHeight: taskRowMin - ROW_BORDER_PX,
              boxSizing: 'border-box',
              verticalAlign: 'top',
            }}
          >
            <div
              className="relative flex w-full items-stretch"
              style={{
                height: rowHeight,
                minHeight: taskRowMin - ROW_BORDER_PX,
              }}
            >
              {Array.from({ length: dayCount }, (_, dayIndex) => (
                <div
                  key={`day-${dayIndex}`}
                  className="flex flex-1 min-w-0 border-r border-gray-300 dark:border-gray-600 last:border-r-0"
                  style={{
                    width: dayColumnWidth ?? `${dayWidthPercent}%`,
                    minWidth: 0,
                  }}
                >
                  {Array.from({ length: PARTS_PER_DAY }, (_, partIndex) => (
                    <div
                      key={partIndex}
                      className={`flex-1 min-w-0 box-border ${
                        partIndex !== PARTS_PER_DAY - 1
                          ? 'border-r border-gray-200/50 dark:border-gray-700/50'
                          : ''
                      }`}
                    />
                  ))}
                </div>
              ))}
              <div className="absolute inset-0 pointer-events-none">
                {segments.map((seg) => (
                  <OccupancyAvailabilityBar
                    key={`${seg.kind}-${seg.startDay}-${seg.dateRangeLabel}`}
                    barHeightPx={availabilityBarHeightPx}
                    rowHeight={rowHeight}
                    segment={seg}
                    taskColumnWidth={taskColumnWidth}
                    totalTimelineParts={totalTimelineParts}
                  />
                ))}
              </div>
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}
