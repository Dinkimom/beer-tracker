'use client';

import type { OccupancyPlanPhaseBarsProps } from './occupancyPlanPhaseBars.types';

import { getOccupancyPlanSegmentHtmlAnchorId } from '@/features/sprint/components/SprintPlanner/occupancy/utils/task-arrows/occupancyTaskArrowsEndpointHelpers';

import { OccupancyPhaseBar } from './OccupancyPhaseBar';
import {
  buildQaSegmentPhaseBarFlags,
  buildQaSegmentPosition,
  buildQaSegmentSaveHandler,
} from './occupancyQaPhaseBarsHelpers';

interface OccupancyQaSegmentPhaseBarItemProps {
  cardStyles: { teamBorder: string; teamColor: string };
  idx: number;
  props: OccupancyPlanPhaseBarsProps;
  qaAssigneeDisplayName?: string;
  qaAvatarUrl?: string | null;
  qaInitials: string;
  qaPosition: NonNullable<OccupancyPlanPhaseBarsProps['qaPosition']>;
  qaSegmentsSorted: NonNullable<NonNullable<OccupancyPlanPhaseBarsProps['qaPosition']>['segments']>;
  qaTask: NonNullable<OccupancyPlanPhaseBarsProps['qaTask']>;
}

export function OccupancyQaSegmentPhaseBarItem({
  cardStyles,
  idx,
  props,
  qaAssigneeDisplayName,
  qaAvatarUrl,
  qaInitials,
  qaPosition,
  qaSegmentsSorted,
  qaTask,
}: OccupancyQaSegmentPhaseBarItemProps) {
  const seg = qaSegmentsSorted[idx];
  const flags = buildQaSegmentPhaseBarFlags({
    idx,
    props,
    qaTaskId: qaTask.id,
  });
  const hoverHandlers = props.setHoveredPhaseTaskId
    ? {
        onPhaseHoverEnter: () => props.setHoveredPhaseTaskId!(qaTask.id),
        onPhaseHoverLeave: () => props.setHoveredPhaseTaskId!(null),
      }
    : {};

  return (
    <OccupancyPhaseBar
      key={`qa-seg-${idx}`}
      assigneeDisplayName={qaAssigneeDisplayName}
      avatarUrl={qaAvatarUrl}
      badgeClass={flags.badgeClass}
      barHeight={props.phaseBarHeightPx}
      barTopOffset={props.phaseBarTopOffsetPx}
      cellsPerDay={props.cellsPerDay}
      contextMenuBlurOtherCards={props.contextMenuBlurOtherCards}
      contextMenuTaskId={props.contextMenuTaskId}
      disableDragAndResize={flags.disableDragAndResize}
      errorTooltip={flags.errorTooltip}
      externalDragStartCell={flags.isFirst ? props.linkedQaPreviewStart : undefined}
      forceDevColor={props.quarterlyPhaseStyle}
      hideExtraDuration
      hideLinkRing={flags.hideLinkRing}
      hoveredErrorTaskId={props.hoveredErrorTaskId}
      htmlAnchorId={getOccupancyPlanSegmentHtmlAnchorId(qaTask.id, idx)}
      initials={flags.isFirst ? qaInitials : ''}
      isBlurredBySiblingDrag={flags.isBlurredBySiblingDrag}
      isDimmedByLinkHover={flags.isDimmedByLinkHover}
      isInError={flags.isInError}
      isInHoveredConnectionGroup={flags.isInHoveredConnectionGroup}
      isLinkSource={flags.isLinkSource}
      isLinkTarget={flags.isLinkTarget}
      isOverlapping={flags.isOverlapping}
      isQa
      originalStatus={qaTask.originalStatus}
      position={buildQaSegmentPosition(qaPosition, seg, props.displayAsWeeks, props.toWeekPosition)}
      segmentBadge={
        qaSegmentsSorted.length > 1 ? { index: idx + 1, total: qaSegmentsSorted.length } : null
      }
      showToolsEmoji={props.quarterlyPhaseStyle}
      task={qaTask}
      taskId={qaTask.id}
      teamBorder={cardStyles.teamBorder}
      teamColor={cardStyles.teamColor}
      totalParts={props.totalParts}
      onCompleteLink={props.onCompleteLink}
      onContextMenu={props.onContextMenu}
      onPreviewChange={(preview) => props.handlePositionPreview(qaTask.id, preview)}
      onSave={buildQaSegmentSaveHandler({
        displayAsWeeks: props.displayAsWeeks,
        fromWeekPosition: props.fromWeekPosition,
        onPositionSave: props.onPositionSave,
        qaPosition,
        qaTaskOriginalId: qaTask.originalTaskId,
        seg,
      })}
      {...hoverHandlers}
    />
  );
}
