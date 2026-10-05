/**
 * Единые отступы пунктов и разделителей контекстного меню (ховер на всю строку, без «лесенки» у border).
 */

/** Оболочка плавающего меню (контекстное меню, quick-add и др.) */
export const FLOATING_MENU_SHELL =
  'floating-menu-shell rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800';

/**
 * Капсула поверх доски: контент просвечивает, подписи кнопок остаются читаемыми.
 * Заливка, кромка и blur — `.floating-toolbar-glass` в `globals.css`
 * (перебивает непрозрачный фон `FLOATING_MENU_SHELL`).
 */
export const FLOATING_TOOLBAR_GLASS = 'floating-toolbar-glass';

/**
 * Ховер и нажатие пункта стеклянной капсулы.
 * Прозрачная вуаль, не плоский gray: на стекле непрозрачный серый
 * даёт чужой оттенок и выглядит грязным.
 */
export const FLOATING_TOOLBAR_ITEM_IDLE =
  'text-gray-600 hover:!bg-black/10 active:!bg-black/[0.16] dark:text-gray-300 dark:hover:!bg-white/10 dark:active:!bg-white/[0.16]';

/**
 * Включённый пункт капсулы: полупрозрачная заливка, чтобы не вырезать
 * в стекле непрозрачный прямоугольник.
 */
export const FLOATING_TOOLBAR_ITEM_ON =
  '!bg-blue-600/10 !text-blue-700 hover:!bg-blue-600/15 active:!bg-blue-600/25 dark:!bg-blue-500/20 dark:!text-blue-200 dark:hover:!bg-blue-500/30 dark:active:!bg-blue-500/40';

/**
 * Поле и триггер селекта на стеклянной плашке.
 * Светлая доска почти белая: белая заливка снова выглядит карточкой.
 * Поле — углубление той же тёмной вуалью, что и hover иконок; в фокусе меняется кромка.
 * В тёмной теме углубление плотнее плашки. Меню этой заливкой не красить.
 */
export function glassLensControlClass(selected = false): string {
  const border = selected
    ? '!border-blue-600/30 hover:!border-blue-600/40 dark:!border-blue-400/35'
    : '!border-black/10 hover:!border-black/15 dark:!border-white/15 dark:hover:!border-white/25';
  const fill = selected
    ? '!bg-blue-600/10 !text-blue-900 hover:!bg-blue-600/15 dark:!bg-blue-500/20 dark:!text-blue-100 dark:hover:!bg-blue-500/30'
    : '!bg-black/[0.03] hover:!bg-black/[0.06] active:!bg-black/10 dark:!bg-black/25 dark:hover:!bg-black/40 dark:active:!bg-gray-900';
  const open =
    'focus:!border-blue-500 data-[state=open]:!border-blue-500 dark:focus:!border-blue-400 dark:focus:!bg-gray-900 dark:data-[state=open]:!border-blue-400 dark:data-[state=open]:!bg-gray-900';
  return `border ${border} ${fill} ${open}`;
}

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
  '!flex w-full min-h-[2.75rem] cursor-pointer items-center gap-2 px-4 py-2 text-left text-sm font-medium text-gray-700 outline-none transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 dark:text-gray-300';

/** Базовая строка пункта: симметричные вертикальные отступы, контент по центру по высоте */
export const CONTEXT_MENU_ITEM_ROW = `${CONTEXT_MENU_ITEM_ROW_GEOMETRY} !justify-start`;

/** `!` — перебить `ghost` у `Button` (`hover:bg-gray-100`), порядок в бандле иначе глушит меню */
export const CONTEXT_MENU_ITEM_ROW_NEUTRAL_HOVER =
  'hover:!bg-gray-50 active:!bg-gray-100 dark:hover:!bg-gray-700 dark:active:!bg-gray-600';

export const CONTEXT_MENU_ITEM_ROW_ACTIVE = '!bg-gray-50 dark:!bg-gray-700';

/** Строка с шевроном справа (подменю) */
export const CONTEXT_MENU_ITEM_ROW_SUBMENU = `${CONTEXT_MENU_ITEM_ROW_GEOMETRY} !justify-between`;

export const CONTEXT_MENU_ITEM_ROW_DESTRUCTIVE = `${CONTEXT_MENU_ITEM_ROW} text-red-600 hover:!bg-red-50 active:!bg-red-100 dark:text-red-400 dark:hover:!bg-red-900/30 dark:active:!bg-red-950/60`;

/** С `Button variant="ghost"`: убрать скругление/бордер примитива, сохранить строку меню */
export const CONTEXT_MENU_GHOST_BUTTON_RESET =
  'rounded-none border-0 bg-transparent shadow-none';
