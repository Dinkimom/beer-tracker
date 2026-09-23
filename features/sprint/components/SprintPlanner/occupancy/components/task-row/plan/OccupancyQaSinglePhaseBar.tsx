'use client';

import type { OccupancyPlanPhaseBarsProps } from './occupancyPlanPhaseBars.types';
import type { TaskPosition } from '@/types';

import { applyOccupancyBarPositionPreview } from './occupancyDevPhaseBarsHelpers';
import { OccupancyPhaseBar } from './OccupancyPhaseBar';
import { buildQaSegmentPhaseBarFlags } from './occupancyQaPhaseBarsHelpers';

interface OccupancyQaSinglePhaseBarProps {
  cardStyles: { teamBorder: string; teamColor: string };
  props: OccupancyPlanPhaseBarsProps;
  qaAssigneeDisplayName?: string;
  qaAvatarUrl?: string | null;
  qaPosition: TaskPosition;
  qaTask: NonNullable<OccupancyPlanPhaseBarsProps['qaTask']>;
}

export function OccupancyQaSinglePhaseBar({
  cardStyles,
  props,
  qaAssigneeDisplayName,
  qaAvatarUrl,
  qaPosition,
  qaTask,
}: OccupancyQaSinglePhaseBarProps) {
  const flags = buildQaSegmentPhaseBarFlags({
    idx: 0,
    props,
    qaTaskId: qaTask.id,
  });
  const previewedPosition = applyOccupancyBarPositionPreview(
    qaPosition,
    props.positionPreviews.get(qaTask.id)
  );

  return (
    <OccupancyPhaseBar
      key="qa"
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
      externalDragStartCell={props.linkedQaPreviewStart}
      forceDevColor={props.quarterlyPhaseStyle}
      hideExtraDuration={props.quarterlyPhaseStyle}
      hideLinkRing={flags.hideLinkRing}
      hoveredErrorTaskId={props.hoveredErrorTaskId}
      initials={props.qaInitials}
      isBlurredBySiblingDrag={flags.isBlurredBySiblingDrag}
      isDimmedByLinkHover={flags.isDimmedByLinkHover}
      isInError={flags.isInError}
      isInHoveredConnectionGroup={flags.isInHoveredConnectionGroup}
      isLinkSource={flags.isLinkSource}
      isLinkTarget={flags.isLinkTarget}
      isOverlapping={flags.isOverlapping}
      isQa
      originalStatus={qaTask.originalStatus}
      position={
        props.displayAsWeeks ? props.toWeekPosition(previewedPosition) : previewedPosition
      }
      showToolsEmoji={props.quarterlyPhaseStyle}
      task={qaTask}
      taskId={qaTask.id}
      teamBorder={cardStyles.teamBorder}
      teamColor={cardStyles.teamColor}
      totalParts={props.totalParts}
      onCompleteLink={props.onCompleteLink}
      onContextMenu={props.onContextMenu}
      onPhaseHoverEnter={
        props.setHoveredPhaseTaskId ? () => props.setHoveredPhaseTaskId!(qaTask.id) : undefined
      }
      onPhaseHoverLeave={
        props.setHoveredPhaseTaskId ? () => props.setHoveredPhaseTaskId!(null) : undefined
      }
      onPreviewChange={(preview, options) => props.handlePositionPreview(qaTask.id, preview, options)}
      onSave={(p) => {
        const normalized = props.displayAsWeeks ? props.fromWeekPosition(p) : p;
        props.onPositionSave?.({ ...normalized, segments: normalized.segments ?? [] }, true, qaTask.originalTaskId);
      }}
    />
  );
}
