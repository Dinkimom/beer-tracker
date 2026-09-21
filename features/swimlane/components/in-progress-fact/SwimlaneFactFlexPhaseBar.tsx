'use client';

import type { SwimlaneInProgressFactSegment } from '@/features/swimlane/utils/mergeInProgressDurationsForAssignee';
import type { Developer, Task } from '@/types';
import type { ChangelogEntry, IssueComment } from '@/types/tracker';

import { useMemo } from 'react';

import { TextTooltip } from '@/components/TextTooltip';
import { ZIndex } from '@/constants';
import {
  SWIMLANE_FACT_MIN_GAP_PX,
  SWIMLANE_FACT_THREE_HOURS_MS,
  SWIMLANE_FACT_VERY_SHORT_PHASE_MS,
} from '@/features/swimlane/utils/in-progress-fact/swimlaneInProgressFactLayerConstants';
import { mergeIssueDataForSwimlaneFactTooltip } from '@/features/swimlane/utils/mergeInProgressDurationsForAssignee';
import { type StatusPhaseCell, formatDuration } from '@/lib/planner-timeline';
import { getStatusColors } from '@/utils/statusColors';

import {
  combineStatusBgClass,
  combineStatusBorderClass,
  factSegmentPointerHoverHandlers,
  resolveFactMarkerHoverState,
} from './swimlaneFactMarkerHelpers';
import { swimlaneFactMarkerOpacityClass } from './swimlaneFactMarkerOpacityClass';
import { SwimlaneFactPhaseTooltip } from './SwimlaneFactPhaseTooltip';

export function SwimlaneFactFlexPhaseBar({
  assigneeRole,
  barDomId,
  changelogsByTaskId,
  commentsByTaskId,
  developerMap,
  hideTaskSummary,
  laneRowHeight,
  layerId,
  onFactSegmentHover,
  phase,
  seg,
  tasksMap,
  widthInSpan,
  factHoveredTaskId = null,
}: {
  assigneeRole: Developer['role'];
  barDomId: string;
  changelogsByTaskId: Map<string, ChangelogEntry[]>;
  commentsByTaskId: Map<string, IssueComment[]>;
  developerMap: Map<string, Developer>;
  hideTaskSummary: boolean;
  laneRowHeight: number;
  layerId: string;
  onFactSegmentHover?: (taskId: string | null) => void;
  phase: StatusPhaseCell;
  seg: SwimlaneInProgressFactSegment;
  tasksMap: Map<string, Task>;
  widthInSpan: number;
  factHoveredTaskId?: string | null;
}) {
  const { changelog, comments: issueComments } = useMemo(
    () =>
      mergeIssueDataForSwimlaneFactTooltip(
        seg.taskId,
        assigneeRole,
        tasksMap,
        changelogsByTaskId,
        commentsByTaskId
      ),
    [assigneeRole, changelogsByTaskId, commentsByTaskId, seg.taskId, tasksMap]
  );

  const statusColors = getStatusColors(phase.statusKey);
  const bgClass = combineStatusBgClass(statusColors);
  const borderClass = combineStatusBorderClass(statusColors);

  const verticalInset = 1;
  const barHeight = Math.max(SWIMLANE_FACT_MIN_GAP_PX, laneRowHeight - verticalInset * 2);
  const isVeryShort = phase.durationMs <= SWIMLANE_FACT_VERY_SHORT_PHASE_MS;
  const minBarWidth = isVeryShort ? SWIMLANE_FACT_MIN_GAP_PX : 2;
  const showText = phase.durationMs >= SWIMLANE_FACT_THREE_HOURS_MS;
  const durationStr = formatDuration(phase.durationMs);

  const statusTooltipId = `${layerId}-${seg.taskId}-${phase.startCell}-${phase.endCell}`;
  const { isDimmedByFactHover, isFactHovered } = resolveFactMarkerHoverState(
    factHoveredTaskId,
    seg.taskId
  );
  const pointerHoverHandlers = factSegmentPointerHoverHandlers(onFactSegmentHover, seg.taskId);

  return (
    <TextTooltip
      content={
        <SwimlaneFactPhaseTooltip
          changelog={changelog}
          developerMap={developerMap}
          factualEndTimeMs={seg.endTimeMs}
          hideTaskSummary={hideTaskSummary}
          issueComments={issueComments}
          phase={phase}
          taskId={seg.taskId}
          tasksMap={tasksMap}
        />
      }
      contentClassName="!bg-white dark:!bg-gray-800 !text-gray-900 dark:!text-gray-100 !p-0 !shadow-xl !border !border-gray-200 dark:!border-gray-700 !rounded-lg"
      delayDuration={200}
      side="bottom"
      singleInGroupId={statusTooltipId}
    >
      <div
        className={`flex shrink-0 items-center justify-center rounded-md overflow-hidden border-2 pointer-events-auto cursor-pointer box-border ${bgClass} ${borderClass} ${swimlaneFactMarkerOpacityClass(isFactHovered, isDimmedByFactHover)}`}
        id={barDomId}
        style={{
          flex: `${widthInSpan} 0 0`,
          minWidth: minBarWidth,
          height: barHeight,
          zIndex: ZIndex.contentOverlay,
        }}
        onPointerEnter={pointerHoverHandlers.onPointerEnter}
        onPointerLeave={pointerHoverHandlers.onPointerLeave}
      >
        {showText && (
          <span
            className={`text-[9px] font-medium px-1 truncate max-w-full text-center leading-tight ${statusColors.text} ${statusColors.textDark ?? ''}`}
          >
            {durationStr}
          </span>
        )}
      </div>
    </TextTooltip>
  );
}
