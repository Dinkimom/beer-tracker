import type { OccupancyPhaseBarProps } from './occupancyPhaseBar.types';

import { useEffect, useMemo } from 'react';

import { usePhaseCardColorScheme } from '@/components/PhaseCardColorSchemeContext';
import { useSprintCardPresenceLocked } from '@/features/task/components/TaskCard/SprintCardPresenceContext';
import { useDocumentDarkClass } from '@/hooks/useDocumentDarkClass';
import { useRootStore } from '@/lib/layers';
import { getPhaseFocusRingClass } from '@/lib/planner-timeline';
import { sprintCardPresenceBlocksNewGestures } from '@/lib/realtime/sprintCardPresence';
import {
  getPhaseDividerClasses,
  getQaStripedStyles,
  resolveStatusForPhaseCardColors,
} from '@/utils/statusColors';

import { usePhaseBarDragResize } from '../../../hooks/usePhaseBarDragResize';
import { usePhaseBarOpacity } from '../../../hooks/usePhaseBarOpacity';
import { occupancyPhaseDividerBgClass } from '../../shared/occupancySharedUiHelpers';

import {
  buildOccupancyPhaseBarSurfaceClass,
  resolvePhaseBarStripeOverlayStyle,
} from './occupancyPhaseBarBarHelpers';
import {
  resolvePhaseBarCellBounds,
  resolvePhaseBarContextMenuState,
  resolvePhaseBarHandleColors,
  resolvePhaseBarPaletteStatusKey,
  useOccupancyPhaseBarStatusColors,
  useOccupancyPlannedInSprintColors,
} from './occupancyPhaseBarComponentHelpers';
import {
  PHASE_BAR_HEIGHT_COMPACT_PX,
  PHASE_BAR_HEIGHT_PX,
  PHASE_PLAN_ROW_INSET_PX,
  TOTAL_PARTS,
} from './occupancyPhaseBarConstants';
import {
  resolvePhaseBorderOnlyClass,
  resolvePhaseColorClass,
  resolvePhaseFillClass,
  resolvePhaseInternalWeekDividerClass,
} from './occupancyPhaseBarResolveClasses';
import { computeOccupancyPhaseBarDurationMetrics } from './occupancyPhaseBarViewModelHelpers';
import { resolveOccupancyBarZIndex } from './occupancyPhaseBarZIndex';

