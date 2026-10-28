'use client';

import type { TaskPosition } from '@/types';

import { useContext } from 'react';
import Xarrow, { useXarrow } from 'react-xarrows';

import { ZIndex } from '@/constants';
import { SwimlaneArrowRedrawGenerationContext } from '@/features/swimlane/SwimlaneArrowRedrawContext';
import { SWIMLANE_LINK_PREVIEW_CURSOR_ID } from '@/features/swimlane/utils/swimlaneLinkingHelpers';
import { resolveLinkArrowDrawTaskIds } from '@/utils/linkAnchors';

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
  taskPositions: Map<string, TaskPosition> | undefined;
}

const PREVIEW_COLOR = '#60a5fa';

export function SwimlaneLinkPreviewArrow({
  cursorPos,
  linkingFromTaskId,
  previewTargetId,
  taskPositions,
}: SwimlaneLinkPreviewArrowProps) {
  useXarrow();
  const redrawGeneration = useContext(SwimlaneArrowRedrawGenerationContext);
  const snapped = previewTargetId != null;
  if (!snapped && cursorPos == null) return null;

  const sourceId = `task-${linkingFromTaskId}`;
  let startId = sourceId;
  let endId = SWIMLANE_LINK_PREVIEW_CURSOR_ID;
  let anchors;
  // Тянуть можно в любую сторону, а наконечник — как у сохранённой связи: в более позднюю точку.
  if (snapped) {
    const { endTaskId, startTaskId } = resolveLinkArrowDrawTaskIds(
      linkingFromTaskId,
      previewTargetId,
      taskPositions
    );
    startId = `task-${startTaskId}`;
    endId = `task-${endTaskId}`;
    anchors = resolveTaskArrowNearestAnchors(startTaskId, endTaskId, redrawGeneration);
  } else {
    const sourceLeft = document.getElementById(sourceId)?.getBoundingClientRect().left;
    if (cursorPos != null && sourceLeft != null && cursorPos.x < sourceLeft) {
      startId = SWIMLANE_LINK_PREVIEW_CURSOR_ID;
      endId = sourceId;
    }
    anchors = resolveNearestAnchorsForElementIds(startId, endId, redrawGeneration);
  }

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
          start={startId}
          startAnchor={anchors.startAnchor}
          strokeWidth={2}
        />
      </TaskArrowLayer>
    </>
  );
}
