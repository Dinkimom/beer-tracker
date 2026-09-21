import type { CSSProperties } from 'react';

export function resolveOccupancyPhaseBarCursorClass(
  disableDragAndResize: boolean,
  isLinkTarget: boolean,
  presenceLocked = false
): string {
  if (presenceLocked) {
    return 'cursor-not-allowed';
  }
  if (isLinkTarget) {
    return 'cursor-pointer';
  }
  if (disableDragAndResize) {
    return 'cursor-default';
  }
  return 'cursor-grab active:cursor-grabbing';
}

export function resolvePhaseBarPointerEvents(
  dimPeersByContextMenu: boolean,
  pointerEventsNone: boolean
): 'auto' | 'none' {
  if (dimPeersByContextMenu) return 'none';
  if (pointerEventsNone) return 'none';
  return 'auto';
}

export function resolvePhaseBarStripeOverlayStyle(
  backgroundDimmed: boolean,
  isQa: boolean,
  showExtraPlanDuration: boolean,
  qaStripedStyle: CSSProperties | undefined
): CSSProperties | undefined {
  if (backgroundDimmed) return undefined;
  if (isQa && showExtraPlanDuration) return undefined;
  return qaStripedStyle;
}

export function phaseBarRadiusClass(squareCorners?: boolean): string {
  return squareCorners ? 'rounded-none' : 'rounded-lg';
}

export function phaseBarEndRadiusClass(squareCorners?: boolean, side: 'l' | 'r' = 'r'): string {
  if (squareCorners) return 'rounded-none';
  return side === 'l' ? 'rounded-l-lg' : 'rounded-r-lg';
}

export function buildOccupancyPhaseBarSurfaceClass(
  isInHoveredConnectionGroup: boolean,
  backgroundDimmed: boolean,
  phaseBorderOnlyClass: string,
  phaseColorClass: string,
  linkRingClass: string,
  contextMenuBorderClass: string,
  disableDragAndResize: boolean,
  isLinkTarget: boolean,
  squareCorners?: boolean,
  presenceLocked = false
): string {
  const shadowPart = isInHoveredConnectionGroup ? 'shadow-sm' : '';
  const hoverShadowPart = disableDragAndResize ? '' : 'hover:shadow-sm';
  const surfacePart = backgroundDimmed
    ? `bg-transparent ${phaseBorderOnlyClass}`
    : phaseColorClass;
  const cursorPart = resolveOccupancyPhaseBarCursorClass(
    disableDragAndResize,
    isLinkTarget,
    presenceLocked
  );
  const radius = phaseBarRadiusClass(squareCorners);
  const padding = squareCorners ? 'p-0' : 'p-1';

  return [
    `task-bar-opacity-layer absolute flex items-center justify-center ${radius} overflow-visible ${padding} group/phase dark:shadow-sm ${hoverShadowPart}`,
    shadowPart,
    surfacePart,
    linkRingClass,
    contextMenuBorderClass,
    cursorPart,
  ]
    .filter(Boolean)
    .join(' ');
}
