import type { OccupancyPhaseBarProps } from '../occupancyPhaseBar.types';
import type { CSSProperties, ReactNode } from 'react';

import { OccupancyPhaseBarCenterContent } from './OccupancyPhaseBarCenterContent';

type Position = OccupancyPhaseBarProps['position'];

export interface OccupancyPhaseBarBarContentsProps {
  assigneeDisplayName?: string | null;
  avatarUrl?: string | null;
  backgroundDimmed: boolean;
  badgeClass?: string;
  compactRowMode: boolean;
  disableDragAndResize: boolean;
  dividerBgClass: string;
  durationCells: number;
  errorTooltip?: string;
  estimatedPercent: number;
  extraPercent: number;
  extraSP: number;
  forceReleaseStyle: boolean;
  handleColors: {
    bg: string;
    bgDark: string;
    hoverBg: string;
    hoverBgDark: string;
    line: string;
    lineDark: string;
  };
  hideCenterContent?: boolean;
  hideResizeHandles?: boolean;
  hoverLeft: boolean;
  hoverRight: boolean;
  initials: string;
  internalWeekDividerClass: string;
  internalWeekDividers: boolean;
  isInError?: boolean;
  isNarrow: boolean;
  isQa: boolean;
  phaseDateRangeLabel?: string;
  phaseDurationLabel?: string;
  phaseFillClass: string;
  plannedInSprintVariant: boolean;
  pointerEventsNone?: boolean;
  position: Position;
  qaBaseColor?: string;
  qaStripedStyle?: CSSProperties;
  readonly: boolean;
  resizeSide: 'left' | 'right' | null;
  showExtraPlanDuration: boolean;
  showToolsEmoji: boolean;
  squareCorners?: boolean;
  teamPlanVariant: boolean;
  handleResizeStart: (e: React.MouseEvent, side: 'left' | 'right') => void;
  setHoverLeft: (v: boolean) => void;
  setHoverRight: (v: boolean) => void;
}

type OccupancyPhaseBarCenterContentWrapperProps = Pick<
  OccupancyPhaseBarBarContentsProps,
  | 'assigneeDisplayName'
  | 'avatarUrl'
  | 'badgeClass'
  | 'compactRowMode'
  | 'estimatedPercent'
  | 'forceReleaseStyle'
  | 'hideCenterContent'
  | 'initials'
  | 'isNarrow'
  | 'phaseDateRangeLabel'
  | 'phaseDurationLabel'
  | 'plannedInSprintVariant'
  | 'pointerEventsNone'
  | 'position'
  | 'showExtraPlanDuration'
  | 'showToolsEmoji'
  | 'teamPlanVariant'
>;

export function renderOccupancyPhaseBarWeekDividers(
  internalWeekDividers: boolean,
  durationCells: number,
  internalWeekDividerClass: string
): ReactNode {
  if (!internalWeekDividers || durationCells <= 1) return null;
  return Array.from({ length: durationCells - 1 }, (_, index) => (
    <div
      key={`week-divider-${index}`}
      aria-hidden
      className={`absolute top-0 bottom-0 w-0 pointer-events-none ${internalWeekDividerClass}`}
      style={{ left: `${((index + 1) / durationCells) * 100}%` }}
    />
  ));
}

function isOccupancyPhaseBarPlannedInSprintLinked(
  props: Pick<OccupancyPhaseBarCenterContentWrapperProps, 'plannedInSprintVariant' | 'position'>
): boolean {
  return Boolean(props.plannedInSprintVariant && props.position.sourceTaskId);
}

function resolveOccupancyPhaseBarCenterStyle(
  props: Pick<
    OccupancyPhaseBarCenterContentWrapperProps,
    'estimatedPercent' | 'plannedInSprintVariant' | 'position' | 'showExtraPlanDuration'
  >
): React.CSSProperties | undefined {
  if (isOccupancyPhaseBarPlannedInSprintLinked(props)) return undefined;
  return {
    left: props.showExtraPlanDuration ? `${props.estimatedPercent / 2}%` : '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)',
  };
}

function resolveOccupancyPhaseBarCenterClassName(
  pointerEventsNone: boolean | undefined,
  plannedInSprintLinked: boolean
): string {
  const pointerClass = pointerEventsNone
    ? 'pointer-events-none'
    : 'pointer-events-auto cursor-grab';
  // w-max: иначе abspos с left:50% сжимает ширину до половины колбасы и аватар становится овалом
  if (plannedInSprintLinked) {
    return `absolute left-1 right-1 top-1/2 -translate-y-1/2 flex items-center justify-center gap-1 overflow-hidden ${pointerClass}`;
  }
  return `absolute flex w-max items-center justify-center gap-1 overflow-visible ${pointerClass}`;
}

export function OccupancyPhaseBarCenterContentWrapper(
  props: OccupancyPhaseBarCenterContentWrapperProps
) {
  const plannedInSprintLinked = isOccupancyPhaseBarPlannedInSprintLinked(props);

  return (
    <div
      className={resolveOccupancyPhaseBarCenterClassName(
        props.pointerEventsNone,
        plannedInSprintLinked
      )}
      style={resolveOccupancyPhaseBarCenterStyle(props)}
      title={props.assigneeDisplayName ?? undefined}
    >
      <OccupancyPhaseBarCenterContent
        avatarUrl={props.avatarUrl}
        badgeClass={props.badgeClass}
        compactRowMode={props.compactRowMode}
        forceReleaseStyle={props.forceReleaseStyle}
        hideCenterContent={props.hideCenterContent}
        initials={props.initials}
        isNarrow={props.isNarrow}
        phaseDateRangeLabel={props.phaseDateRangeLabel}
        phaseDurationLabel={props.phaseDurationLabel}
        plannedInSprintVariant={props.plannedInSprintVariant}
        position={props.position}
        showToolsEmoji={props.showToolsEmoji}
        teamPlanVariant={props.teamPlanVariant}
      />
    </div>
  );
}
