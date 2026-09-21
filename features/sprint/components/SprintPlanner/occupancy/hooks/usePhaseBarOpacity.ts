function basePhaseBarOpacity(
  hoveredErrorTaskId?: string | null,
  isOverlapping?: boolean
): number {
  if (hoveredErrorTaskId && isOverlapping) {
    return 1;
  }
  if (hoveredErrorTaskId) {
    return 0.3;
  }
  return 1;
}

export function usePhaseBarOpacity({
  hoveredErrorTaskId,
  isOverlapping,
  isDimmedByLinkHover,
  isGrabbedForDrag,
  isDragging,
  isResizing,
  isBlurredBySiblingDrag,
}: {
  hoveredErrorTaskId?: string | null;
  isOverlapping?: boolean;
  isDimmedByLinkHover?: boolean;
  isGrabbedForDrag?: boolean;
  isDragging?: boolean;
  isResizing?: boolean;
  isBlurredBySiblingDrag?: boolean;
}) {
  const baseOpacity = basePhaseBarOpacity(hoveredErrorTaskId, isOverlapping);
  let opacity = baseOpacity;
  if (isDimmedByLinkHover) opacity *= 0.5;
  const backgroundDimmed =
    !!isGrabbedForDrag ||
    !!isDragging ||
    !!isResizing ||
    !!isBlurredBySiblingDrag;

  return { opacity, backgroundDimmed };
}
