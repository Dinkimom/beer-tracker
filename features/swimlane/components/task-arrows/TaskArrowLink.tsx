'use client';

import type { PlanningPhaseCardColorScheme } from '@/hooks/useLocalStorage';
import type { Task, TaskLink, TaskPosition } from '@/types';

import { useContext } from 'react';
import Xarrow from 'react-xarrows';

import { SwimlaneArrowRedrawGenerationContext } from '@/features/swimlane/SwimlaneArrowRedrawContext';
import { resolveLinkArrowDrawTaskIds } from '@/utils/linkAnchors';

import {
  isDevQaTaskArrowLink,
  isTaskArrowLinkRelatedToHoveredTask,
  resolveTaskArrowLinkColor,
  resolveTaskArrowNearestAnchors,
  resolveTaskLinkArrowBodyProps,
  resolveTaskLinkArrowHeadProps,
  TASK_LINK_ARROW_HEAD_SHAPE,
  TASK_LINK_ARROW_HEAD_SIZE,
  TASK_LINK_ARROW_PATH,
} from './taskArrowLinkHelpers';

interface TaskArrowLinkProps {
  arrowPointerEventsEnabled: boolean;
  hoverConnectedTaskIds: Set<string> | null;
  hoveredLinkId: string | null;
  hoveredTaskIdForArrows: string | null;
  link: TaskLink;
  phaseCardColorScheme: PlanningPhaseCardColorScheme;
  taskPositions: Map<string, TaskPosition> | undefined;
  tasksMap: Map<string, Task>;
  onDeleteLink?: (linkId: string) => void;
  onHoveredLinkIdChange: (id: string | null) => void;
}

export function TaskArrowLink({
  arrowPointerEventsEnabled,
  hoverConnectedTaskIds,
  hoveredLinkId,
  hoveredTaskIdForArrows,
  link,
  onDeleteLink,
  onHoveredLinkIdChange,
  phaseCardColorScheme,
  taskPositions,
  tasksMap,
}: TaskArrowLinkProps) {
  const redrawGeneration = useContext(SwimlaneArrowRedrawGenerationContext);
  const isHovered = hoveredLinkId === link.id;
  const isRelatedToHoveredTask = isTaskArrowLinkRelatedToHoveredTask(
    hoveredTaskIdForArrows,
    link,
    hoverConnectedTaskIds
  );
  const fromTask = tasksMap.get(link.fromTaskId);
  const isDevQaLink = isDevQaTaskArrowLink(link.id);
  const canDelete = Boolean(onDeleteLink) && !isDevQaLink;

  const arrowColor = resolveTaskArrowLinkColor({
    canDelete,
    fromTask,
    isHovered,
    isRelatedToHoveredTask,
    phaseCardColorScheme,
  });

  const { startTaskId, endTaskId } = resolveLinkArrowDrawTaskIds(
    link.fromTaskId,
    link.toTaskId,
    taskPositions,
    isDevQaLink
  );

  const { startAnchor, endAnchor } = resolveTaskArrowNearestAnchors(
    startTaskId,
    endTaskId,
    redrawGeneration
  );

  return (
    <div
      className={arrowPointerEventsEnabled ? 'pointer-events-auto' : 'pointer-events-none'}
      style={{
        cursor:
          arrowPointerEventsEnabled && canDelete && isHovered ? 'pointer' : 'default',
      }}
      onClick={() => {
        if (arrowPointerEventsEnabled && canDelete && isHovered && onDeleteLink) {
          onDeleteLink(link.id);
        }
      }}
      onMouseEnter={() =>
        arrowPointerEventsEnabled && canDelete && onHoveredLinkIdChange(link.id)
      }
      onMouseLeave={() => arrowPointerEventsEnabled && onHoveredLinkIdChange(null)}
    >
      <Xarrow
        animateDrawing={false}
        arrowBodyProps={resolveTaskLinkArrowBodyProps()}
        arrowHeadProps={resolveTaskLinkArrowHeadProps(arrowColor)}
        color={arrowColor}
        dashness={false}
        end={`task-${endTaskId}`}
        endAnchor={endAnchor}
        gridRadius={0}
        headShape={TASK_LINK_ARROW_HEAD_SHAPE}
        headSize={TASK_LINK_ARROW_HEAD_SIZE}
        path={TASK_LINK_ARROW_PATH}
        start={`task-${startTaskId}`}
        startAnchor={startAnchor}
        strokeWidth={2.5}
      />
    </div>
  );
}
