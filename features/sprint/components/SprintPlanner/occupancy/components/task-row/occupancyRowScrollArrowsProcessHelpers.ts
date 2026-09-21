export function updateLeftScrollBarCandidate(input: {
  barRect: DOMRect;
  bestLeftBarLeft: number;
  bestLeftBarRight: number;
  timelineLeft: number;
}): { bestLeftBarLeft: number; bestLeftBarRight: number; showLeft: boolean } {
  if (input.barRect.right >= input.timelineLeft) {
    return {
      bestLeftBarLeft: input.bestLeftBarLeft,
      bestLeftBarRight: input.bestLeftBarRight,
      showLeft: false,
    };
  }
  if (input.barRect.right > input.bestLeftBarRight) {
    return {
      bestLeftBarLeft: input.barRect.left,
      bestLeftBarRight: input.barRect.right,
      showLeft: true,
    };
  }
  return {
    bestLeftBarLeft: input.bestLeftBarLeft,
    bestLeftBarRight: input.bestLeftBarRight,
    showLeft: true,
  };
}

export function updateRightScrollBarCandidate(input: {
  barRect: DOMRect;
  bestRightBarLeft: number;
  timelineRight: number;
}): { bestRightBarLeft: number; showRight: boolean } {
  if (input.barRect.left <= input.timelineRight) {
    return { bestRightBarLeft: input.bestRightBarLeft, showRight: false };
  }
  if (input.barRect.left < input.bestRightBarLeft) {
    return { bestRightBarLeft: input.barRect.left, showRight: true };
  }
  return { bestRightBarLeft: input.bestRightBarLeft, showRight: true };
}
