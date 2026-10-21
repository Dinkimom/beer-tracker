'use client';

import type { SwimlaneInProgressFactSegment } from '@/features/swimlane/utils/mergeInProgressDurationsForAssignee';
import type { Developer, Task } from '@/types';
import type { ChangelogEntry, IssueComment } from '@/types/tracker';

import { ZIndex } from '@/constants';
import { SwimlaneLaneBand } from '@/features/swimlane/components/SwimlaneLaneBand';
import { SWIMLANE_FACT_ROW_RIGHT_INSET_PX } from '@/features/swimlane/utils/in-progress-fact/swimlaneInProgressFactLayerConstants';
import {
  buildLanes,
  buildWithPhases,
} from '@/features/swimlane/utils/in-progress-fact/swimlaneInProgressFactLayerHelpers';
import {
  getSwimlaneInProgressFactLayerHeightFromLaneCount,
  SWIMLANE_IN_PROGRESS_FACT_BOTTOM_INSET_PX,
  SWIMLANE_IN_PROGRESS_FACT_TOP_INSET_PX,
  SWIMLANE_IN_PROGRESS_LANE_ROW_HEIGHT,
} from '@/features/swimlane/utils/mergeInProgressDurationsForAssignee';
import {
  dateTimeToFractionalCellInRange,
  OCCUPANCY_FACT_PHASE_GAP_PX,
  PHASE_ROW_INSET_PX,
} from '@/lib/planner-timeline';
import { getPlannerNow } from '@/utils/plannerClock';

import { SwimlaneFactLaneFlexRow } from './SwimlaneFactLaneFlexRow';

interface SwimlaneInProgressFactLayerProps {
  assigneeRole: Developer['role'];
  changelogsByTaskId: Map<string, ChangelogEntry[]>;
  commentsByTaskId: Map<string, IssueComment[]>;
  developerMap: Map<string, Developer>;
  /** Подсветка колбасы факта по hover карточки/факта конкретной задачи */
  factHoveredTaskId?: string | null;
  layerId: string;
  segments: SwimlaneInProgressFactSegment[];
  sprintStartDate: Date;
  /** Задачи, отображаемые карточками на этой строке — для них в тултипе факта не дублируем KEY: name */
  swimlaneRowTaskIds: Set<string>;
  tasksMap: Map<string, Task>;
  /** Всего частей таймлайна (рабочие дни × getPartsPerDay()), как у сетки/карточек свимлейна */
  totalParts: number;
  /** Подсветка карточки задачи при наведении на соответствующую колбасу факта */
  onFactSegmentHover?: (taskId: string | null) => void;
}

/**
 * Таймлайн факта (в работе, ревью, дефект, воронка теста, закрыто): отдельная полоса на задачу; при пересечении — вторая дорожка.
 * Фазы одной задачи — одна плоская колбаса: встык через шов, после паузы — через тонкую связку; закрытие — квадрат с галочкой в конце.
 */
export function SwimlaneInProgressFactLayer({
  assigneeRole,
  changelogsByTaskId,
  commentsByTaskId,
  developerMap,
  layerId,
  onFactSegmentHover,
  factHoveredTaskId = null,
  segments,
  sprintStartDate,
  swimlaneRowTaskIds,
  tasksMap,
  totalParts,
}: SwimlaneInProgressFactLayerProps) {
  const toCell = (d: Date) => dateTimeToFractionalCellInRange(sprintStartDate, d, totalParts);
  const nowCell = Math.min(toCell(getPlannerNow()), totalParts);
  const timelineStartCell = 0;
  const spanCells = nowCell - timelineStartCell;
  const leftPercent = (timelineStartCell / totalParts) * 100;
  const widthPercent = spanCells > 0 ? (spanCells / totalParts) * 100 : 0;

  const withPhases =
    segments.length === 0 || spanCells <= 0
      ? []
      : buildWithPhases(segments, sprintStartDate, nowCell, timelineStartCell, totalParts);

  const lanes = withPhases.length === 0 ? [] : buildLanes(withPhases);
  const totalLayerHeight = getSwimlaneInProgressFactLayerHeightFromLaneCount(lanes.length);
  const factTopInset = SWIMLANE_IN_PROGRESS_FACT_TOP_INSET_PX;
  const factBottomInset = SWIMLANE_IN_PROGRESS_FACT_BOTTOM_INSET_PX;
  const lanesInnerHeight = Math.max(0, totalLayerHeight - factTopInset - factBottomInset);
  const laneRowHeight = SWIMLANE_IN_PROGRESS_LANE_ROW_HEIGHT;
  const laneStackGap = OCCUPANCY_FACT_PHASE_GAP_PX;

  if (segments.length === 0 || spanCells <= 0 || lanes.length === 0) {
    return null;
  }

  return (
    <SwimlaneLaneBand
      accent="fact"
      className="absolute bottom-0 left-0 right-0 z-[1] pointer-events-none"
      style={{ height: totalLayerHeight }}
    >
      <div
        className="absolute flex pointer-events-none"
        style={{
          left: `calc(${leftPercent}% + ${PHASE_ROW_INSET_PX}px)`,
          bottom: factBottomInset,
          width: `max(0px, calc(${widthPercent}% - ${PHASE_ROW_INSET_PX}px - ${SWIMLANE_FACT_ROW_RIGHT_INSET_PX}px))`,
          height: lanesInnerHeight,
        }}
      >
        <div className="relative flex-1 min-w-0">
          {lanes.map((laneItems, laneIndex) => (
            <div
              key={`${layerId}-lane-${laneIndex}`}
              className="absolute left-0 right-0 flex items-stretch"
              style={{
                bottom: laneIndex * (laneRowHeight + laneStackGap),
                height: laneRowHeight,
                zIndex: ZIndex.contentOverlay,
              }}
            >
              <SwimlaneFactLaneFlexRow
                assigneeRole={assigneeRole}
                changelogsByTaskId={changelogsByTaskId}
                commentsByTaskId={commentsByTaskId}
                developerMap={developerMap}
                factHoveredTaskId={factHoveredTaskId}
                laneItems={laneItems}
                laneRowHeight={laneRowHeight}
                layerId={layerId}
                spanCells={spanCells}
                swimlaneRowTaskIds={swimlaneRowTaskIds}
                tasksMap={tasksMap}
                timelineStartCell={timelineStartCell}
                onFactSegmentHover={onFactSegmentHover}
              />
            </div>
          ))}
        </div>
      </div>
    </SwimlaneLaneBand>
  );
}
