'use client';

import type { StatusDuration } from '@/features/task/components/TaskTimeline/types';
import type { GitLabMergeRequestFact } from '@/lib/gitlab/mergeRequestFactTypes';
import type { Developer, Task } from '@/types';
import type { ChangelogEntry, IssueComment } from '@/types/tracker';

import React from 'react';

import { ZIndex } from '@/constants';
import { GitlabFactTimelineMarker } from '@/features/gitlab/components/GitlabFactTimelineMarker';
import {
  GITLAB_FACT_CHIP_SIZE_PX,
  OCCUPANCY_FACT_STATUS_BAND_PX,
  computeGitlabMarkerLeftPercent,
  layoutFactTimelineMarkers,
  selectGitlabEventsForFactTimeline,
  type FactTimelineMarkerPoint,
} from '@/features/gitlab/utils/gitlabFactTimelineLayoutHelpers';

import {
  dateTimeToFractionalCellInRange,
  TOTAL_PARTS,
} from '../../utils/sprintCellUtils';
import { statusDurationsToCells } from '../../utils/statusToCells';
import { OccupancyIssueCommentIcon } from '../shared/OccupancyIssueCommentIcon';
import {
  OCCUPANCY_FACT_PHASE_GAP_PX,
  PHASE_ROW_INSET_PX,
} from '../task-row/plan/occupancyPhaseBarConstants';

import {
  computeFactPhaseFlexSegment,
  computeFactPhaseTailFlex,
  isClosedFactPhase,
} from './occupancyActualPhasesFlexHelpers';
import { getReestimationEvents } from './occupancyActualPhasesHelpers';
import { computeActualPhaseTimelineBounds } from './occupancyActualPhasesTimelineHelpers';
import { OccupancyClosedFactMarker } from './OccupancyClosedFactMarker';
import { OccupancyReestimationMarker } from './OccupancyReestimationMarker';
import { OccupancyStatusPhaseBar } from './OccupancyStatusPhaseBar';

const FACT_TIMELINE_MARKER_INSET_PX = 18;
const FACT_ROW_RIGHT_INSET_PX = 4;

function renderOccupancyFactStatusFlexNodes(input: {
  changelog: ChangelogEntry[];
  developerMap: Map<string, Developer>;
  rowHeight: number;
  spanCells: number;
  taskId: string;
  tasksMap?: Map<string, Task>;
  timelineStartCell: number;
  visiblePhases: ReturnType<typeof statusDurationsToCells>;
}): React.ReactNode {
  if (input.spanCells <= 0) return null;
  const flexNodes: React.ReactNode[] = [];
  let accounted = 0;
  input.visiblePhases.forEach((phase, idx) => {
    const segment = computeFactPhaseFlexSegment(
      phase,
      idx,
      input.visiblePhases,
      input.timelineStartCell,
      input.spanCells
    );
    accounted += segment.accounted;
    if (segment.spacerCells > 0) {
      flexNodes.push(
        <div
          key={`spacer-${phase.statusKey}-${phase.startCell}`}
          style={{ flex: `${segment.spacerCells} 0 0`, minWidth: 0 }}
        />
      );
    }
    if (isClosedFactPhase(phase)) {
      flexNodes.push(
        <OccupancyClosedFactMarker
          key={`${input.taskId}-closed-${phase.startCell}-${phase.endCell}`}
          changelog={input.changelog}
          developerMap={input.developerMap}
          phase={phase}
          rowHeight={input.rowHeight}
          taskId={input.taskId}
          tasksMap={input.tasksMap}
        />
      );
      return;
    }
    flexNodes.push(
      <OccupancyStatusPhaseBar
        key={`${input.taskId}-${phase.statusKey}-${phase.startCell}-${phase.endCell}`}
        changelog={input.changelog}
        developerMap={input.developerMap}
        phase={phase}
        rowHeight={input.rowHeight}
        spanCells={input.spanCells}
        taskId={input.taskId}
        tasksMap={input.tasksMap}
        timelineStartCell={input.timelineStartCell}
      />
    );
  });
  const tailFlex = computeFactPhaseTailFlex(accounted, input.spanCells);
  if (tailFlex > 0.0001) {
    flexNodes.push(
      <div
        key={`${input.taskId}-fact-tail-spacer`}
        aria-hidden
        className="min-w-0"
        style={{ flex: `${tailFlex} 0 0` }}
      />
    );
  }
  return flexNodes;
}

interface OccupancyActualPhasesProps {
  changelog: ChangelogEntry[];
  comments: IssueComment[];
  developerMap: Map<string, Developer>;
  durations: StatusDuration[];
  gitlabFact?: GitLabMergeRequestFact;
  showComments: boolean;
  showGitlab?: boolean;
  showReestimations: boolean;
  showStatuses: boolean;
  sprintStartDate: Date;
  taskCreatedAt?: string | null;
  taskId: string;
  tasksMap?: Map<string, Task>;
  totalParts?: number;
}

