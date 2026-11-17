/**
 * Метка узла, который отрисован в своём портале, но принадлежит открытому окну или поповеру
 * (выпадающий список результатов поиска): клик по нему окно не закрывает.
 * Открытое модальное окно выключает клики по всему остальному `body`, поэтому такому узлу
 * нужен ещё и `pointer-events: auto`.
 */
export const OVERLAY_CHILD_ATTR = 'data-overlay-child';

/** Нажатие пришлось на узел, помеченный `OVERLAY_CHILD_ATTR`. */
export function isOverlayChildTarget(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(`[${OVERLAY_CHILD_ATTR}]`) != null;
}
