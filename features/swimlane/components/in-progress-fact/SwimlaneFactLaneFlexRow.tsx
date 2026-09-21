'use client';

import type { SegmentWithPhase } from '@/features/swimlane/utils/in-progress-fact/swimlaneInProgressFactLayerHelpers';
import type { Developer, Task } from '@/types';
import type { ChangelogEntry, IssueComment } from '@/types/tracker';
import type { ReactNode } from 'react';

import {
  isClosedFactPhase,
  swimlaneFactBarElementId,
} from '@/features/swimlane/utils/in-progress-fact/swimlaneInProgressFactLayerHelpers';
import { OCCUPANCY_FACT_PHASE_GAP_PX } from '@/lib/planner-timeline';

import { SwimlaneClosedFactMarker } from './SwimlaneClosedFactMarker';
import { SwimlaneFactFlexPhaseBar } from './SwimlaneFactFlexPhaseBar';

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
  let accounted = 0;

  laneItems.forEach((item, idx) => {
    const { phase, seg } = item;
    const leftInSpan = Math.max(0, phase.startCell - timelineStartCell);
    const prevEnd =
      idx === 0 ? 0 : laneItems[idx - 1]!.phase.endCell - timelineStartCell;
    const spacerCells = Math.max(0, leftInSpan - prevEnd);
    accounted += spacerCells;
    if (spacerCells > 0) {
      flexNodes.push(
        <div
          key={`${layerId}-sp-${seg.taskId}-${phase.startCell}`}
          aria-hidden
          className="min-w-0"
          style={{ flex: `${spacerCells} 0 0` }}
        />
      );
    }
    if (isClosedFactPhase(phase)) {
      flexNodes.push(
        <SwimlaneClosedFactMarker
          key={`${layerId}-closed-${seg.taskId}-${phase.startCell}-${phase.endCell}`}
          assigneeRole={assigneeRole}
          barDomId={swimlaneFactBarElementId(layerId, seg)}
          changelogsByTaskId={changelogsByTaskId}
          commentsByTaskId={commentsByTaskId}
          developerMap={developerMap}
          factHoveredTaskId={factHoveredTaskId}
          hideTaskSummary={swimlaneRowTaskIds.has(seg.taskId)}
          laneRowHeight={laneRowHeight}
          layerId={layerId}
          phase={phase}
          seg={seg}
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
        barDomId={swimlaneFactBarElementId(layerId, seg)}
        changelogsByTaskId={changelogsByTaskId}
        commentsByTaskId={commentsByTaskId}
        developerMap={developerMap}
        factHoveredTaskId={factHoveredTaskId}
        hideTaskSummary={swimlaneRowTaskIds.has(seg.taskId)}
        laneRowHeight={laneRowHeight}
        layerId={layerId}
        phase={phase}
        seg={seg}
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
    <div
      className="relative flex flex-1 min-w-0 items-center"
      style={{ gap: OCCUPANCY_FACT_PHASE_GAP_PX }}
    >
      {flexNodes}
    </div>
  );
}
