'use client';

import type { OccupancyPhaseBarProps } from './occupancyPhaseBar.types';
import type { useOccupancyPhaseBarViewModel } from './useOccupancyPhaseBarViewModel';

import React from 'react';

import { getOccupancyPhaseBarHtmlAnchorId } from '@/features/sprint/components/SprintPlanner/occupancy/utils/task-arrows/occupancyTaskArrowsEndpointHelpers';
import { SprintCardPresenceAvatars } from '@/features/task/components/TaskCard/SprintCardPresenceAvatars';
import { useSprintCardPresenceViewers } from '@/features/task/components/TaskCard/SprintCardPresenceContext';
import { sprintCardPresenceHasChangingViewer } from '@/lib/realtime/sprintCardPresence';

import { OccupancyPhaseBarBarContents } from './components/OccupancyPhaseBarBarContents';
import { resolvePhaseBarPointerEvents } from './occupancyPhaseBarBarHelpers';
import { PHASE_BAR_HEIGHT_PX, PHASE_BAR_TOP_OFFSET_PX } from './occupancyPhaseBarConstants';

type ViewModel = ReturnType<typeof useOccupancyPhaseBarViewModel>;

interface OccupancyPhaseBarSurfaceProps {
  props: OccupancyPhaseBarProps;
  viewModel: ViewModel;
}

export function OccupancyPhaseBarSurface({ props, viewModel }: OccupancyPhaseBarSurfaceProps) {
  const {
    assigneeDisplayName,
    avatarUrl,
    badgeClass,
    barHeight,
    barTopOffset,
    disableDragAndResize = false,
    errorTooltip,
    forceReleaseStyle = false,
    hideCenterContent = false,
    htmlAnchorId,
    initials,
    isInError,
    isQa,
    onCompleteLink,
    onContextMenu,
    onPhaseHoverEnter,
    onPhaseHoverLeave,
    phaseDateRangeLabel,
    phaseDurationLabel,
    plannedInSprintVariant = false,
    pointerEventsNone,
    position,
    readonly = false,
    showToolsEmoji = false,
    squareCorners = false,
    task,
    taskId,
    teamPlanVariant = false,
  } = props;

  const {
    barStripeStyle,
    barSurfaceClass,
    barZIndex,
    compactRowMode,
    contextMenuState,
    dividerBgClass,
    dragResize,
    estimatedPercent,
    extraPercent,
    extraSP,
    handleColors,
    internalWeekDividerClass,
    internalWeekDividers,
    phaseFillClass,
    planRowInsetPx,
    presenceBlocksNewGestures,
    qaBaseColor,
    qaStripedStyle,
    showExtraPlanDuration,
  } = viewModel;

  const isLinkTarget = props.isLinkTarget ?? false;
  const presenceViewers = useSprintCardPresenceViewers(taskId);
  const isRemoteChanging = sprintCardPresenceHasChangingViewer(presenceViewers);

  return (
    <div
      className={`${barSurfaceClass}${isRemoteChanging ? ' sprint-card-presence-changing' : ''}`}
      data-context-menu-source={onContextMenu ? 'occupancy-phase' : undefined}
      data-occupancy-bar
      data-task-id={taskId}
      id={htmlAnchorId ?? getOccupancyPhaseBarHtmlAnchorId(taskId)}
      style={{
        left: `calc(${dragResize.leftPercent}% + ${planRowInsetPx}px)`,
        right: `calc(${dragResize.rightPercent}% + ${planRowInsetPx}px)`,
        transition:
          isRemoteChanging && !dragResize.isDragging && !dragResize.isResizing
            ? undefined
            : 'none',
        height: barHeight ?? PHASE_BAR_HEIGHT_PX,
        opacity: contextMenuState.opacityWithContextMenu,
        top: barTopOffset ?? PHASE_BAR_TOP_OFFSET_PX,
        zIndex: barZIndex,
        pointerEvents: resolvePhaseBarPointerEvents(
          contextMenuState.dimPeersByContextMenu,
          pointerEventsNone ?? false
        ),
        touchAction: 'none',
        ...barStripeStyle,
      }}
      onClick={(e) => {
        if (!isLinkTarget || !onCompleteLink || presenceBlocksNewGestures) return;
        e.preventDefault();
        e.stopPropagation();
        onCompleteLink(taskId);
      }}
      onContextMenu={(e) => {
        if (presenceBlocksNewGestures) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        if (dragResize.isDragging || dragResize.isResizing || !onContextMenu) return;
        e.preventDefault();
        e.stopPropagation();
        onContextMenu(e, task, false);
      }}
      onMouseDown={(e) => {
        if (presenceBlocksNewGestures || isLinkTarget || disableDragAndResize || readonly) return;
        dragResize.handleDragStart(e);
      }}
      onMouseEnter={onPhaseHoverEnter}
      onMouseLeave={onPhaseHoverLeave}
    >
      <OccupancyPhaseBarBarContents
        assigneeDisplayName={assigneeDisplayName}
        avatarUrl={avatarUrl}
        backgroundDimmed={viewModel.backgroundDimmed}
        badgeClass={badgeClass}
        compactRowMode={compactRowMode}
        disableDragAndResize={disableDragAndResize}
        dividerBgClass={dividerBgClass}
        durationCells={dragResize.displayDuration}
        errorTooltip={errorTooltip}
        estimatedPercent={estimatedPercent}
        extraPercent={extraPercent}
        extraSP={extraSP}
        forceReleaseStyle={forceReleaseStyle}
        handleColors={handleColors}
        handleResizeStart={dragResize.handleResizeStart}
        hideCenterContent={hideCenterContent}
        hideResizeHandles={
          presenceBlocksNewGestures ||
          ((dragResize.isGrabbedForDrag || dragResize.isDragging) && !dragResize.isResizing)
        }
        hoverLeft={dragResize.hoverLeft}
        hoverRight={dragResize.hoverRight}
        initials={initials}
        internalWeekDividerClass={internalWeekDividerClass}
        internalWeekDividers={internalWeekDividers}
        isInError={isInError}
        isNarrow={dragResize.displayDuration < 2}
        isQa={isQa}
        phaseDateRangeLabel={phaseDateRangeLabel}
        phaseDurationLabel={phaseDurationLabel}
        phaseFillClass={phaseFillClass}
        plannedInSprintVariant={plannedInSprintVariant}
        pointerEventsNone={pointerEventsNone}
        position={position}
        qaBaseColor={qaBaseColor}
        qaStripedStyle={qaStripedStyle}
        readonly={readonly}
        resizeSide={dragResize.resizeSide}
        setHoverLeft={dragResize.setHoverLeft}
        setHoverRight={dragResize.setHoverRight}
        showExtraPlanDuration={showExtraPlanDuration}
        showToolsEmoji={showToolsEmoji}
        squareCorners={squareCorners}
        teamPlanVariant={teamPlanVariant}
      />
      <SprintCardPresenceAvatars taskId={taskId} />
    </div>
  );
}
