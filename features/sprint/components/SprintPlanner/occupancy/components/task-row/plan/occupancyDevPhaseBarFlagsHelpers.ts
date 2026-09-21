import type { OccupancyPlanPhaseBarsProps } from './occupancyPlanPhaseBars.types';

export function computeDevPhaseBarHoverFlags(input: {
  hoverConnectedPhaseIds: OccupancyPlanPhaseBarsProps['hoverConnectedPhaseIds'];
  linkingFromTaskId: OccupancyPlanPhaseBarsProps['linkingFromTaskId'];
  taskId: string;
}) {
  return {
    isDimmedByLinkHover:
      input.linkingFromTaskId == null &&
      input.hoverConnectedPhaseIds != null &&
      input.hoverConnectedPhaseIds.size > 1 &&
      !input.hoverConnectedPhaseIds.has(input.taskId),
    isInHoveredConnectionGroup:
      input.linkingFromTaskId == null &&
      input.hoverConnectedPhaseIds != null &&
      input.hoverConnectedPhaseIds.has(input.taskId),
  };
}

export function computeDevPhaseBarLinkFlags(input: {
  linkAlreadyExistsFromSource: boolean;
  linkingFromTaskId: OccupancyPlanPhaseBarsProps['linkingFromTaskId'];
  taskId: string;
  validTargetByTime: boolean;
}) {
  return {
    isLinkSource: input.linkingFromTaskId === input.taskId,
    isLinkTarget:
      input.linkingFromTaskId != null &&
      input.linkingFromTaskId !== input.taskId &&
      !input.linkAlreadyExistsFromSource &&
      input.validTargetByTime,
  };
}
