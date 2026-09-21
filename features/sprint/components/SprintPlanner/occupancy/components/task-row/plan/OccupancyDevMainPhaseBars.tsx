'use client';

import type { OccupancyPlanPhaseBarsProps } from './occupancyPlanPhaseBars.types';

import {
  applyOccupancyBarPositionPreview,
  buildDevPhaseBarSharedFlags,
  resolveDevPhaseBarLayout,
} from './occupancyDevPhaseBarsHelpers';
import { OccupancyPhaseBar } from './OccupancyPhaseBar';

interface OccupancyDevMainPhaseBarsProps {
  cardStyles: { teamBorder: string; teamColor: string };
  props: OccupancyPlanPhaseBarsProps;
}

export function OccupancyDevMainPhaseBars({ cardStyles, props }: OccupancyDevMainPhaseBarsProps) {
  const {
    cellsPerDay,
    contextMenuBlurOtherCards = false,
    contextMenuTaskId = null,
    displayAsWeeks,
    effectivelyQa,
    fromWeekPosition,
    handleDevPositionSave,
    handleDevPreviewChange,
    onCompleteLink,
    onContextMenu,
    phaseBarHeightPx,
    phaseBarTopOffsetPx,
    position,
    positionAssignee,
    positionPreviews,
    quarterlyPhaseStyle,
    setHoveredPhaseTaskId,
    task,
    toWeekPosition,
    totalParts,
  } = props;

  const sharedFlags = buildDevPhaseBarSharedFlags(props, task.id);
  const previewedPosition = applyOccupancyBarPositionPreview(
    position!,
    positionPreviews.get(task.id)
  );
  const { planBarHeight, planBarTop } = resolveDevPhaseBarLayout(
    phaseBarHeightPx,
    phaseBarTopOffsetPx
  );

  return (
    <OccupancyPhaseBar
      key="dev"
      assigneeDisplayName={positionAssignee?.name}
      avatarUrl={positionAssignee?.avatarUrl}
      badgeClass={sharedFlags.badgeClass}
      barHeight={planBarHeight}
      barTopOffset={planBarTop}
      cellsPerDay={cellsPerDay}
      contextMenuBlurOtherCards={contextMenuBlurOtherCards}
      contextMenuTaskId={contextMenuTaskId}
      disableDragAndResize={sharedFlags.disableDragAndResize}
      elevationAbove={!!quarterlyPhaseStyle}
      errorTooltip={sharedFlags.errorTooltip}
      forceDevColor={quarterlyPhaseStyle}
      hideExtraDuration={sharedFlags.hideExtraDuration}
      hideLinkRing={sharedFlags.hideLinkRing}
      hoveredErrorTaskId={sharedFlags.hoveredErrorTaskId}
      initials={props.initials}
      isBlurredBySiblingDrag={sharedFlags.isBlurredBySiblingDrag}
      isDimmedByLinkHover={sharedFlags.isDimmedByLinkHover}
      isInError={sharedFlags.isInError}
      isInHoveredConnectionGroup={sharedFlags.isInHoveredConnectionGroup}
      isLinkSource={sharedFlags.isLinkSource}
      isLinkTarget={sharedFlags.isLinkTarget}
      isOverlapping={sharedFlags.isOverlapping}
      isQa={effectivelyQa}
      originalStatus={task.originalStatus}
      phaseDurationLabel={sharedFlags.planPhaseDurationLabel}
      position={displayAsWeeks ? toWeekPosition(previewedPosition) : previewedPosition}
      showToolsEmoji={quarterlyPhaseStyle}
      task={task}
      taskId={task.id}
      teamBorder={cardStyles.teamBorder}
      teamColor={cardStyles.teamColor}
      totalParts={totalParts}
      onCompleteLink={onCompleteLink}
      onContextMenu={onContextMenu}
      onPhaseHoverEnter={setHoveredPhaseTaskId ? () => setHoveredPhaseTaskId(task.id) : undefined}
      onPhaseHoverLeave={setHoveredPhaseTaskId ? () => setHoveredPhaseTaskId(null) : undefined}
      onPreviewChange={handleDevPreviewChange}
      onSave={(p) => {
        const normalized = displayAsWeeks ? fromWeekPosition(p) : p;
        handleDevPositionSave({ ...normalized, segments: normalized.segments ?? [] });
      }}
    />
  );
}
