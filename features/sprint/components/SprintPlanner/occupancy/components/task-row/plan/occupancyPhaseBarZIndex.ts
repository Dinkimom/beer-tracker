import { ZIndex } from '@/constants';

export function resolveOccupancyBarZIndex(
  isContextMenuForThisPhase: boolean,
  elevationAbove: boolean,
  isQa: boolean
): number {
  if (isContextMenuForThisPhase) return ZIndex.stickyElevated;
  if (elevationAbove) return ZIndex.baselineOverBar;
  if (isQa) return ZIndex.contentOverlay;
  return ZIndex.contentInteractive;
}
