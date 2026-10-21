'use client';

import type { SegmentWithPhase } from '@/features/swimlane/utils/in-progress-fact/swimlaneInProgressFactLayerHelpers';
import type { Developer, Task } from '@/types';
import type { ChangelogEntry, IssueComment } from '@/types/tracker';
import type { ReactNode } from 'react';

import {
  type FactLaneLinkToPrev,
  isClosedFactPhase,
  resolveFactLaneLinksToPrev,
} from '@/features/swimlane/utils/in-progress-fact/swimlaneInProgressFactLayerHelpers';

import { SwimlaneClosedFactMarker } from './SwimlaneClosedFactMarker';
import { SwimlaneFactFlexPhaseBar } from './SwimlaneFactFlexPhaseBar';
import { resolveFactMarkerHoverState } from './swimlaneFactMarkerHelpers';
import { swimlaneFactMarkerOpacityClass } from './swimlaneFactMarkerOpacityClass';

/**
 * Форма фазы: каждая фаза — отдельная пилюля; между фазами одной задачи 2px,
 * между разными задачами — 4px. Фаза, которая идёт сейчас, справа не скругляется, а затухает.
 */
function factPhaseShapeClassName(linkToPrev: FactLaneLinkToPrev, touchesPrev: boolean): string {
  if (linkToPrev === 'joined') return 'rounded-full ml-0.5';
  return linkToPrev === 'none' && touchesPrev ? 'rounded-full ml-1' : 'rounded-full';
}

export function SwimlaneFactLaneFlexRow({
  assigneeRole,
  changelogsByTaskId,
  commentsByTaskId,
  developerMap,
  laneItems,
  laneRowHeight,
  layerId,
  onFactSegmentHover,
  spanCells,
  swimlaneRowTaskIds,
  tasksMap,
  timelineStartCell,
  factHoveredTaskId = null,
}: {
  assigneeRole: Developer['role'];
  changelogsByTaskId: Map<string, ChangelogEntry[]>;
  commentsByTaskId: Map<string, IssueComment[]>;
  developerMap: Map<string, Developer>;
  laneItems: SegmentWithPhase[];
  laneRowHeight: number;
  layerId: string;
  onFactSegmentHover?: (taskId: string | null) => void;
  spanCells: number;
  swimlaneRowTaskIds: Set<string>;
  tasksMap: Map<string, Task>;
  timelineStartCell: number;
  factHoveredTaskId?: string | null;
}) {
  if (spanCells <= 0 || laneItems.length === 0) return null;

  const flexNodes: ReactNode[] = [];
  const linksToPrev = resolveFactLaneLinksToPrev(laneItems);
  let accounted = 0;

  laneItems.forEach((item, idx) => {
    const { phase, seg } = item;
    const leftInSpan = Math.max(0, phase.startCell - timelineStartCell);
    const prevEnd =
      idx === 0 ? 0 : laneItems[idx - 1]!.phase.endCell - timelineStartCell;
    const spacerCells = Math.max(0, leftInSpan - prevEnd);
    const linkToPrev = linksToPrev[idx]!;
    const linkToNext = linksToPrev[idx + 1];
    const isNowEdge = linkToNext !== 'joined' && seg.endTime == null;
    const shapeClassName = factPhaseShapeClassName(linkToPrev, idx > 0 && spacerCells <= 0);
    accounted += spacerCells;
    if (spacerCells > 0) {
      const { isDimmedByFactHover, isFactHovered } = resolveFactMarkerHoverState(
        factHoveredTaskId,
        seg.taskId
      );
      flexNodes.push(
        <div
          key={`${layerId}-sp-${seg.taskId}-${phase.startCell}`}
          aria-hidden
          className="flex min-w-0 items-center"
          style={{ flex: `${spacerCells} 0 0` }}
        >
          {linkToPrev === 'paused' && (
            <div
              className={`h-px w-full bg-gray-300 dark:bg-gray-600 ${swimlaneFactMarkerOpacityClass(isFactHovered, isDimmedByFactHover)}`}
            />
          )}
        </div>
      );
    }
    if (isClosedFactPhase(phase)) {
      flexNodes.push(
        <SwimlaneClosedFactMarker
          key={`${layerId}-closed-${seg.taskId}-${phase.startCell}-${phase.endCell}`}
          assigneeRole={assigneeRole}
          changelogsByTaskId={changelogsByTaskId}
          commentsByTaskId={commentsByTaskId}
          developerMap={developerMap}
          factHoveredTaskId={factHoveredTaskId}
          hideTaskSummary={swimlaneRowTaskIds.has(seg.taskId)}
          laneRowHeight={laneRowHeight}
          layerId={layerId}
          phase={phase}
          seg={seg}
          shapeClassName={shapeClassName}
          tasksMap={tasksMap}
          onFactSegmentHover={onFactSegmentHover}
        />
      );
      return;
    }
    const widthInSpan = Math.min(phase.endCell - phase.startCell, spanCells - leftInSpan);
    accounted += widthInSpan;
    flexNodes.push(
      <SwimlaneFactFlexPhaseBar
        key={`${layerId}-bar-${seg.taskId}-${phase.startCell}-${phase.endCell}`}
        assigneeRole={assigneeRole}
        changelogsByTaskId={changelogsByTaskId}
        commentsByTaskId={commentsByTaskId}
        developerMap={developerMap}
        factHoveredTaskId={factHoveredTaskId}
        hideTaskSummary={swimlaneRowTaskIds.has(seg.taskId)}
        isNowEdge={isNowEdge}
        laneRowHeight={laneRowHeight}
        layerId={layerId}
        phase={phase}
        seg={seg}
        shapeClassName={shapeClassName}
        tasksMap={tasksMap}
        widthInSpan={widthInSpan}
        onFactSegmentHover={onFactSegmentHover}
      />
    );
  });

  const tailFlex = Math.max(0, spanCells - accounted);
  if (tailFlex > 0.0001) {
    flexNodes.push(
      <div
        key={`${layerId}-tail`}
        aria-hidden
        className="min-w-0"
        style={{ flex: `${tailFlex} 0 0` }}
      />
    );
  }

  return (
    <div className="relative flex flex-1 min-w-0 items-center">
      {flexNodes}
    </div>
  );
}
