'use client';

import type { SwimlaneInProgressFactSegment } from '@/features/swimlane/utils/mergeInProgressDurationsForAssignee';
import type { StatusPhaseCell } from '@/lib/planner-timeline';
import type { Developer, Task } from '@/types';
import type { ChangelogEntry, IssueComment } from '@/types/tracker';

import { useMemo } from 'react';

import { TextTooltip } from '@/components/TextTooltip';
import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import { FLOATING_TOOLTIP_GLASS_SHELL } from '@/features/context-menu/contextMenuClasses';
import { SWIMLANE_FACT_MIN_GAP_PX } from '@/features/swimlane/utils/in-progress-fact/swimlaneInProgressFactLayerConstants';
import { mergeIssueDataForSwimlaneFactTooltip } from '@/features/swimlane/utils/mergeInProgressDurationsForAssignee';
import { getStatusColors } from '@/utils/statusColors';

import {
  factSegmentPointerHoverHandlers,
  factStatusSurfaceClass,
  resolveFactMarkerHoverState,
} from './swimlaneFactMarkerHelpers';
import { swimlaneFactMarkerOpacityClass } from './swimlaneFactMarkerOpacityClass';
import { SwimlaneFactPhaseTooltip } from './SwimlaneFactPhaseTooltip';
import { formatFactTimelineDuration } from './SwimlaneFactPhaseTooltipHelpers';

export function SwimlaneFactFlexPhaseBar({
  assigneeRole,
  changelogsByTaskId,
  commentsByTaskId,
  developerMap,
  hideTaskSummary,
  isNowEdge,
  laneRowHeight,
  layerId,
  onFactSegmentHover,
  phase,
  seg,
  shapeClassName,
  tasksMap,
  widthInSpan,
  factHoveredTaskId = null,
}: {
  assigneeRole: Developer['role'];
  changelogsByTaskId: Map<string, ChangelogEntry[]>;
  commentsByTaskId: Map<string, IssueComment[]>;
  developerMap: Map<string, Developer>;
  hideTaskSummary: boolean;
  /** Фаза идёт сейчас: справа без скругления, длинное затухание — «ещё в процессе» */
  isNowEdge: boolean;
  laneRowHeight: number;
  layerId: string;
  onFactSegmentHover?: (taskId: string | null) => void;
  phase: StatusPhaseCell;
  seg: SwimlaneInProgressFactSegment;
  /** Скругления и отступ слева по месту фазы в колбасе задачи */
  shapeClassName: string;
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

  const { t } = useI18n();
  const surfaceClass = factStatusSurfaceClass(getStatusColors(phase.statusKey));

  const verticalInset = 3;
  const barHeight = Math.max(SWIMLANE_FACT_MIN_GAP_PX, laneRowHeight - verticalInset * 2);
  const durationStr = formatFactTimelineDuration(phase.durationMs, t);
  const statusName = phase.statusName.trim() || phase.statusKey;

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
      contentClassName={FLOATING_TOOLTIP_GLASS_SHELL}
      delayDuration={200}
      side="bottom"
      singleInGroupId={statusTooltipId}
    >
      <div
        className={`@container flex shrink-0 items-center overflow-hidden pointer-events-auto cursor-pointer box-border ${surfaceClass} ${shapeClassName} ${isNowEdge ? 'rounded-r-none border-r-0 [mask-image:linear-gradient(to_right,black_calc(100%-20px),rgb(0_0_0/0.8)_calc(100%-8px),transparent)]' : ''} ${swimlaneFactMarkerOpacityClass(isFactHovered, isDimmedByFactHover)}`}
        style={{
          flex: `${widthInSpan} 0 0`,
          minWidth: SWIMLANE_FACT_MIN_GAP_PX,
          height: barHeight,
          zIndex: ZIndex.contentOverlay,
        }}
        onPointerEnter={pointerHoverHandlers.onPointerEnter}
        onPointerLeave={pointerHoverHandlers.onPointerLeave}
      >
        <span className="hidden @min-[36px]:block min-w-0 truncate px-2 text-[10px] font-medium leading-[14px] tabular-nums">
          <span className="hidden @min-[112px]:inline">{statusName} · </span>
          {durationStr}
        </span>
      </div>
    </TextTooltip>
  );
}
