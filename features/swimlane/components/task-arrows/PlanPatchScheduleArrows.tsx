'use client';

import type { PlanPatchPositionPreview } from '@/lib/sprints/sprintPlanPatchPositionPreview';

import { observer } from 'mobx-react-lite';
import { useContext } from 'react';
import Xarrow from 'react-xarrows';

import { usePhaseCardColorScheme } from '@/components/PhaseCardColorSchemeContext';
import { ZIndex } from '@/constants';
import { SwimlaneArrowRedrawGenerationContext } from '@/features/swimlane/SwimlaneArrowRedrawContext';
import { planPatchPreviewElementId } from '@/features/swimlane/utils/planPatchPreviewFocus';
import { useDocumentDarkClass } from '@/hooks/useDocumentDarkClass';
import { useRootStore } from '@/lib/layers';

import { TaskArrowLayer } from './TaskArrowLayer';
import {
  resolveNearestAnchorsForElementIds,
  resolveTaskArrowLinkColor,
  resolveTaskLinkArrowBodyProps,
  resolveTaskLinkArrowHeadProps,
  resolveXarrowEndpointsKey,
  TASK_LINK_ARROW_HEAD_SHAPE,
  TASK_LINK_ARROW_HEAD_SIZE,
  TASK_LINK_ARROW_PATH,
} from './taskArrowLinkHelpers';

const FOCUS_ARROW_LIGHT = 'rgb(14 165 233 / 0.8)';
const FOCUS_ARROW_DARK = '#38bdf8';

export function isPlanPatchScheduleLink(
  preview: Pick<PlanPatchPositionPreview, 'changes' | 'remove'>
): boolean {
  return preview.remove !== true && preview.changes.includes('schedule');
}

export function planPatchScheduleArrowColor(focused: boolean, isDark: boolean, idleColor: string): string {
  if (!focused) {
    return idleColor;
  }
  return isDark ? FOCUS_ARROW_DARK : FOCUS_ARROW_LIGHT;
}

export const PlanPatchScheduleArrows = observer(function PlanPatchScheduleArrows({
  clipToAssigneeId = null,
}: {
  clipToAssigneeId?: string | null;
}) {
  const { sprintPlannerUi, taskPositions } = useRootStore();
  const phaseCardColorScheme = usePhaseCardColorScheme();
  const isDark = useDocumentDarkClass();
  const redrawGeneration = useContext(SwimlaneArrowRedrawGenerationContext);
  const focusTaskId = sprintPlannerUi.planPatchFocusTaskId;
  const idleColor = resolveTaskArrowLinkColor({
    canDelete: false,
    fromTask: undefined,
    isHovered: false,
    isRelatedToHoveredTask: false,
    phaseCardColorScheme,
  });
  const links = [...taskPositions.planPatchPreviews.values()].filter(
    (preview) =>
      isPlanPatchScheduleLink(preview) &&
      (clipToAssigneeId == null || preview.assigneeId === clipToAssigneeId)
  );
  if (links.length === 0) {
    return null;
  }
  return (
    <TaskArrowLayer zIndex={ZIndex.contentOverlay}>
      {links.map((preview) => {
        const start = `task-${preview.taskId}`;
        const end = planPatchPreviewElementId(preview.taskId);
        const anchors = resolveNearestAnchorsForElementIds(start, end, redrawGeneration);
        const arrowColor = planPatchScheduleArrowColor(
          focusTaskId === preview.taskId,
          isDark,
          idleColor
        );
        return (
          <Xarrow
            key={`${preview.taskId}:${resolveXarrowEndpointsKey(start, end)}`}
            animateDrawing={false}
            arrowBodyProps={resolveTaskLinkArrowBodyProps()}
            arrowHeadProps={resolveTaskLinkArrowHeadProps(arrowColor)}
            color={arrowColor}
            dashness={{ animation: 0, nonStrokeLen: 6, strokeLen: 8 }}
            end={end}
            endAnchor={anchors.endAnchor}
            gridRadius={0}
            headShape={TASK_LINK_ARROW_HEAD_SHAPE}
            headSize={TASK_LINK_ARROW_HEAD_SIZE}
            path={TASK_LINK_ARROW_PATH}
            start={start}
            startAnchor={anchors.startAnchor}
            strokeWidth={2.5}
          />
        );
      })}
    </TaskArrowLayer>
  );
});