export function useOccupancyPhaseBarViewModel(props: OccupancyPhaseBarProps) {
  const {
    originalStatus,
    elevationAbove = false,
    isQa,
    isOverlapping = false,
    hoveredErrorTaskId,
    barHeight,
    externalDragStartCell,
    onPreviewChange,
    onSave,
    plannedInSprintVariant = false,
    position,
    squareCorners = false,
    planRowInsetPx = PHASE_PLAN_ROW_INSET_PX,
    task,
    taskId,
    teamBorder,
    teamColor,
    teamPlanVariant = false,
    totalParts: totalPartsProp,
    disableDragAndResize = false,
    isDimmedByLinkHover = false,
    isBlurredBySiblingDrag = false,
    isInHoveredConnectionGroup = false,
    hideExtraDuration = false,
    internalWeekDividers = false,
    hideLinkRing = false,
    isLinkSource = false,
    isLinkTarget = false,
    cellsPerDay = 3,
    contextMenuBlurOtherCards = false,
    contextMenuTaskId = null,
    forceDevColor = false,
    forceDiscoveryColor = false,
    forceReleaseStyle = false,
  } = props;

  const resolvedTotalParts = totalPartsProp ?? TOTAL_PARTS;
  const isDark = useDocumentDarkClass();
  const phaseCardColorScheme = usePhaseCardColorScheme();
  const presenceLocked = useSprintCardPresenceLocked(taskId);
  const { sprintPlannerUi } = useRootStore();
  const paletteStatusKey = resolvePhaseBarPaletteStatusKey(originalStatus, task.statusColorKey);
  const statusForColors = resolveStatusForPhaseCardColors(
    phaseCardColorScheme,
    originalStatus,
    task.statusColorKey
  );

  const { durationCells, endCell, isDayMode, startCell } = resolvePhaseBarCellBounds(cellsPerDay, position);
  const qaStriped = !forceDevColor && isQa ? getQaStripedStyles(statusForColors, isDark) : null;
  const qaStripedStyle = qaStriped?.style;
  const qaBaseColor = qaStriped?.baseColor;

  const discoveryYellowColors = useOccupancyPhaseBarStatusColors(
    phaseCardColorScheme,
    originalStatus,
    'intesting'
  );
  const devBlueColors = useOccupancyPhaseBarStatusColors(phaseCardColorScheme, originalStatus, 'inprogress');
  const closedGreenColors = useOccupancyPhaseBarStatusColors(phaseCardColorScheme, originalStatus, 'closed');
  const plannedInSprintColors = useOccupancyPlannedInSprintColors(
    plannedInSprintVariant,
    phaseCardColorScheme,
    originalStatus,
    paletteStatusKey,
    devBlueColors
  );
  const barColors = plannedInSprintVariant ? (plannedInSprintColors ?? devBlueColors) : null;

  const phaseClassCtx = {
    barColors,
    closedGreenColors,
    devBlueColors,
    discoveryYellowColors,
    forceDevColor,
    forceDiscoveryColor,
    forceReleaseStyle,
    plannedInSprintVariant,
    qaStripedStyle,
    teamBorder,
    teamColor,
    teamPlanVariant,
  };
  const phaseColorClass = resolvePhaseColorClass(phaseClassCtx);
  const phaseBorderOnlyClass = resolvePhaseBorderOnlyClass(phaseClassCtx);
  const phaseFillClass = resolvePhaseFillClass(phaseClassCtx);
  const internalWeekDividerClass = resolvePhaseInternalWeekDividerClass(phaseClassCtx);

  const dividerBgClass = occupancyPhaseDividerBgClass({
    discoveryYellowColors,
    devBlueColors,
    forceDevColor,
    forceDiscoveryColor,
    getPhaseDividerClasses,
    isQa,
    statusForColors: statusForColors ?? '',
  });

  const handleColors = useMemo(
    () =>
      resolvePhaseBarHandleColors({
        devBlueColors,
        discoveryYellowColors,
        forceDevColor,
        forceDiscoveryColor,
        isQa,
        originalStatus,
        paletteStatusKey,
        phaseCardColorScheme,
      }),
    [
      forceDiscoveryColor,
      forceDevColor,
      originalStatus,
      paletteStatusKey,
      isQa,
      phaseCardColorScheme,
      devBlueColors,
      discoveryYellowColors,
    ]
  );

  const dragResize = usePhaseBarDragResize({
    position,
    task,
    isDayMode,
    durationCells,
    startCell,
    endCell,
    resolvedTotalParts,
    onSave,
    onPreviewChange,
    externalDragStartCell,
  });

  const durationMetrics = computeOccupancyPhaseBarDurationMetrics({
    dragDisplayDuration: dragResize.displayDuration,
    durationCells,
    hideExtraDuration,
    isResizing: dragResize.isResizing,
    task,
  });

  const { opacity, backgroundDimmed } = usePhaseBarOpacity({
    hoveredErrorTaskId,
    isOverlapping,
    isDimmedByLinkHover,
    isGrabbedForDrag: dragResize.isGrabbedForDrag,
    isDragging: dragResize.isDragging,
    isResizing: dragResize.isResizing,
    isBlurredBySiblingDrag,
  });

  const contextMenuState = resolvePhaseBarContextMenuState(
    contextMenuBlurOtherCards,
    contextMenuTaskId,
    taskId,
    opacity
  );
  const effectiveBarHeight = barHeight ?? PHASE_BAR_HEIGHT_PX;
  const compactRowMode = effectiveBarHeight <= PHASE_BAR_HEIGHT_COMPACT_PX + 2;
  const linkRingClass =
    hideLinkRing || contextMenuState.isContextMenuForThisPhase
      ? ''
      : getPhaseFocusRingClass(isLinkSource, 'source') || getPhaseFocusRingClass(isLinkTarget, 'target');

  const barZIndex = resolveOccupancyBarZIndex(
    contextMenuState.isContextMenuForThisPhase,
    elevationAbove,
    isQa
  );
  const presenceBlocksNewGestures = sprintCardPresenceBlocksNewGestures(
    presenceLocked,
    dragResize.isGrabbedForDrag || dragResize.isDragging || dragResize.isResizing
  );
  const barSurfaceClass = buildOccupancyPhaseBarSurfaceClass(
    isInHoveredConnectionGroup,
    backgroundDimmed,
    phaseBorderOnlyClass,
    phaseColorClass,
    linkRingClass,
    contextMenuState.contextMenuBorderClass,
    disableDragAndResize,
    isLinkTarget,
    squareCorners,
    presenceBlocksNewGestures
  );
  const barStripeStyle = resolvePhaseBarStripeOverlayStyle(
    backgroundDimmed,
    isQa,
    durationMetrics.showExtraPlanDuration,
    qaStripedStyle
  );

  const showDragSourceGhost =
    (dragResize.isGrabbedForDrag || dragResize.isDragging) && !dragResize.isResizing;

  useEffect(() => {
    if (dragResize.isDragging) {
      sprintPlannerUi.setBoardDraggingTaskId(taskId);
    }
    if (dragResize.isResizing) {
      sprintPlannerUi.setResizingTaskId(taskId);
    }
    return () => {
      if (sprintPlannerUi.boardDraggingTaskId === taskId) {
        sprintPlannerUi.setBoardDraggingTaskId(null);
      }
      if (sprintPlannerUi.resizingTaskId === taskId) {
        sprintPlannerUi.setResizingTaskId(null);
      }
    };
  }, [dragResize.isDragging, dragResize.isResizing, sprintPlannerUi, taskId]);

  return {
    backgroundDimmed,
    barStripeStyle,
    barSurfaceClass,
    barZIndex,
    compactRowMode,
    contextMenuState,
    dividerBgClass,
    dragResize,
    endCell,
    estimatedPercent: durationMetrics.estimatedPercent,
    extraPercent: durationMetrics.extraPercent,
    extraSP: durationMetrics.extraSP,
    handleColors,
    internalWeekDividerClass,
    internalWeekDividers,
    phaseFillClass,
    planRowInsetPx,
    presenceBlocksNewGestures,
    qaBaseColor,
    qaStripedStyle,
    resolvedTotalParts,
    showDragSourceGhost,
    showExtraPlanDuration: durationMetrics.showExtraPlanDuration,
    startCell,
  };
}
