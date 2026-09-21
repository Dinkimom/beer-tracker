import {
  renderOccupancyPhaseBarDimmedBackgroundLayer,
  renderOccupancyPhaseBarExtraDurationLayers,
} from './occupancyPhaseBarBarContentsHelpers';
import {
  OccupancyPhaseBarCenterContentWrapper,
  renderOccupancyPhaseBarWeekDividers,
  type OccupancyPhaseBarBarContentsProps,
} from './occupancyPhaseBarBarContentsLayoutHelpers';
import {
  OccupancyPhaseBarResizeHandles,
} from './occupancyPhaseBarBarContentsSections';
import {
  OccupancyPhaseBarErrorBadge,
} from './OccupancyPhaseBarErrorBadge';

export function OccupancyPhaseBarBarContents(props: OccupancyPhaseBarBarContentsProps) {
  const {
    backgroundDimmed,
    compactRowMode,
    disableDragAndResize,
    hideResizeHandles,
    dividerBgClass,
    durationCells,
    estimatedPercent,
    internalWeekDividerClass,
    internalWeekDividers,
    extraPercent,
    extraSP,
    handleColors,
    handleResizeStart,
    hoverLeft,
    hoverRight,
    isInError,
    isQa,
    phaseFillClass,
    pointerEventsNone,
    readonly,
    resizeSide,
    showExtraPlanDuration,
    showToolsEmoji,
    errorTooltip,
    setHoverLeft,
    setHoverRight,
    qaStripedStyle,
    qaBaseColor,
    squareCorners,
  } = props;

  return (
    <>
      {renderOccupancyPhaseBarWeekDividers(
        internalWeekDividers,
        durationCells,
        internalWeekDividerClass
      )}
      {renderOccupancyPhaseBarDimmedBackgroundLayer({
        backgroundDimmed,
        estimatedPercent,
        extraPercent,
        isQa,
        phaseFillClass,
        qaBaseColor,
        qaStripedStyle,
        showExtraPlanDuration,
        squareCorners,
      })}
      {renderOccupancyPhaseBarExtraDurationLayers({
        backgroundDimmed,
        dividerBgClass,
        estimatedPercent,
        extraPercent,
        extraSP,
        isQa,
        phaseFillClass,
        qaBaseColor,
        qaStripedStyle,
        showExtraPlanDuration,
        squareCorners,
      })}
      <OccupancyPhaseBarResizeHandles
        compactRowMode={compactRowMode}
        disableDragAndResize={disableDragAndResize}
        handleColors={handleColors}
        handleResizeStart={handleResizeStart}
        hideResizeHandles={hideResizeHandles}
        hoverLeft={hoverLeft}
        hoverRight={hoverRight}
        readonly={readonly}
        resizeSide={resizeSide}
        setHoverLeft={setHoverLeft}
        setHoverRight={setHoverRight}
      />
      <OccupancyPhaseBarErrorBadge
        compactRowMode={compactRowMode}
        errorTooltip={errorTooltip}
        isInError={isInError}
        pointerEventsNone={pointerEventsNone}
      />
      <OccupancyPhaseBarCenterContentWrapper
        assigneeDisplayName={props.assigneeDisplayName}
        avatarUrl={props.avatarUrl}
        badgeClass={props.badgeClass}
        compactRowMode={compactRowMode}
        estimatedPercent={estimatedPercent}
        forceReleaseStyle={props.forceReleaseStyle}
        hideCenterContent={props.hideCenterContent}
        initials={props.initials}
        isNarrow={props.isNarrow}
        phaseDateRangeLabel={props.phaseDateRangeLabel}
        phaseDurationLabel={props.phaseDurationLabel}
        plannedInSprintVariant={props.plannedInSprintVariant}
        pointerEventsNone={pointerEventsNone}
        position={props.position}
        showExtraPlanDuration={showExtraPlanDuration}
        showToolsEmoji={showToolsEmoji}
        teamPlanVariant={props.teamPlanVariant}
      />
    </>
  );
}
