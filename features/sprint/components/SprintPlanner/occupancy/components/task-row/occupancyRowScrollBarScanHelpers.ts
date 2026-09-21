import {
  updateLeftScrollBarCandidate,
  updateRightScrollBarCandidate,
} from './occupancyRowScrollArrowsProcessHelpers';

export function scanBarsForScrollVisibility(input: {
  bars: HTMLElement[];
  timelineLeft: number;
  timelineRight: number;
}): {
  bestLeftBarLeft: number;
  bestLeftBarRight: number;
  bestRightBarLeft: number;
  showLeft: boolean;
  showRight: boolean;
} {
  let showLeft = false;
  let showRight = false;
  let bestLeftBarLeft = 0;
  let bestLeftBarRight = -Infinity;
  let bestRightBarLeft = Infinity;

  for (const bar of input.bars) {
    const barRect = bar.getBoundingClientRect();
    const leftState = updateLeftScrollBarCandidate({
      barRect,
      bestLeftBarLeft,
      bestLeftBarRight,
      timelineLeft: input.timelineLeft,
    });
    if (leftState.showLeft) {
      showLeft = true;
      bestLeftBarLeft = leftState.bestLeftBarLeft;
      bestLeftBarRight = leftState.bestLeftBarRight;
      continue;
    }
    const rightState = updateRightScrollBarCandidate({
      barRect,
      bestRightBarLeft,
      timelineRight: input.timelineRight,
    });
    if (rightState.showRight) {
      showRight = true;
      bestRightBarLeft = rightState.bestRightBarLeft;
    }
  }

  return { bestLeftBarLeft, bestLeftBarRight, bestRightBarLeft, showLeft, showRight };
}
