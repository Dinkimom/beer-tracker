'use client';

import type { SprintInfo } from './occupancyTableHeaderTypes';
import type { OccupancyTaskOrder } from '@/lib/api/types';

import { ZIndex } from '@/constants';
import { formatSprintDisplayName } from '@/utils/sprintDisplayName';

import { OccupancyMultiSprintDayCells } from './OccupancyMultiSprintDayCells';
import { occupancySprintHeaderThClass } from './occupancySprintHeaderThClass';
import {
  isPastSprintIndex,
  sprintColSpanForHeader,
} from './occupancyTableHeaderHelpers';
import { OccupancyTableTaskColumnHeader } from './OccupancyTableTaskColumnHeader';

const HEADER_ROW_HEIGHT = 40;

export function OccupancyMultiSprintTableHeader({
  allExpanded,
  currentSprintIndex,
  dayColumnWidth,
  displayAsWeeks,
  displayColumnCount,
  isReorderMode,
  isResizing,
  onCollapseAll,
  onExpandAll,
  onTaskOrderChange,
  parentIds,
  setIsReorderMode,
  setIsResizing,
  showHolidayEmoji,
  sprintInfos,
  taskColumnWidth,
  totalStoryPoints,
  totalTestPoints,
  twoLineDayHeader,
}: {
  allExpanded: boolean;
  currentSprintIndex: number;
  dayColumnWidth: number | undefined;
  displayAsWeeks: boolean;
  displayColumnCount: number;
  isReorderMode: boolean;
  isResizing: boolean;
  onCollapseAll: () => void;
  onExpandAll: () => void;
  onTaskOrderChange?: (order: OccupancyTaskOrder) => void;
  parentIds: string[];
  setIsReorderMode: React.Dispatch<React.SetStateAction<boolean>>;
  setIsResizing: (value: boolean) => void;
  showHolidayEmoji?: boolean;
  sprintInfos: SprintInfo[];
  taskColumnWidth: number;
  totalStoryPoints: number;
  totalTestPoints: number;
  twoLineDayHeader: boolean;
}) {
  const rowH = HEADER_ROW_HEIGHT + 1;

  return (
    <thead>
      <tr
        className="sticky top-0 bg-gray-100 dark:bg-gray-800 [&>th]:overflow-hidden"
        style={{ zIndex: ZIndex.stickyMainHeader + 1 }}
      >
        <OccupancyTableTaskColumnHeader
          allExpanded={allExpanded}
          content="title"
          headerRowHeight={rowH}
          isReorderMode={isReorderMode}
          isResizing={isResizing}
          parentIds={parentIds}
          rowDividerClass="relative sticky left-0 z-[11] bg-gray-100 dark:bg-gray-800 px-3 align-middle [box-shadow:inset_-1px_0_0_#e5e7eb,inset_0_-1px_0_#e5e7eb] dark:[box-shadow:inset_-1px_0_0_#374151,inset_0_-1px_0_#374151]"
          setIsReorderMode={setIsReorderMode}
          setIsResizing={setIsResizing}
          taskColumnWidth={taskColumnWidth}
          totalStoryPoints={totalStoryPoints}
          totalTestPoints={totalTestPoints}
          onCollapseAll={onCollapseAll}
          onExpandAll={onExpandAll}
        />
        {sprintInfos.map((sprint, idx) => {
          const isCurrentSprint = currentSprintIndex === idx;
          const isPastSprint = isPastSprintIndex(currentSprintIndex, idx);
          return (
            <th
              key={sprint.id}
              className={`px-3 text-center align-middle text-xs font-semibold border-r border-gray-200 dark:border-gray-700 [box-shadow:inset_0_-1px_0_#e5e7eb] dark:[box-shadow:inset_0_-1px_0_#374151] ${occupancySprintHeaderThClass(isCurrentSprint, isPastSprint)}`}
              colSpan={sprintColSpanForHeader(sprint, displayAsWeeks)}
              style={{ height: rowH }}
            >
              {formatSprintDisplayName(sprint.name, sprint.quarter)}
            </th>
          );
        })}
      </tr>
      <tr
        className="sticky bg-gray-100 dark:bg-gray-800 [&>th]:overflow-hidden [&>th]:border-b [&>th]:border-gray-200 dark:[&>th]:border-gray-700"
        style={{ top: rowH, zIndex: ZIndex.stickyMainHeader }}
      >
        <OccupancyTableTaskColumnHeader
          allExpanded={allExpanded}
          content="controls"
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
        <OccupancyMultiSprintDayCells
          dayColumnWidth={dayColumnWidth}
          displayAsWeeks={displayAsWeeks}
          displayColumnCount={displayColumnCount}
          rowH={rowH}
          showHolidayEmoji={showHolidayEmoji}
          sprintInfos={sprintInfos}
          twoLineDayHeader={twoLineDayHeader}
        />
      </tr>
    </thead>
  );
}
