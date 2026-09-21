'use client';

import type { OccupancyTableHeaderProps } from './occupancyTableHeaderTypes';

import { WORKING_DAYS } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';

import { OccupancyTableHeaderByVariant } from './OccupancyTableHeaderByVariant';
import { findCurrentSprintIndex } from './occupancyTableHeaderHelpers';
import { resolveOccupancyHeaderVariant } from './occupancyTableHeaderVariant';

export type { SprintInfo, TimelineSettings } from './occupancyTableHeaderTypes';

const HEADER_ROW_HEIGHT = 40;
export const OCCUPANCY_HEADER_ROW_HEIGHT_PX = HEADER_ROW_HEIGHT + 1;

export function OccupancyTableHeader(props: OccupancyTableHeaderProps) {
  const { language } = useI18n();
  const dateLocale = language === 'en' ? 'en-US' : 'ru-RU';
  const variant = resolveOccupancyHeaderVariant({
    displayAsWeeks: props.displayAsWeeks,
    quarterlySplitTaskColumns: props.quarterlySplitTaskColumns,
    quarterlyWeekTimelineHeader: props.quarterlyWeekTimelineHeader,
    sprintInfos: props.sprintInfos,
  });
  const currentSprintIndex =
    props.sprintInfos != null ? findCurrentSprintIndex(props.sprintInfos) : -1;

  return (
    <OccupancyTableHeaderByVariant
      currentSprintIndex={currentSprintIndex}
      dateLocale={dateLocale}
      defaultWorkingDays={WORKING_DAYS}
      props={props}
      variant={variant}
    />
  );
}
