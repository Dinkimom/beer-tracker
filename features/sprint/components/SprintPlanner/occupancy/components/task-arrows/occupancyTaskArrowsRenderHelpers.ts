import type { TaskPosition } from '@/types';

import { resolveOccupancyArrowEndpoints } from '@/features/sprint/components/SprintPlanner/occupancy/utils/task-arrows/occupancyTaskArrowsHelpers';
import { resolveTaskLinkArrowPaintColor } from '@/features/swimlane/components/task-arrows/taskArrowLinkHelpers';
import { isLinkInHoverConnectedComponent } from '@/features/swimlane/utils/task-arrows/collectTimelinePredecessorTaskIds';
import { TASK_ARROWS_DEV_QA_LINK_PREFIX } from '@/features/swimlane/utils/task-arrows/taskArrowsHelpers';
import { getPhaseLinkArrowDefaultHex } from '@/utils/statusColors';

export function resolveOccupancyTaskArrowVisualState(input: {
  fromTaskOriginalStatus?: string;
  fromTaskStatusColorKey?: string;
  isDevQALink: boolean;
  isHovered: boolean;
  isRelatedToHoveredPhase: boolean;
  linkingFromTaskId: string | null;
  onDeleteLink?: (linkId: string) => void;
  phaseCardColorScheme: Parameters<typeof getPhaseLinkArrowDefaultHex>[0];
}): {
  arrowColor: string;
  arrowPointerEventsEnabled: boolean;
  baseColor: string;
  canDelete: boolean;
} {
  const {
    linkingFromTaskId,
    isHovered,
    onDeleteLink,
    isDevQALink,
    phaseCardColorScheme,
    fromTaskOriginalStatus,
    fromTaskStatusColorKey,
    isRelatedToHoveredPhase,
  } = input;
  const canDelete = Boolean(onDeleteLink && !isDevQALink);
  const arrowPointerEventsEnabled = linkingFromTaskId == null;
  const baseColor =
    arrowPointerEventsEnabled && isHovered && canDelete
      ? '#ef4444'
      : getPhaseLinkArrowDefaultHex(
          phaseCardColorScheme,
          fromTaskOriginalStatus,
          fromTaskStatusColorKey
        );
  const emphasized = isHovered || isRelatedToHoveredPhase;
  return {
    canDelete,
    arrowPointerEventsEnabled,
    baseColor,
    arrowColor: resolveTaskLinkArrowPaintColor(baseColor, emphasized),
  };
}

export function isOccupancyArrowRelatedToHoveredPhase(
  linkingFromTaskId: string | null,
  hoveredPhaseTaskId: string | null,
  fromTaskId: string,
  toTaskId: string,
  hoverConnectedTaskIds: Set<string> | null = null
): boolean {
  if (linkingFromTaskId != null) return false;
  return isLinkInHoverConnectedComponent(hoverConnectedTaskIds, hoveredPhaseTaskId, {
    fromTaskId,
    toTaskId,
  });
}

export function resolveOccupancyTaskArrowEndpoints(
  link: { fromTaskId: string; toTaskId: string; id: string },
  isDevQALink: boolean,
  taskIdsOrder: string[],
  taskPositions: Map<string, TaskPosition>,
  getRowTaskIds: (taskId: string) => string[]
) {
  return resolveOccupancyArrowEndpoints(link, isDevQALink, taskIdsOrder, taskPositions, getRowTaskIds);
}

export function occupancyArrowEndpointsAreOnBoard(
  endpoints: { arrowEndTaskId: string; arrowStartTaskId: string },
  taskPositions: Map<string, TaskPosition>
): boolean {
  return (
    taskPositions.has(endpoints.arrowStartTaskId) && taskPositions.has(endpoints.arrowEndTaskId)
  );
}

export function isOccupancyDevQaLink(linkId: string): boolean {
  return linkId.startsWith(TASK_ARROWS_DEV_QA_LINK_PREFIX);
}
