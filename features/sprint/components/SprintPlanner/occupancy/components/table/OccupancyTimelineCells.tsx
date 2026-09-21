'use client';

import type { SprintInfo } from './OccupancyTableHeader';
import type { QuarterlyWeekColumn } from '@/features/sprint/components/SprintPlanner/occupancy/quarterlyTimelineHeader';
import type { Developer, Task, TaskPosition } from '@/types';
import type { IssueComment } from '@/types/tracker';

import { Button } from '@/components/Button';
import { PARTS_PER_DAY } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';

import { OccupancyIssueCommentIcon } from '../shared/OccupancyIssueCommentIcon';

import { resolveOccupancyCellTitle } from './occupancyTimelineCellsHelpers';
import { buildOccupancyTimelinePartCellState } from './occupancyTimelinePartCellHelpers';

/** Размер иконки комментария Трекера в недельных ячейках */
const ISSUE_COMMENT_ICON_SIZE = 22;
/** top контейнера плановых фаз относительно строки (см. OccupancyTaskRow) */
const PLAN_CONTAINER_TOP = 4;

interface OccupancyTimelineCellsProps {
  assignee?: Developer;
  /** 1 = одна ячейка на день, 3 = три части дня */
  cellsPerDay?: 1 | 3;
  dayColumnWidth: number | undefined;
  developerMap: Map<string, Developer>;
  /** Колонки по неделям (квартальный план) */
  displayAsWeeks?: boolean;
  /** Индексы дней (0..9), которые являются нерабочими/праздничными */
  holidayDayIndices?: Set<number>;
  /** Комментарии из Трекера по индексу недельной колонки */
  issueCommentsByWeek?: Map<number, IssueComment[]>;
  /** Высота полосы фазы плана (px) — для позиционирования иконок комментариев */
  phaseBarHeightPx: number;
  /** Отступ полосы фазы от верхнего края план-контейнера (px) */
  phaseBarTopOffsetPx: number;
  position?: TaskPosition;
  qaAssignee?: Developer;
  qaPosition?: TaskPosition;
  qaTask?: Task | null;
  rowHeightMinusBorder: number;
  /** Показывать комментарии Трекера в недельных ячейках */
  showIssueCommentsInWeeks?: boolean;
  sprintInfos?: SprintInfo[];
  sprintStartDate: Date;
  task: Task;
  /** totalParts для позиционирования комментариев (рабочие дни квартала × PARTS_PER_DAY) */
  timelineTotalParts?: number;
  weekColumns?: QuarterlyWeekColumn[];
  /** Количество рабочих дней в таймлайне (10 для одного спринта, N*10 для мультиспринта) */
  workingDays?: number;
  handleEmptyCellClick: (
    targetTask: Task,
    dayIndex: number,
    partIndex: number,
    cellElement: HTMLElement,
    getAnchorRect?: (cell: HTMLElement) => DOMRect
  ) => void;
  setHoveredCell: (cell: {
    taskId: string;
    dayIndex: number;
    partIndex: number;
  } | null) => void;
}

