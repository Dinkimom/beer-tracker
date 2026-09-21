import type { OccupancyPlanPhaseBarsProps } from './occupancyPlanPhaseBars.types';
import type { TaskPosition } from '@/types';

import { PARTS_PER_DAY } from '@/constants';
import { mergeAdjacentSegments, withMergedPlanSegments } from '@/features/sprint/utils/occupancyUtils';
import { getTeamTagClasses } from '@/utils/teamColors';

function computeQaSegmentHoverFlags(input: {
  hoverConnectedPhaseIds: OccupancyPlanPhaseBarsProps['hoverConnectedPhaseIds'];
  linkingFromTaskId: OccupancyPlanPhaseBarsProps['linkingFromTaskId'];
  qaTaskId: string;
}) {
  return {
    isDimmedByLinkHover:
      input.linkingFromTaskId == null &&
      input.hoverConnectedPhaseIds != null &&
      input.hoverConnectedPhaseIds.size > 1 &&
      !input.hoverConnectedPhaseIds.has(input.qaTaskId),
    isInHoveredConnectionGroup:
      input.linkingFromTaskId == null &&
      input.hoverConnectedPhaseIds != null &&
      input.hoverConnectedPhaseIds.has(input.qaTaskId),
  };
}

function sortQaPhaseSegments<T extends { startDay: number; startPart: number }>(
  segments: T[]
): T[] {
  return [...segments].sort(
    (a, b) =>
      a.startDay * PARTS_PER_DAY + a.startPart - (b.startDay * PARTS_PER_DAY + b.startPart)
  );
}

export function shouldRenderQaSegmentEditor(props: OccupancyPlanPhaseBarsProps): boolean {
  return (
    props.qaTask != null &&
    props.segmentEditTaskId === props.qaTask.id &&
    props.onSegmentEditSave != null &&
    props.onSegmentEditCancel != null
  );
}

export function resolveQaPhaseSegmentsSorted(position: TaskPosition) {
  if (!position.segments || position.segments.length === 0) return null;
  return sortQaPhaseSegments(position.segments);
}

function buildQaSegmentLinkFlags(input: {
  idx: number;
  isFirst: boolean;
  linkingFromTaskId: string | null | undefined;
  linkAlreadyExistsFromSource: boolean | undefined;
  qaTaskId: string;
  validTargetByTime: boolean | undefined;
}) {
  return {
    disableDragAndResize: input.linkingFromTaskId != null,
    hideLinkRing: input.linkingFromTaskId != null || input.idx > 0,
    isLinkSource: input.isFirst && input.linkingFromTaskId === input.qaTaskId,
    isLinkTarget:
      input.isFirst &&
      input.linkingFromTaskId != null &&
      input.linkingFromTaskId !== input.qaTaskId &&
      !input.linkAlreadyExistsFromSource &&
      input.validTargetByTime,
  };
}

export function buildQaSegmentPhaseBarFlags(input: {
  idx: number;
  props: OccupancyPlanPhaseBarsProps;
  qaTaskId: string;
}) {
  const { hoverConnectedPhaseIds, linkingFromTaskId, occupancyErrorTaskIds, overlappingTaskIds, positionPreviews, quarterlyPhaseStyle, task, timelineSettings, validTargetByTime, linkAlreadyExistsFromSource } = input.props;
  const isFirst = input.idx === 0;
  const linkFlags = buildQaSegmentLinkFlags({
    idx: input.idx,
    isFirst,
    linkingFromTaskId,
    linkAlreadyExistsFromSource,
    qaTaskId: input.qaTaskId,
    validTargetByTime,
  });

  return {
    ...linkFlags,
    errorTooltip: quarterlyPhaseStyle ? undefined : input.props.getErrorTooltip(input.qaTaskId),
    isBlurredBySiblingDrag:
      (timelineSettings.showFreeSlotPreview ?? true) && positionPreviews.has(task.id),
    ...computeQaSegmentHoverFlags({ hoverConnectedPhaseIds, linkingFromTaskId, qaTaskId: input.qaTaskId }),
    isInError: quarterlyPhaseStyle ? false : occupancyErrorTaskIds.has(input.qaTaskId),
    isOverlapping: overlappingTaskIds?.has(input.qaTaskId) ?? false,
    isFirst,
    badgeClass: getTeamTagClasses('QA'),
  };
}

export function buildQaSegmentPosition(
  qaPosition: TaskPosition,
  seg: { startDay: number; startPart: number; duration: number },
  displayAsWeeks: boolean,
  toWeekPosition: OccupancyPlanPhaseBarsProps['toWeekPosition']
) {
  const slice = { ...qaPosition, startDay: seg.startDay, startPart: seg.startPart, duration: seg.duration };
  return displayAsWeeks ? toWeekPosition(slice) : slice;
}

export function buildQaSegmentSaveHandler(input: {
  displayAsWeeks: boolean;
  fromWeekPosition: OccupancyPlanPhaseBarsProps['fromWeekPosition'];
  onPositionSave: OccupancyPlanPhaseBarsProps['onPositionSave'];
  qaPosition: TaskPosition;
  qaTaskOriginalId: string | undefined;
  seg: { startDay: number; startPart: number; duration: number };
}) {
  return (p: TaskPosition) => {
    const dayP = input.displayAsWeeks ? input.fromWeekPosition(p) : p;
    const newSegments = [...input.qaPosition.segments!];
    const origIdx = input.qaPosition.segments!.findIndex(
      (s) =>
        s.startDay === input.seg.startDay &&
        s.startPart === input.seg.startPart &&
        s.duration === input.seg.duration
    );
    if (origIdx !== -1) {
      newSegments[origIdx] = {
        startDay: dayP.startDay,
        startPart: dayP.startPart,
        duration: dayP.duration,
      };
    }
    const merged = mergeAdjacentSegments(newSegments);
    input.onPositionSave?.(
      withMergedPlanSegments(input.qaPosition, merged),
      true,
      input.qaTaskOriginalId
    );
  };
}

