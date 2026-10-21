/**
 * Утилита для позиционирования подменю в контекстном меню
 */

import { MENU_SUBMENU_ALIGN_INSET_PX } from '@/features/context-menu/contextMenuClasses';

const VIEWPORT_PADDING = 10;
const SUBMENU_GAP = 4;

export function calculateSubmenuPosition(
  menuRect: DOMRect,
  buttonRect: DOMRect,
  subMenuRect: DOMRect,
  parentRect: DOMRect
): { left: number; top: number } {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // Первая строка подменю вровень с кнопкой: поднимаем на поле панели + кромку
  const buttonTopRelativeToParent = buttonRect.top - parentRect.top - MENU_SUBMENU_ALIGN_INSET_PX;

  // От кромки меню, а не от родителя: строка стоит внутри поля панели
  let left = menuRect.right - parentRect.left + SUBMENU_GAP;
  let top = buttonTopRelativeToParent;

  // Проверяем, помещается ли справа
  if (menuRect.right + subMenuRect.width + SUBMENU_GAP > viewportWidth - VIEWPORT_PADDING) {
    // Показываем слева от контекстного меню
    left = menuRect.left - parentRect.left - subMenuRect.width - SUBMENU_GAP;
    // Не допускаем выход за левый край viewport
    const subMenuLeftEdge = parentRect.left + left;
    if (subMenuLeftEdge < VIEWPORT_PADDING) {
      left = VIEWPORT_PADDING - parentRect.left;
    }
  }

  // Если после флипа/клампа правое ребро всё ещё за viewport — прижимаем к правому краю,
  // не растягивая меню (ширину ограничивает max-w у контейнера).
  const subMenuRightEdge = parentRect.left + left + subMenuRect.width;
  if (subMenuRightEdge > viewportWidth - VIEWPORT_PADDING) {
    left = viewportWidth - VIEWPORT_PADDING - subMenuRect.width - parentRect.left;
    if (parentRect.left + left < VIEWPORT_PADDING) {
      left = VIEWPORT_PADDING - parentRect.left;
    }
  }

  // Проверяем вертикальное позиционирование
  const subMenuBottom = parentRect.top + top + subMenuRect.height;
  if (subMenuBottom > viewportHeight - VIEWPORT_PADDING) {
    // Сдвигаем вверх, чтобы поместилось, но не выше верха кнопки
    const overflow = subMenuBottom - (viewportHeight - VIEWPORT_PADDING);
    top = Math.max(buttonTopRelativeToParent, buttonTopRelativeToParent - overflow);
  }

  // Проверяем, не выходит ли верхняя часть за границу
  if (parentRect.top + top < VIEWPORT_PADDING) {
    top = VIEWPORT_PADDING - parentRect.top;
  }

  return { left, top };
}
