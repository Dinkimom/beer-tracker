'use client';

import type { OccupancyTableHeaderProps } from './occupancyTableHeaderTypes';
import type { OccupancyHeaderVariant } from './occupancyTableHeaderVariant';

import { OccupancyMultiSprintTableHeader } from './OccupancyMultiSprintTableHeader';
import { OccupancyQuarterlySplitTableHeader } from './OccupancyQuarterlySplitTableHeader';
import { OccupancyQuarterlyWeekTimelineTableHeader } from './OccupancyQuarterlyWeekTimelineTableHeader';
import { OccupancySingleSprintTableHeader } from './OccupancySingleSprintTableHeader';

function renderQuarterlySplitHeader(
  props: OccupancyTableHeaderProps,
  currentSprintIndex: number,
  dateLocale: string
) {
  if (!props.sprintInfos) return null;
  return (
    <OccupancyQuarterlySplitTableHeader
      currentSprintIndex={currentSprintIndex}
      dateLocale={dateLocale}
      dayColumnWidth={props.dayColumnWidth}
      isResizing={props.isResizing}
      setIsResizing={props.setIsResizing}
      sprintInfos={props.sprintInfos}
      taskColumnWidth={props.taskColumnWidth}
    />
  );
}

function renderQuarterlyWeekHeader(
  props: OccupancyTableHeaderProps,
  currentSprintIndex: number,
  dateLocale: string
) {
  if (!props.sprintInfos) return null;
  return (
    <OccupancyQuarterlyWeekTimelineTableHeader
      allExpanded={props.allExpanded}
      currentSprintIndex={currentSprintIndex}
      dateLocale={dateLocale}
      dayColumnWidth={props.dayColumnWidth}
      isReorderMode={props.isReorderMode}
      isResizing={props.isResizing}
      parentIds={props.parentIds}
      setIsReorderMode={props.setIsReorderMode}
      setIsResizing={props.setIsResizing}
      sprintInfos={props.sprintInfos}
      taskColumnWidth={props.taskColumnWidth}
      totalStoryPoints={props.totalStoryPoints}
      totalTestPoints={props.totalTestPoints}
      onCollapseAll={props.onCollapseAll}
      onExpandAll={props.onExpandAll}
      onTaskOrderChange={props.onTaskOrderChange}
    />
  );
}

function renderMultiSprintHeader(props: OccupancyTableHeaderProps, currentSprintIndex: number) {
  if (!props.sprintInfos) return null;
  return (
    <OccupancyMultiSprintTableHeader
      allExpanded={props.allExpanded}
      currentSprintIndex={currentSprintIndex}
      dayColumnWidth={props.dayColumnWidth}
      displayAsWeeks={props.displayAsWeeks ?? false}
      displayColumnCount={props.displayColumnCount ?? 10}
      isReorderMode={props.isReorderMode}
      isResizing={props.isResizing}
      parentIds={props.parentIds}
      setIsReorderMode={props.setIsReorderMode}
      setIsResizing={props.setIsResizing}
      showHolidayEmoji={props.showHolidayEmoji}
      sprintInfos={props.sprintInfos}
      taskColumnWidth={props.taskColumnWidth}
      totalStoryPoints={props.totalStoryPoints}
      totalTestPoints={props.totalTestPoints}
      twoLineDayHeader={props.twoLineDayHeader ?? false}
      onCollapseAll={props.onCollapseAll}
      onExpandAll={props.onExpandAll}
      onTaskOrderChange={props.onTaskOrderChange}
    />
  );
}

export function OccupancyTableHeaderByVariant({
  currentSprintIndex,
  dateLocale,
  defaultWorkingDays,
  props,
  variant,
}: {
  currentSprintIndex: number;
  dateLocale: string;
  defaultWorkingDays: number;
  props: OccupancyTableHeaderProps;
  variant: OccupancyHeaderVariant;
}) {
  if (variant === 'quarterly-split') {
    return renderQuarterlySplitHeader(props, currentSprintIndex, dateLocale);
  }
  if (variant === 'quarterly-week') {
    return renderQuarterlyWeekHeader(props, currentSprintIndex, dateLocale);
  }
  if (variant === 'multi-sprint') {
    return renderMultiSprintHeader(props, currentSprintIndex);
  }

  return (
    <OccupancySingleSprintTableHeader
      allExpanded={props.allExpanded}
      dayColumnWidth={props.dayColumnWidth}
      displayAsWeeks={props.displayAsWeeks ?? false}
      displayColumnCount={props.displayColumnCount ?? 10}
      errorDayDetails={props.errorDayDetails}
      errorDayIndices={props.errorDayIndices}
      holidayDayIndices={props.holidayDayIndices}
      isReorderMode={props.isReorderMode}
      isResizing={props.isResizing}
      parentIds={props.parentIds}
      setIsReorderMode={props.setIsReorderMode}
      setIsResizing={props.setIsResizing}
      showHolidayEmoji={props.showHolidayEmoji}
      sprintStartDate={props.sprintStartDate}
      sprintWorkingDaysCount={props.sprintWorkingDaysCount ?? defaultWorkingDays}
      taskColumnWidth={props.taskColumnWidth}
      tasks={props.tasks}
      totalStoryPoints={props.totalStoryPoints}
      totalTestPoints={props.totalTestPoints}
      twoLineDayHeader={props.twoLineDayHeader ?? false}
      onCollapseAll={props.onCollapseAll}
      onExpandAll={props.onExpandAll}
      onHoveredErrorTaskIdChange={props.onHoveredErrorTaskIdChange}
      onTaskOrderChange={props.onTaskOrderChange}
    />
  );
}
