import type { PlanningPhaseCardColorScheme } from '@/hooks/useLocalStorage';
import type { StatusColorGroup } from '@/utils/statusColors';

import { useMemo } from 'react';

import {
  getMonochromeBorderParts,
  getResizeHandleColors,
  getStatusColors,
  resolvePaletteStatusKey,
  resolveResizeHandleHoverBgClass,
} from '@/utils/statusColors';

function buildOccupancyResizeHandleColors(statusColors: StatusColorGroup): {
  bg: string;
  bgDark: string;
  hoverBg: string;
  hoverBgDark: string;
  line: string;
  lineDark: string;
} {
  const bg = statusColors.resizeHandle.bg;
  const bgDark = statusColors.resizeHandleDark?.bg ?? '';
  return {
    bg,
    bgDark,
    hoverBg: resolveResizeHandleHoverBgClass(bg),
    hoverBgDark: resolveResizeHandleHoverBgClass(bgDark),
    line: statusColors.resizeHandle.line,
    lineDark: statusColors.resizeHandleDark?.line ?? '',
  };
}

function resolveMonochromePhaseColors(originalStatus: string | undefined): StatusColorGroup {
  const b = getStatusColors('backlog');
  const { border, borderDark } = getMonochromeBorderParts(originalStatus);
  return { ...b, border, borderDark };
}

export function useOccupancyPhaseBarStatusColors(
  phaseCardColorScheme: PlanningPhaseCardColorScheme,
  originalStatus: string | undefined,
  fallbackStatusKey: string
): StatusColorGroup {
  return useMemo(() => {
    if (phaseCardColorScheme === 'monochrome') {
      return resolveMonochromePhaseColors(originalStatus);
    }
    return getStatusColors(fallbackStatusKey);
  }, [phaseCardColorScheme, originalStatus, fallbackStatusKey]);
}

export function useOccupancyPlannedInSprintColors(
  plannedInSprintVariant: boolean,
  phaseCardColorScheme: PlanningPhaseCardColorScheme,
  originalStatus: string | undefined,
  paletteStatusKey: string | undefined,
  devBlueColors: StatusColorGroup
): StatusColorGroup | null {
  return useMemo(() => {
    if (!plannedInSprintVariant) return null;
    if (phaseCardColorScheme === 'monochrome') {
      return resolveMonochromePhaseColors(originalStatus);
    }
    if (originalStatus) return getStatusColors(paletteStatusKey ?? originalStatus);
    return devBlueColors;
  }, [plannedInSprintVariant, originalStatus, paletteStatusKey, devBlueColors, phaseCardColorScheme]);
}

export function resolvePhaseBarHandleColors(input: {
  devBlueColors: StatusColorGroup;
  discoveryYellowColors: StatusColorGroup;
  forceDevColor: boolean;
  forceDiscoveryColor: boolean;
  isQa: boolean;
  originalStatus: string | undefined;
  paletteStatusKey: string | undefined;
  phaseCardColorScheme: PlanningPhaseCardColorScheme;
}): {
  bg: string;
  bgDark: string;
  hoverBg: string;
  hoverBgDark: string;
  line: string;
  lineDark: string;
} {
  if (input.forceDiscoveryColor) {
    return buildOccupancyResizeHandleColors(input.discoveryYellowColors);
  }
  if (input.forceDevColor) {
    return buildOccupancyResizeHandleColors(input.devBlueColors);
  }
  return getResizeHandleColors(
    input.paletteStatusKey ?? input.originalStatus,
    input.isQa,
    input.phaseCardColorScheme
  );
}

export function resolvePhaseBarCellBounds(
  cellsPerDay: number,
  position: { startDay: number; startPart: number; duration: number }
): { durationCells: number; endCell: number; isDayMode: boolean; startCell: number } {
  const isDayMode = cellsPerDay === 1;
  const startCell = isDayMode
    ? position.startDay
    : position.startDay * 3 + position.startPart;
  const durationCells = isDayMode
    ? Math.max(1, Math.ceil(position.duration / 3))
    : position.duration;
  return { durationCells, endCell: startCell + durationCells, isDayMode, startCell };
}

export function resolvePhaseBarContextMenuState(
  contextMenuBlurOtherCards: boolean,
  contextMenuTaskId: string | null,
  taskId: string,
  opacity: number
): {
  contextMenuBorderClass: string;
  dimPeersByContextMenu: boolean;
  isContextMenuForThisPhase: boolean;
  opacityWithContextMenu: number;
} {
  const isContextMenuForThisPhase =
    contextMenuBlurOtherCards && contextMenuTaskId != null && contextMenuTaskId === taskId;
  const dimPeersByContextMenu =
    contextMenuBlurOtherCards && contextMenuTaskId != null && contextMenuTaskId !== taskId;
  return {
    contextMenuBorderClass: isContextMenuForThisPhase ? '!border-blue-500 dark:!border-blue-400' : '',
    dimPeersByContextMenu,
    isContextMenuForThisPhase,
    opacityWithContextMenu: opacity * (dimPeersByContextMenu ? 0.5 : 1),
  };
}

export function resolvePhaseBarPaletteStatusKey(
  originalStatus: string | undefined,
  statusColorKey: string | undefined
): string | undefined {
  return resolvePaletteStatusKey(originalStatus, statusColorKey);
}
