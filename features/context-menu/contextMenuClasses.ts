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
 * Оболочка меню и подменю поверх доски: стекло как у тулбаров, но плотнее под список текста.
 * Подложка — `::before` (`.floating-menu-glass` в `globals.css`), поэтому хост positioned
 * и без своего скролла: скроллить внутренний блок.
 */
export const FLOATING_MENU_GLASS_SHELL = `${FLOATING_MENU_SHELL} floating-menu-glass`;

/**
 * Богатый тултип поверх доски (`contentClassName` у `TextTooltip`): то же стекло, что у меню,
 * вместо тёмной плашки короткой подсказки. `relative` — хост для подложки `::before`.
 */
export const FLOATING_TOOLTIP_GLASS_SHELL = `${FLOATING_MENU_GLASS_SHELL} relative !rounded-lg !p-0 !font-normal !text-gray-900 dark:!text-gray-100`;

/**
 * Ширина по контенту. У `fixed` + `w-max` + `max-w-[20rem]` доступная ширина =
 * `viewport - left`: справа от карточки меню растягивается до max-w, слева — нет.
 */
export const FLOATING_MENU_FIT_WIDTH =
  'w-max max-w-max min-w-[240px]';

/** Внутренний столбец: intrinsic-ширина, не «остаток вьюпорта» у fixed-меню. */
export const FLOATING_MENU_FIT_BODY =
  'inline-flex max-w-[min(20rem,calc(100vw-2rem))] flex-col';

/** Цвет линий внутри меню: вуаль, а не серый — на стекле серый выглядит чужим. */
export const CONTEXT_MENU_DIVIDER_COLOR = 'border-black/[0.06] dark:border-white/10';

export const CONTEXT_MENU_SEPARATOR = `shrink-0 border-0 border-t ${CONTEXT_MENU_DIVIDER_COLOR} m-0 p-0`;

/** Общая геометрия строки пункта; ось main задаём только в ITEM_ROW / SUBMENU (перебиваем `Button`: inline-flex + justify-center). */
const CONTEXT_MENU_ITEM_ROW_GEOMETRY =
  '!flex w-full min-h-[2.75rem] cursor-pointer items-center gap-2 px-4 py-2 text-left text-sm font-medium text-gray-700 outline-none transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 dark:text-gray-300';

/** Базовая строка пункта: симметричные вертикальные отступы, контент по центру по высоте */
export const CONTEXT_MENU_ITEM_ROW = `${CONTEXT_MENU_ITEM_ROW_GEOMETRY} !justify-start`;

/**
 * `!` — перебить `ghost` у `Button` (`hover:bg-gray-100`), порядок в бандле иначе глушит меню.
 * Полупрозрачная вуаль: работает и на стекле, и на непрозрачной оболочке.
 */
export const CONTEXT_MENU_ITEM_ROW_NEUTRAL_HOVER =
  'hover:!bg-black/[0.05] active:!bg-black/[0.09] dark:hover:!bg-white/[0.08] dark:active:!bg-white/[0.14]';

export const CONTEXT_MENU_ITEM_ROW_DESTRUCTIVE = `${CONTEXT_MENU_ITEM_ROW} text-red-600 hover:!bg-red-500/[0.08] active:!bg-red-500/[0.14] dark:text-red-400 dark:hover:!bg-red-400/[0.12] dark:active:!bg-red-400/[0.18]`;

/** С `Button variant="ghost"`: убрать скругление/бордер примитива, сохранить строку меню */
export const CONTEXT_MENU_GHOST_BUTTON_RESET =
  'rounded-none border-0 bg-transparent shadow-none';

/*
 * Меню задачи и его подменю. Строка — «пилюля» внутри панели с полями `MENU_PANEL_PADDING`:
 * у всех пунктов одна высота, текущее значение стоит справа (а не второй строкой),
 * выбранный вариант в подменю отмечается галочкой справа.
 */

/** Поля панели меню и подменю; строки не касаются кромки. */
export const MENU_PANEL_PADDING = 'p-1';

/** Столбец строк: 2px между пунктами, чтобы ховер и «открыто» у соседей не слипались. */
export const MENU_ROW_STACK = 'flex flex-col gap-0.5';

/**
 * Подменю встаёт первой строкой вровень с пунктом-триггером: поле панели + кромка.
 * Сдвиг для позиционирования подменю (вверх и наружу от строки).
 */
export const MENU_SUBMENU_ALIGN_INSET_PX = 5;

/** Radix `sideOffset` от строки-триггера: инсет до кромки меню + зазор 4px. */
export const MENU_SUBMENU_SIDE_OFFSET_PX = MENU_SUBMENU_ALIGN_INSET_PX + 4;

/** Строка меню на `Button variant="ghost"`. `!` перебивает `px-4 py-2 justify-center` примитива. */
export const MENU_ROW = `!flex w-full min-h-8 cursor-pointer !items-center !justify-start gap-2.5 !rounded-md border-0 bg-transparent !px-2 !py-1.5 text-left !text-sm !font-normal leading-5 text-gray-800 shadow-none outline-none active:!scale-100 disabled:pointer-events-none disabled:opacity-50 dark:text-gray-100 ${CONTEXT_MENU_ITEM_ROW_NEUTRAL_HOVER}`;

/** Строка, чьё подменю сейчас открыто. */
export const MENU_ROW_OPEN = '!bg-black/[0.05] dark:!bg-white/[0.08]';

export const MENU_ROW_DESTRUCTIVE = `${MENU_ROW} !text-red-600 hover:!bg-red-500/[0.08] active:!bg-red-500/[0.14] dark:!text-red-400 dark:hover:!bg-red-400/[0.12] dark:active:!bg-red-400/[0.18]`;

export const MENU_ROW_ICON = 'h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400';

/** Текущее значение пункта справа (статус, оценка, исполнитель). */
export const MENU_ROW_VALUE = 'min-w-0 max-w-[10rem] truncate text-xs text-gray-500 dark:text-gray-400';

/** Галочка выбранного варианта в подменю. */
export const MENU_ROW_CHECK = 'h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400';

/** Подпись группы внутри подменю (платформа, SP/TP). */
export const MENU_SECTION_LABEL = 'px-2 pb-1 pt-1.5 text-[11px] font-medium leading-4 text-gray-500 dark:text-gray-400';

/** Разделитель внутри подменю: линия на всю ширину панели, сквозь её поле. */
export const MENU_SEPARATOR = '-mx-1 my-1 h-px shrink-0 bg-black/[0.06] dark:bg-white/10';

/** Иконка с подписью в верхнем ряду быстрых действий меню задачи. */
export const MENU_QUICK_ACTION = `!flex h-12 w-full min-w-0 flex-col !items-center !justify-center gap-1 !rounded-md border-0 bg-transparent !px-1 !py-1 text-gray-500 shadow-none hover:text-gray-900 active:!scale-100 dark:text-gray-400 dark:hover:text-gray-100 ${CONTEXT_MENU_ITEM_ROW_NEUTRAL_HOVER}`;

export const MENU_QUICK_ACTION_LABEL = 'max-w-full truncate text-center text-[11px] font-medium leading-none';
