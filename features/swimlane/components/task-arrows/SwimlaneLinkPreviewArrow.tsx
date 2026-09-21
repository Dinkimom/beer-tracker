'use client';

import { useContext } from 'react';
import Xarrow, { useXarrow } from 'react-xarrows';

import { ZIndex } from '@/constants';
import { SwimlaneArrowRedrawGenerationContext } from '@/features/swimlane/SwimlaneArrowRedrawContext';
import { SWIMLANE_LINK_PREVIEW_CURSOR_ID } from '@/features/swimlane/utils/swimlaneLinkingHelpers';

import { TaskArrowLayer } from './TaskArrowLayer';
import {
  resolveNearestAnchorsForElementIds,
  resolveTaskArrowNearestAnchors,
  resolveTaskLinkArrowHeadProps,
  TASK_LINK_ARROW_HEAD_SHAPE,
  TASK_LINK_ARROW_HEAD_SIZE,
  TASK_LINK_ARROW_PATH,
} from './taskArrowLinkHelpers';

interface SwimlaneLinkPreviewArrowProps {
  cursorPos: { x: number; y: number } | null;
  linkingFromTaskId: string;
  previewTargetId: string | null;
}

const PREVIEW_COLOR = '#60a5fa';

export function SwimlaneLinkPreviewArrow({
  cursorPos,
  linkingFromTaskId,
  previewTargetId,
}: SwimlaneLinkPreviewArrowProps) {
  useXarrow();
  const redrawGeneration = useContext(SwimlaneArrowRedrawGenerationContext);
  const snapped = previewTargetId != null;
  if (!snapped && cursorPos == null) return null;

  const endId = snapped ? `task-${previewTargetId}` : SWIMLANE_LINK_PREVIEW_CURSOR_ID;
  const anchors = snapped
    ? resolveTaskArrowNearestAnchors(linkingFromTaskId, previewTargetId, redrawGeneration)
    : resolveNearestAnchorsForElementIds(
        `task-${linkingFromTaskId}`,
        SWIMLANE_LINK_PREVIEW_CURSOR_ID,
        redrawGeneration
      );

  return (
    <>
      {cursorPos != null && !snapped ? (
        <div
          className="pointer-events-none fixed h-px w-px"
          id={SWIMLANE_LINK_PREVIEW_CURSOR_ID}
          style={{ left: cursorPos.x, top: cursorPos.y }}
        />
      ) : null}
      <TaskArrowLayer zIndex={ZIndex.arrowsHovered}>
        <Xarrow
          animateDrawing={false}
          arrowHeadProps={resolveTaskLinkArrowHeadProps(PREVIEW_COLOR)}
          color={PREVIEW_COLOR}
          dashness={{ animation: 0, nonStrokeLen: 6, strokeLen: 8 }}
          end={endId}
          endAnchor={anchors.endAnchor}
          gridRadius={0}
          headShape={TASK_LINK_ARROW_HEAD_SHAPE}
          headSize={TASK_LINK_ARROW_HEAD_SIZE}
          passProps={{ pointerEvents: 'none' }}
          path={TASK_LINK_ARROW_PATH}
          start={`task-${linkingFromTaskId}`}
          startAnchor={anchors.startAnchor}
          strokeWidth={2}
        />
      </TaskArrowLayer>
    </>
  );
}
