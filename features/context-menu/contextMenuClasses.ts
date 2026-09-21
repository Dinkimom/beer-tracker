/**
 * Единые отступы пунктов и разделителей контекстного меню (ховер на всю строку, без «лесенки» у border).
 */

/** Оболочка плавающего меню (контекстное меню, quick-add и др.) */
export const FLOATING_MENU_SHELL =
  'floating-menu-shell rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800';

/**
 * Ширина по контенту. У `fixed` + `w-max` + `max-w-[20rem]` доступная ширина =
 * `viewport - left`: справа от карточки меню растягивается до max-w, слева — нет.
 */
export const FLOATING_MENU_FIT_WIDTH =
  'w-max max-w-max min-w-[220px]';

/** Внутренний столбец: intrinsic-ширина, не «остаток вьюпорта» у fixed-меню. */
export const FLOATING_MENU_FIT_BODY =
  'inline-flex max-w-[min(20rem,calc(100vw-2rem))] flex-col';

export const CONTEXT_MENU_SEPARATOR =
  'shrink-0 border-0 border-t border-gray-100 dark:border-gray-700 m-0 p-0';

/** Общая геометрия строки пункта; ось main задаём только в ITEM_ROW / SUBMENU (перебиваем `Button`: inline-flex + justify-center). */
const CONTEXT_MENU_ITEM_ROW_GEOMETRY =
  '!flex w-full min-h-[2.75rem] items-center gap-2 px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300 outline-none transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50';

/** Базовая строка пункта: симметричные вертикальные отступы, контент по центру по высоте */
export const CONTEXT_MENU_ITEM_ROW = `${CONTEXT_MENU_ITEM_ROW_GEOMETRY} !justify-start`;

/** `!` — перебить `ghost` у `Button` (`hover:bg-gray-100`), порядок в бандле иначе глушит меню */
export const CONTEXT_MENU_ITEM_ROW_NEUTRAL_HOVER =
  'hover:!bg-gray-50 dark:hover:!bg-gray-700';

export const CONTEXT_MENU_ITEM_ROW_ACTIVE = '!bg-gray-50 dark:!bg-gray-700';

/** Строка с шевроном справа (подменю) */
export const CONTEXT_MENU_ITEM_ROW_SUBMENU = `${CONTEXT_MENU_ITEM_ROW_GEOMETRY} !justify-between`;

export const CONTEXT_MENU_ITEM_ROW_DESTRUCTIVE = `${CONTEXT_MENU_ITEM_ROW} text-red-600 dark:text-red-400 hover:!bg-red-50 dark:hover:!bg-red-900/30`;

/** С `Button variant="ghost"`: убрать скругление/бордер примитива, сохранить строку меню */
export const CONTEXT_MENU_GHOST_BUTTON_RESET =
  'rounded-none border-0 bg-transparent shadow-none';
