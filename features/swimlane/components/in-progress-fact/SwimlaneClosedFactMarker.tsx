'use client';

import type { SwimlaneInProgressFactSegment } from '@/features/swimlane/utils/mergeInProgressDurationsForAssignee';
import type { StatusPhaseCell } from '@/lib/planner-timeline';
import type { Developer, Task } from '@/types';
import type { ChangelogEntry, IssueComment } from '@/types/tracker';

import { useMemo } from 'react';

import { Icon } from '@/components/Icon';
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

export function SwimlaneClosedFactMarker({
  assigneeRole,
  changelogsByTaskId,
  commentsByTaskId,
  developerMap,
  hideTaskSummary,
  laneRowHeight,
  layerId,
  onFactSegmentHover,
  phase,
  seg,
  shapeClassName,
  tasksMap,
  factHoveredTaskId = null,
}: {
  assigneeRole: Developer['role'];
  changelogsByTaskId: Map<string, ChangelogEntry[]>;
  commentsByTaskId: Map<string, IssueComment[]>;
  developerMap: Map<string, Developer>;
  hideTaskSummary: boolean;
  laneRowHeight: number;
  layerId: string;
  onFactSegmentHover?: (taskId: string | null) => void;
  phase: StatusPhaseCell;
  seg: SwimlaneInProgressFactSegment;
  /** Скругления и отступ слева по месту маркера в колбасе задачи */
  shapeClassName: string;
  tasksMap: Map<string, Task>;
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
  const statusColors = getStatusColors(phase.statusKey);
  const verticalInset = 3;
  const markerSize = Math.max(SWIMLANE_FACT_MIN_GAP_PX, laneRowHeight - verticalInset * 2);
  const surfaceClass = factStatusSurfaceClass(statusColors);
  const statusTooltipId = `${layerId}-closed-${seg.taskId}-${phase.startCell}-${phase.endCell}`;
  const { isDimmedByFactHover, isFactHovered } = resolveFactMarkerHoverState(
    factHoveredTaskId,
    seg.taskId
  );
  const pointerHoverHandlers = factSegmentPointerHoverHandlers(onFactSegmentHover, seg.taskId);

  return (
    <div
      className={`pointer-events-none flex shrink-0 items-center justify-center self-center overflow-hidden ${shapeClassName}`}
      style={{ width: markerSize, zIndex: ZIndex.contentOverlay }}
    >
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
          aria-label={t('sprintPlanner.swimlane.factTimeline.closedAria', {
            status: phase.statusKey,
          })}
          className={`pointer-events-auto flex shrink-0 items-center justify-center overflow-hidden cursor-pointer box-border rounded-full ${surfaceClass} ${swimlaneFactMarkerOpacityClass(isFactHovered, isDimmedByFactHover)}`}
          role="img"
          style={{
            width: markerSize,
            height: markerSize,
          }}
          onPointerEnter={pointerHoverHandlers.onPointerEnter}
          onPointerLeave={pointerHoverHandlers.onPointerLeave}
        >
          <Icon
            className={`h-2.5 w-2.5 shrink-0 ${statusColors.text} ${statusColors.textDark ?? ''}`}
            name="check"
          />
        </div>
      </TextTooltip>
    </div>
  );
}
