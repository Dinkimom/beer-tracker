import { scanBarsForScrollVisibility } from './occupancyRowScrollBarScanHelpers';
import { computeOccupancyRowScrollTargets } from './occupancyRowScrollTargetsHelpers';

const SCROLL_PADDING = 8;

interface RowScrollArrowVisibility {
  showLeft: boolean;
  showRight: boolean;
  targetLeft: number;
  targetRight: number;
}

export function computeOccupancyRowScrollArrowVisibility(input: {
  bars: HTMLElement[];
  container: HTMLElement;
  containerScrollLeft: number;
  taskColumnWidth: number;
}): RowScrollArrowVisibility {
  if (input.bars.length === 0) {
    return { showLeft: false, showRight: false, targetLeft: 0, targetRight: 0 };
  }

  const cRect = input.container.getBoundingClientRect();
  const timelineLeft = cRect.left + input.taskColumnWidth;
  const timelineRight = cRect.right;

  const { bestLeftBarLeft, bestRightBarLeft, showLeft, showRight } =
    scanBarsForScrollVisibility({ bars: input.bars, timelineLeft, timelineRight });

  const { targetLeft, targetRight } = computeOccupancyRowScrollTargets({
    bestLeftBarLeft,
    bestRightBarLeft,
    containerScrollLeft: input.containerScrollLeft,
    cRectLeft: cRect.left,
    scrollPadding: SCROLL_PADDING,
    showLeft,
    showRight,
    taskColumnWidth: input.taskColumnWidth,
  });

  return { showLeft, showRight, targetLeft, targetRight };
}
