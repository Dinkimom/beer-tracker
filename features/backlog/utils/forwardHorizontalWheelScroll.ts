/**
 * Горизонтальный wheel/trackpad жест внутри колонки с overflow-y не доходит до
 * родителя: overflow-y-auto + overscroll-behavior: none перехватывают цепочку.
 */

export function resolveHorizontalWheelDelta(event: {
  deltaX: number;
  deltaY: number;
  shiftKey: boolean;
}): number {
  if (event.shiftKey && event.deltaX === 0) {
    return event.deltaY;
  }
  return event.deltaX;
}

export function applyHorizontalWheelDelta(
  scroller: {
    clientWidth: number;
    scrollLeft: number;
    scrollWidth: number;
  },
  deltaX: number
): boolean {
  if (deltaX === 0) {
    return false;
  }

  const maxScrollLeft = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
  if (maxScrollLeft <= 0) {
    return false;
  }

  const nextScrollLeft = Math.max(0, Math.min(maxScrollLeft, scroller.scrollLeft + deltaX));
  if (nextScrollLeft === scroller.scrollLeft) {
    return false;
  }

  scroller.scrollLeft = nextScrollLeft;
  return true;
}

/**
 * preventDefault нужен, когда жест в основном горизонтальный (или shift+wheel),
 * иначе вложенная колонка с overscroll-behavior:none «съедает» жест.
 * При диагонали с доминирующим вертикальным — default оставляем колонке.
 */
export function shouldPreventHorizontalWheelDefault(event: {
  deltaX: number;
  deltaY: number;
  shiftKey: boolean;
}): boolean {
  if (event.shiftKey) {
    return true;
  }
  return Math.abs(event.deltaX) >= Math.abs(event.deltaY);
}
