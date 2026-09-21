'use client';

import type { Task, TaskPosition } from '@/types';

import { useContext } from 'react';
import Xarrow from 'react-xarrows';

import {
  resolveNearestAnchorsForElementIds,
  resolveTaskLinkArrowBodyProps,
  resolveTaskLinkArrowHeadProps,
  TASK_LINK_ARROW_HEAD_SHAPE,
  TASK_LINK_ARROW_HEAD_SIZE,
  TASK_LINK_ARROW_PATH,
} from '@/features/swimlane/components/task-arrows/taskArrowLinkHelpers';

import { OccupancyArrowRedrawGenerationContext } from '../../OccupancyArrowRedrawContext';

import {
  isOccupancyArrowRelatedToHoveredPhase,
  isOccupancyDevQaLink,
  occupancyArrowEndpointsAreOnBoard,
  resolveOccupancyTaskArrowEndpoints,
  resolveOccupancyTaskArrowVisualState,
} from './occupancyTaskArrowsRenderHelpers';

interface OccupancyTaskLinkArrowProps {
  effectiveHoveredLinkId: string | null;
  hoverConnectedTaskIds: Set<string> | null;
  hoveredPhaseTaskId: string | null;
  link: { fromTaskId: string; toTaskId: string; id: string };
  linkingFromTaskId: string | null;
  phaseCardColorScheme: Parameters<typeof resolveOccupancyTaskArrowVisualState>[0]['phaseCardColorScheme'];
  taskIdsOrder: string[];
  taskPositions: Map<string, TaskPosition>;
  tasksMap: Map<string, Task>;
  visibleTaskIds: Set<string> | null;
  getRowTaskIds: (taskId: string) => string[];
  onDeleteLink?: (linkId: string) => void;
  setHoveredLinkId: (linkId: string | null) => void;
}

export function OccupancyTaskLinkArrow({
  link,
  tasksMap,
  effectiveHoveredLinkId,
  linkingFromTaskId,
  hoverConnectedTaskIds,
  hoveredPhaseTaskId,
  phaseCardColorScheme,
  onDeleteLink,
  setHoveredLinkId,
  taskIdsOrder,
  taskPositions,
  getRowTaskIds,
  visibleTaskIds,
}: OccupancyTaskLinkArrowProps) {
  const redrawGeneration = useContext(OccupancyArrowRedrawGenerationContext);
  const fromTask = tasksMap.get(link.fromTaskId);
  const isDevQALink = isOccupancyDevQaLink(link.id);
  const isHovered = effectiveHoveredLinkId === link.id;
  const isRelatedToHoveredPhase = isOccupancyArrowRelatedToHoveredPhase(
    linkingFromTaskId,
    hoveredPhaseTaskId,
    link.fromTaskId,
    link.toTaskId,
    hoverConnectedTaskIds
  );
  const visual = resolveOccupancyTaskArrowVisualState({
    linkingFromTaskId,
    isHovered,
    onDeleteLink,
    isDevQALink,
    phaseCardColorScheme,
    fromTaskOriginalStatus: fromTask?.originalStatus,
    fromTaskStatusColorKey: fromTask?.statusColorKey,
    isRelatedToHoveredPhase,
  });

  const endpoints = resolveOccupancyTaskArrowEndpoints(
    link,
    isDevQALink,
    taskIdsOrder,
    taskPositions,
    getRowTaskIds
  );

  const bothEndsVisible =
    visibleTaskIds == null ||
    (visibleTaskIds.has(endpoints.arrowStartTaskId) &&
      visibleTaskIds.has(endpoints.arrowEndTaskId));
  if (!bothEndsVisible || !occupancyArrowEndpointsAreOnBoard(endpoints, taskPositions)) {
    return null;
  }

  const { startAnchor, endAnchor } = resolveNearestAnchorsForElementIds(
    endpoints.startElement,
    endpoints.endElement,
    redrawGeneration
  );

  return (
    <div
      className={visual.arrowPointerEventsEnabled ? 'pointer-events-auto' : 'pointer-events-none'}
      style={{
        cursor:
          visual.arrowPointerEventsEnabled && visual.canDelete && isHovered ? 'pointer' : 'default',
      }}
      onClick={() =>
        visual.arrowPointerEventsEnabled && visual.canDelete && isHovered && onDeleteLink?.(link.id)
      }
      onMouseEnter={() =>
        visual.arrowPointerEventsEnabled && visual.canDelete && setHoveredLinkId(link.id)
      }
      onMouseLeave={() => visual.arrowPointerEventsEnabled && setHoveredLinkId(null)}
    >
      <Xarrow
        animateDrawing={false}
        arrowBodyProps={resolveTaskLinkArrowBodyProps()}
        arrowHeadProps={resolveTaskLinkArrowHeadProps(visual.arrowColor)}
        color={visual.arrowColor}
        dashness={false}
        end={endpoints.endElement}
        endAnchor={endAnchor}
        gridRadius={0}
        headShape={TASK_LINK_ARROW_HEAD_SHAPE}
        headSize={TASK_LINK_ARROW_HEAD_SIZE}
        path={TASK_LINK_ARROW_PATH}
        start={endpoints.startElement}
        startAnchor={startAnchor}
        strokeWidth={2.5}
      />
    </div>
  );
}