export function OccupancyActualPhases({
  changelog,
  comments,
  developerMap,
  durations,
  gitlabFact,
  showComments,
  showGitlab = true,
  showReestimations,
  showStatuses,
  sprintStartDate,
  taskCreatedAt,
  taskId,
  tasksMap,
  totalParts: totalPartsProp,
}: OccupancyActualPhasesProps) {
  const totalParts = totalPartsProp ?? TOTAL_PARTS;
  const phases = statusDurationsToCells(sprintStartDate, durations, totalParts);
  const reestimationEvents = getReestimationEvents(changelog);
  const gitlabEvents = showGitlab ? selectGitlabEventsForFactTimeline(gitlabFact?.events) : [];
  const visibleReestimations = showReestimations ? reestimationEvents : [];
  const visibleComments = showComments ? comments : [];
  const markerPoints: FactTimelineMarkerPoint[] = [
    ...gitlabEvents.map((batch, idx) => ({
      at: batch.at,
      key: `gitlab:${idx}:${batch.kind}:${batch.at}`,
      source: 'gitlab' as const,
    })),
    ...visibleReestimations.map((ev, idx) => ({
      at: ev.updatedAt,
      key: `reestimation:${idx}:${ev.updatedAt}`,
      source: 'reestimation' as const,
    })),
    ...visibleComments.map((comment) => ({
      at: comment.createdAt,
      key: `comment:${comment.id}`,
      source: 'comment' as const,
    })),
  ];
  const markerLayout = layoutFactTimelineMarkers(markerPoints);
  const hasContent =
    (phases.length > 0 && showStatuses) ||
    visibleReestimations.length > 0 ||
    visibleComments.length > 0 ||
    gitlabEvents.length > 0;
  if (!hasContent) return null;

  const toCell = (d: Date) => dateTimeToFractionalCellInRange(sprintStartDate, d, totalParts);
  const { leftPercent, nowCell, spanCells, timelineStartCell, widthPercent } =
    computeActualPhaseTimelineBounds({ sprintStartDate, taskCreatedAt, totalParts });

  const visiblePhases = phases.filter(
    (p) => p.endCell > timelineStartCell && p.startCell < nowCell
  );

  return (
    <div
      className="absolute pointer-events-none overflow-visible"
      style={{
        left: `calc(${leftPercent}% + ${PHASE_ROW_INSET_PX}px)`,
        top: 0,
        bottom: 0,
        width: `max(0px, calc(${widthPercent}% - ${PHASE_ROW_INSET_PX}px - ${FACT_ROW_RIGHT_INSET_PX}px))`,
      }}
    >
      <div
        className={`absolute inset-0 overflow-visible pointer-events-none ${ZIndex.class('stickyInContent')}`}
        style={{
          left: FACT_TIMELINE_MARKER_INSET_PX,
          right: FACT_TIMELINE_MARKER_INSET_PX,
        }}
      >
        <div className="relative h-full w-full pointer-events-none">
          {visibleReestimations.map((ev, idx) => (
              <OccupancyReestimationMarker
                key={`${taskId}-reest-${idx}-${ev.updatedAt}`}
                developerMap={developerMap}
                ev={ev}
                idx={idx}
                nowCell={nowCell}
                taskId={taskId}
                timelineStartCell={timelineStartCell}
                toCell={toCell}
                topPx={markerLayout.topByKey.get(`reestimation:${idx}:${ev.updatedAt}`) ?? 0}
                totalParts={totalParts}
              />
            ))}
          {visibleComments.map((comment) => (
              <OccupancyIssueCommentIcon
                key={`${taskId}-comment-${comment.id}`}
                comment={comment}
                developerMap={developerMap}
                sprintStartDate={sprintStartDate}
                timelineEndCell={nowCell}
                timelineStartCell={timelineStartCell}
                topPx={
                  (markerLayout.topByKey.get(`comment:${comment.id}`) ?? 0) +
                  (GITLAB_FACT_CHIP_SIZE_PX - 18) / 2
                }
                totalParts={totalParts}
              />
            ))}
          {gitlabEvents.map((batch, idx) => {
            const left = computeGitlabMarkerLeftPercent(
              batch.at,
              sprintStartDate,
              timelineStartCell,
              nowCell,
              totalParts
            );
            if (left == null) return null;
            return (
              <GitlabFactTimelineMarker
                key={`${taskId}-gl-${batch.kind}-${batch.at}-${idx}`}
                batch={batch}
                idx={idx}
                leftPercent={left}
                taskId={taskId}
                topPx={
                  markerLayout.topByKey.get(`gitlab:${idx}:${batch.kind}:${batch.at}`) ?? 0
                }
              />
            );
          })}
        </div>
      </div>
      <div
        className="absolute left-0 right-0 bottom-0 flex min-w-0 items-center"
        style={{ height: OCCUPANCY_FACT_STATUS_BAND_PX, gap: OCCUPANCY_FACT_PHASE_GAP_PX }}
      >
        {showStatuses &&
          renderOccupancyFactStatusFlexNodes({
            changelog,
            developerMap,
            rowHeight: OCCUPANCY_FACT_STATUS_BAND_PX,
            spanCells,
            taskId,
            tasksMap,
            timelineStartCell,
            visiblePhases,
          })}
      </div>
    </div>
  );
}
