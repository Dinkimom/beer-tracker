import type { StatusColorGroup } from '@/utils/statusColors';
import type { CSSProperties } from 'react';

import {
  resolvePhaseBorderClassFromPalette,
  resolvePhaseColorClassFromPalette,
  resolvePhaseColorPalette,
  resolvePhaseDividerClassFromPalette,
  resolvePhaseFillClassFromPalette,
} from './occupancyPhaseBarResolveClassesHelpers';

export interface PhaseBarClassContext {
  barColors: StatusColorGroup | null;
  closedGreenColors: StatusColorGroup;
  devBlueColors: StatusColorGroup;
  discoveryYellowColors?: StatusColorGroup;
  forceDevColor: boolean;
  forceDiscoveryColor?: boolean;
  forceReleaseStyle: boolean;
  plannedInSprintVariant: boolean;
  qaStripedStyle: CSSProperties | undefined;
  teamBorder: string;
  teamColor: string;
  teamPlanVariant: boolean;
}

export function resolvePhaseColorClass(ctx: PhaseBarClassContext): string {
  return resolvePhaseColorClassFromPalette(
    resolvePhaseColorPalette(ctx),
    ctx.teamColor,
    ctx.teamBorder
  );
}

/** Пунктир между недельными «ячейками» внутри полосы — цвет как у внешней рамки фазы. */
export function resolvePhaseInternalWeekDividerClass(ctx: PhaseBarClassContext): string {
  return resolvePhaseDividerClassFromPalette(
    resolvePhaseColorPalette(ctx),
    ctx.teamBorder
  );
}

export function resolvePhaseBorderOnlyClass(ctx: PhaseBarClassContext): string {
  return resolvePhaseBorderClassFromPalette(
    resolvePhaseColorPalette(ctx),
    ctx.teamBorder
  );
}

export function resolvePhaseFillClass(ctx: PhaseBarClassContext): string {
  return resolvePhaseFillClassFromPalette(
    resolvePhaseColorPalette(ctx),
    ctx.teamColor
  );
}
