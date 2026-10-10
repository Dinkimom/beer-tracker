/**
 * Nested `overflow-y: auto` becomes a scrollport that eats horizontal wheel
 * even when the column has nothing to scroll on X. Apply deltaX to the board.
 */
export function applyRetroBoardHorizontalWheel(
  board: HTMLElement,
  event: Pick<WheelEvent, 'composedPath' | 'deltaX' | 'deltaY' | 'preventDefault'>
): void {
  if (event.deltaX === 0 || board.scrollWidth <= board.clientWidth) return;

  const nestedVerticalScroll = event.composedPath().some((node) => {
    if (!(node instanceof HTMLElement) || node === board) return false;
    const overflowY = getComputedStyle(node).overflowY;
    return overflowY === 'auto' || overflowY === 'scroll';
  });
  if (!nestedVerticalScroll) return;

  board.scrollLeft += event.deltaX;
  if (Math.abs(event.deltaX) >= Math.abs(event.deltaY)) {
    event.preventDefault();
  }
}
