import type { OccupancyPlanPhaseBarsProps } from './occupancyPlanPhaseBars.types';
import type { TaskPosition } from '@/types';

import { getOccupancyPlanSegmentHtmlAnchorId } from '@/features/sprint/components/SprintPlanner/occupancy/utils/task-arrows/occupancyTaskArrowsEndpointHelpers';

import { buildDevPhaseBarSharedFlags } from './occupancyDevPhaseBarsHelpers';
import {
  buildDevSegmentPhaseBarPosition,
  buildDevSegmentPhaseBarSaveHandler,
} from './occupancyDevSegmentPhaseBarsListHelpers';

function buildDevSegmentLinkFlags(
  idx: number,
  sharedFlags: ReturnType<typeof buildDevPhaseBarSharedFlags>
) {
  return {
    hideLinkRing: sharedFlags.hideLinkRing || idx > 0,
    isLinkSource: idx === 0 && sharedFlags.isLinkSource,
    isLinkTarget: idx === 0 && sharedFlags.isLinkTarget,
  };
}

export function buildDevSegmentPhaseBarProps(input: {
  barsProps: OccupancyPlanPhaseBarsProps;
  cardStyles: { teamBorder: string; teamColor: string };
  idx: number;
  seg: NonNullable<TaskPosition['segments']>[number];
  segmentCount: number;
}) {
  const { barsProps, cardStyles, idx, seg, segmentCount } = input;
  const {
    task,
    phaseBarHeightPx,
    phaseBarTopOffsetPx,
    cellsPerDay,
    displayAsWeeks,
    toWeekPosition,
    position,
    positionAssignee,
    initials,
    totalParts,
    setHoveredPhaseTaskId,
    onCompleteLink,
    onContextMenu,
    handleDevPreviewChange,
    quarterlyPhaseStyle,
  } = barsProps;

  const sharedFlags = buildDevPhaseBarSharedFlags(barsProps, task.id);
  const linkFlags = buildDevSegmentLinkFlags(idx, sharedFlags);
  const isFirst = idx === 0;

  return {
    assigneeDisplayName: positionAssignee?.name,
    avatarUrl: positionAssignee?.avatarUrl,
    barHeight: phaseBarHeightPx,
    barTopOffset: phaseBarTopOffsetPx,
    cellsPerDay,
    contextMenuBlurOtherCards: barsProps.contextMenuBlurOtherCards,
    contextMenuTaskId: barsProps.contextMenuTaskId,
    forceDevColor: quarterlyPhaseStyle,
    htmlAnchorId: getOccupancyPlanSegmentHtmlAnchorId(task.id, idx),
    initials: isFirst ? initials : '',
    isQa: barsProps.effectivelyQa,
    originalStatus: task.originalStatus,
    segmentBadge: segmentCount > 1 ? { index: idx + 1, total: segmentCount } : null,
    showToolsEmoji: quarterlyPhaseStyle,
    task,
    taskId: task.id,
    teamBorder: cardStyles.teamBorder,
    teamColor: cardStyles.teamColor,
    totalParts,
    onCompleteLink,
    onContextMenu,
    onPhaseHoverEnter: setHoveredPhaseTaskId ? () => setHoveredPhaseTaskId(task.id) : undefined,
    onPhaseHoverLeave: setHoveredPhaseTaskId ? () => setHoveredPhaseTaskId(null) : undefined,
    onPreviewChange: handleDevPreviewChange,
    position: buildDevSegmentPhaseBarPosition(position!, seg, displayAsWeeks, toWeekPosition),
    onSave: buildDevSegmentPhaseBarSaveHandler({
      displayAsWeeks,
      fromWeekPosition: barsProps.fromWeekPosition,
      onPositionSave: barsProps.onPositionSave,
      position: position!,
      seg,
    }),
    ...sharedFlags,
    hideExtraDuration: true,
    ...linkFlags,
  };
}
