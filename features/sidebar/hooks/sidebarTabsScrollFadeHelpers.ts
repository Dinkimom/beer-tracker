export interface HorizontalScrollFadeEdges {
  showLeft: boolean;
  showRight: boolean;
}

/** Порог в px: меньше — считаем «у края» (субпиксельный скролл / округление). */
const DEFAULT_EDGE_THRESHOLD_PX = 1;

/**
 * Нужны ли fade-подсказки по краям горизонтального скролла.
 * Fade слева — если ушли вправо; справа — если справа ещё есть контент.
 */
export function computeHorizontalScrollFadeEdges({
  clientWidth,
  scrollLeft,
  scrollWidth,
  thresholdPx = DEFAULT_EDGE_THRESHOLD_PX,
}: {
  clientWidth: number;
  scrollLeft: number;
  scrollWidth: number;
  thresholdPx?: number;
}): HorizontalScrollFadeEdges {
  const maxScroll = scrollWidth - clientWidth;
  if (maxScroll <= thresholdPx) {
    return { showLeft: false, showRight: false };
  }
  return {
    showLeft: scrollLeft > thresholdPx,
    showRight: scrollLeft < maxScroll - thresholdPx,
  };
}
