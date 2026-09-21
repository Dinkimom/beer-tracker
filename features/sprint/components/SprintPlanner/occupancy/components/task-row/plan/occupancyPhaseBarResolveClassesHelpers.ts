import type { PhaseBarClassContext } from './occupancyPhaseBarResolveClasses';
import type { StatusColorGroup } from '@/utils/statusColors';

type PhaseColorPalette = StatusColorGroup | 'qaStripedEmpty' | 'teamColor' | 'teamPlan';

function resolveStyledPhaseColorPalette(ctx: PhaseBarClassContext): PhaseColorPalette | null {
  if (ctx.forceReleaseStyle) {
    return ctx.closedGreenColors;
  }
  if (ctx.teamPlanVariant) {
    return 'teamPlan';
  }
  if (ctx.forceDiscoveryColor && ctx.discoveryYellowColors) {
    return ctx.discoveryYellowColors;
  }
  return null;
}

function resolveForcedPhaseColorPalette(ctx: PhaseBarClassContext): PhaseColorPalette | null {
  const styled = resolveStyledPhaseColorPalette(ctx);
  if (styled) return styled;
  if (ctx.forceDevColor) {
    return ctx.devBlueColors;
  }
  if (ctx.qaStripedStyle) {
    return 'qaStripedEmpty';
  }
  return null;
}

export function resolvePhaseColorPalette(ctx: PhaseBarClassContext): PhaseColorPalette {
  if (ctx.barColors) {
    return ctx.barColors;
  }
  const forced = resolveForcedPhaseColorPalette(ctx);
  if (forced) return forced;
  return 'teamColor';
}

function paletteClassNames(
  palette: StatusColorGroup,
  parts: { bg?: boolean; border?: boolean }
): string {
  const chunks: string[] = [];
  if (parts.border) {
    chunks.push(palette.border, palette.borderDark ?? '');
  }
  if (parts.bg) {
    chunks.push(palette.bg, palette.bgDark ?? '');
  }
  return chunks.join(' ').trim();
}

export function resolvePhaseColorClassFromPalette(
  palette: PhaseColorPalette,
  teamColor: string,
  teamBorder: string
): string {
  if (palette === 'teamPlan') {
    return 'border-2 border-dashed border-gray-400 bg-gray-200 dark:border-gray-500 dark:bg-gray-600';
  }
  if (palette === 'teamColor') {
    return `border-2 ${teamColor} ${teamBorder}`.trim();
  }
  if (palette === 'qaStripedEmpty') {
    return `border-2 ${teamBorder}`.trim();
  }
  return `border-2 ${paletteClassNames(palette, { bg: true, border: true })}`.trim();
}

export function resolvePhaseBorderClassFromPalette(
  palette: PhaseColorPalette,
  teamBorder: string
): string {
  if (palette === 'teamPlan') {
    return 'border-2 border-dashed border-gray-400 dark:border-gray-500';
  }
  if (palette === 'teamColor' || palette === 'qaStripedEmpty') {
    return `border-2 ${teamBorder}`.trim();
  }
  return `border-2 ${paletteClassNames(palette, { border: true })}`.trim();
}

export function resolvePhaseFillClassFromPalette(
  palette: PhaseColorPalette,
  teamColor: string
): string {
  if (palette === 'teamPlan') {
    return 'bg-gray-200 dark:bg-gray-600';
  }
  if (palette === 'teamColor') {
    return teamColor;
  }
  if (palette === 'qaStripedEmpty') {
    return '';
  }
  return paletteClassNames(palette, { bg: true });
}

export function resolvePhaseDividerClassFromPalette(
  palette: PhaseColorPalette,
  teamBorder: string
): string {
  const dashed = 'border-l-2 border-dashed';
  if (palette === 'teamPlan') {
    return `${dashed} border-gray-400 dark:border-gray-500`;
  }
  if (palette === 'teamColor' || palette === 'qaStripedEmpty') {
    return `${dashed} ${teamBorder}`.trim();
  }
  return `${dashed} ${paletteClassNames(palette, { border: true })}`.trim();
}