export function OccupancyTimelineCells({
  assignee,
  dayColumnWidth,
  developerMap,
  handleEmptyCellClick,
  phaseBarHeightPx,
  phaseBarTopOffsetPx,
  qaAssignee,
  qaPosition,
  qaTask,
  position,
  rowHeightMinusBorder,
  setHoveredCell,
  sprintStartDate,
  task,
  holidayDayIndices,
  workingDays = 10,
  cellsPerDay = 3,
  displayAsWeeks = false,
  issueCommentsByWeek,
  showIssueCommentsInWeeks = false,
  sprintInfos,
  timelineTotalParts,
  weekColumns,
}: OccupancyTimelineCellsProps) {
  const { t } = useI18n();
  const issueCommentIconTop = Math.round(
    PLAN_CONTAINER_TOP + phaseBarTopOffsetPx + (phaseBarHeightPx - ISSUE_COMMENT_ICON_SIZE) / 2
  );
  const partsPerDay = cellsPerDay === 1 ? 1 : PARTS_PER_DAY;
  const showWeekIssueComments =
    showIssueCommentsInWeeks &&
    displayAsWeeks &&
    issueCommentsByWeek != null &&
    weekColumns != null &&
    weekColumns.length > 0 &&
    sprintInfos != null &&
    timelineTotalParts != null &&
    timelineTotalParts > 0;

  return (
    <div
      className="relative flex w-full items-stretch"
      style={{
        height: rowHeightMinusBorder,
        minHeight: rowHeightMinusBorder,
        boxSizing: 'border-box',
      }}
    >
      {Array.from({ length: workingDays }, (_, dayIndex) => (
        <div
          key={dayIndex}
          className={`flex flex-1 min-w-0 items-stretch border-r border-gray-200 dark:border-gray-600 last:border-r-0 ${
            holidayDayIndices?.has(dayIndex)
              ? 'bg-gray-50 dark:bg-gray-900/40'
              : ''
          }`}
          style={{
            width: dayColumnWidth ?? '10%',
            minWidth: 0,
          }}
        >
          {Array.from({ length: partsPerDay }, (_, partIndex) => {
            const cellState = buildOccupancyTimelinePartCellState({
              assignee,
              cellsPerDay,
              dayIndex,
              issueCommentsByWeek: issueCommentsByWeek ?? new Map(),
              partIndex,
              position,
              qaAssignee,
              qaPosition,
              qaTask,
              showWeekIssueComments,
              sprintInfos,
              sprintStartDate,
              task,
              timelineTotalParts,
              weekColumns: weekColumns ?? [],
              workingDays,
            });
            const {
              cellColor,
              cellGhostHoverReset,
              isEmpty,
              issueCommentsInWeekCell,
              occupied,
              partStatus,
              targetTask,
              weekTimelineRange,
            } = cellState;
            const cellTitle = resolveOccupancyCellTitle({
              assignee,
              occupied,
              occupiedByDev: cellState.occupiedByDev,
              qaAssignee,
              qaTask,
              task,
              t,
            });

            return (
              <div
                key={partIndex}
                className={`relative flex-1 min-w-0 flex flex-col box-border ${
                  partIndex !== partsPerDay - 1
                    ? 'border-r border-gray-200/50 dark:border-gray-700/50'
                    : ''
                }`}
              >
                <Button
                  className={`relative flex-1 min-w-0 items-center justify-center !h-full !min-h-0 !w-full !rounded-none !border-0 !p-0 shadow-none ${cellColor} ${cellGhostHoverReset} ${
                    occupied ? 'cursor-default' : 'cursor-pointer'
                  }`}
                  data-current-cell={
                    isEmpty && partStatus === 'current' ? 'true' : undefined
                  }
                  data-occupancy-timeline-cell
                  title={cellTitle}
                  type="button"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (occupied) return;
                    if (targetTask) {
                      handleEmptyCellClick(
                        targetTask,
                        dayIndex,
                        partIndex,
                        e.currentTarget
                      );
                    }
                  }}
                  onMouseEnter={() =>
                    isEmpty &&
                    targetTask &&
                    setHoveredCell({ taskId: task.id, dayIndex, partIndex })
                  }
                  onMouseLeave={() => setHoveredCell(null)}
                >
                  {/* Превью добавления фазы рисуется призрачной фазой в строке (OccupancyTaskRow), не в ячейке */}
                </Button>
                {weekTimelineRange != null &&
                issueCommentsInWeekCell.length > 0 &&
                timelineTotalParts != null ? (
                  <div
                    className="absolute inset-x-0 pointer-events-none overflow-visible"
                    style={{
                      top: issueCommentIconTop,
                      height: ISSUE_COMMENT_ICON_SIZE,
                      zIndex: 8,
                    }}
                  >
                    {issueCommentsInWeekCell.map((issueComment) => (
                      <OccupancyIssueCommentIcon
                        key={`issue-comment-${issueComment.id}`}
                        comment={issueComment}
                        developerMap={developerMap}
                        sprintStartDate={sprintStartDate}
                        timelineEndCell={weekTimelineRange.endCell}
                        timelineStartCell={weekTimelineRange.startCell}
                        totalParts={timelineTotalParts}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
