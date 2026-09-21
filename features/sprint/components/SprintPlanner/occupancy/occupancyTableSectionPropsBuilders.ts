import type { OccupancyViewTableSectionProps } from './OccupancyViewTableSection';
import type { ComponentProps } from 'react';

import { OccupancyTableBody } from './components/table/OccupancyTableBody';
import { OccupancyTableHeader } from './components/table/OccupancyTableHeader';
import { OccupancyTaskArrows } from './components/task-arrows';

type HeaderProps = ComponentProps<typeof OccupancyTableHeader>;
type BodyProps = ComponentProps<typeof OccupancyTableBody>;
type TaskArrowsProps = ComponentProps<typeof OccupancyTaskArrows>;

/** Поля шапки без квартального маскирования ошибок/праздника — маскирование делает {@link buildOccupancyTableHeaderProps}. */
export type OccupancyTableHeaderPropsCore = Omit<
  HeaderProps,
  'errorDayDetails' | 'errorDayIndices' | 'showHolidayEmoji'
> & {
  errorDayDetails: HeaderProps['errorDayDetails'];
  errorDayIndices: HeaderProps['errorDayIndices'];
};

/**
 * Квартальный режим: скрываем ошибки по дням и эмодзи праздников в шапке.
 */
export function buildOccupancyTableHeaderProps(
  quarterlyPhaseStyle: boolean,
  core: OccupancyTableHeaderPropsCore
): HeaderProps {
  return {
    ...core,
    errorDayDetails: quarterlyPhaseStyle ? new Map() : core.errorDayDetails,
    errorDayIndices: quarterlyPhaseStyle ? new Set<number>() : core.errorDayIndices,
    showHolidayEmoji: quarterlyPhaseStyle ? false : undefined,
  };
}

/** Поля тела без квартального маскирования — маскирование в {@link buildOccupancyTableBodyProps}. */
export type OccupancyTableBodyPropsCore = Omit<
  BodyProps,
  'hoverConnectedPhaseIds' | 'occupancyErrorReasons' | 'occupancyErrorTaskIds'
> & {
  hoverConnectedPhaseIds: BodyProps['hoverConnectedPhaseIds'];
  occupancyErrorReasons: BodyProps['occupancyErrorReasons'];
  occupancyErrorTaskIds: BodyProps['occupancyErrorTaskIds'];
};

export function buildOccupancyTableBodyProps(
  quarterlyPhaseStyle: boolean,
  core: OccupancyTableBodyPropsCore
): BodyProps {
  return {
    ...core,
    occupancyErrorReasons: quarterlyPhaseStyle ? new Map() : core.occupancyErrorReasons,
    occupancyErrorTaskIds: quarterlyPhaseStyle ? new Set() : core.occupancyErrorTaskIds,
  };
}

export function buildOccupancyTaskArrowsProps(
  showLinks: boolean,
  props: TaskArrowsProps
): TaskArrowsProps | null {
  return showLinks ? props : null;
}

interface BuildOccupancyTableSectionPropsInput {
  bodyCore: OccupancyTableBodyPropsCore;
  dayColumnWidth: number | undefined;
  displayColumnCount: number;
  handleTableClickCapture: OccupancyViewTableSectionProps['handleTableClickCapture'];
  headerCore: OccupancyTableHeaderPropsCore;
  onDragEnd: OccupancyViewTableSectionProps['onDragEnd'];
  quarterlyPhaseStyle: boolean;
  showLinks: boolean;
  statusColumnWidth?: number;
  tableScrollRef: OccupancyViewTableSectionProps['tableScrollRef'];
  tableWidth: number | undefined;
  taskArrows: TaskArrowsProps;
  taskColumnWidth: number;
}

export function buildOccupancyTableSectionProps({
  bodyCore,
  dayColumnWidth,
  displayColumnCount,
  handleTableClickCapture,
  headerCore,
  quarterlyPhaseStyle,
  showLinks,
  tableScrollRef,
  tableWidth,
  taskArrows,
  statusColumnWidth = 0,
  taskColumnWidth,
  onDragEnd,
}: BuildOccupancyTableSectionPropsInput): OccupancyViewTableSectionProps {
  return {
    bodyProps: buildOccupancyTableBodyProps(quarterlyPhaseStyle, bodyCore),
    dayColumnWidth,
    displayColumnCount,
    handleTableClickCapture,
    headerProps: buildOccupancyTableHeaderProps(quarterlyPhaseStyle, headerCore),
    tableScrollRef,
    tableWidth,
    taskArrowsProps: buildOccupancyTaskArrowsProps(showLinks, taskArrows),
    statusColumnWidth,
    taskColumnWidth,
    onDragEnd,
  };
}
