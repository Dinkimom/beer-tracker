export const WORKING_DAYS = 10;
/** Рабочих дней в одной календарной неделе сетки спринта (при двухнедельном спринте = WORKING_DAYS / 2) */
export const WORKING_DAYS_PER_WEEK = 5;
export const PARTS_PER_DAY = 3;

/**
 * Верхняя граница индекса дня в API позиций/комментариев.
 * Спринты бывают длиннее дефолтных 10 рабочих дней; realtime presence уже допускает до 400.
 */
export const MAX_PLANNER_DAY_INDEX = 399;
/** Верхняя граница длительности позиции в таймслотах (parts). */
export const MAX_PLANNER_DURATION_PARTS = 400;

// Yandex OAuth application client id (public). Register your own app at
// https://oauth.yandex.ru/ with scopes tracker:read and tracker:write.
export const YANDEX_OAUTH_CLIENT_ID = (
  process.env.NEXT_PUBLIC_YANDEX_OAUTH_CLIENT_ID || ''
).trim();

// Ширина колонки участников (аватар + имя без обрезки)
export const DEVELOPER_COLUMN_WIDTH = 272;
// Ширина двух колонок участников (для расчета ширины контента в режиме full)
export const TEAM_COLORS: Record<string, string> = {
  Back: 'bg-emerald-100 dark:bg-emerald-900/40',
  Web: 'bg-sky-100 dark:bg-sky-900/40',
  QA: 'bg-amber-100 dark:bg-amber-900/40',
  DevOps: 'bg-violet-100 dark:bg-violet-900/40'
};

export const TEAM_BORDER_COLORS: Record<string, string> = {
  Back: 'border-emerald-300 dark:border-emerald-700',
  Web: 'border-sky-300 dark:border-sky-700',
  QA: 'border-amber-300 dark:border-amber-700',
  DevOps: 'border-violet-300 dark:border-violet-700'
};

export const TEAM_TEXT_COLORS: Record<string, string> = {
  Back: 'text-emerald-900 dark:text-emerald-100',
  Web: 'text-sky-900 dark:text-sky-100',
  QA: 'text-amber-900 dark:text-amber-100',
  DevOps: 'text-violet-900 dark:text-violet-100'
};

export const TEAM_SIDEBAR_COLORS: Record<string, string> = {
  Back: 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100',
  Web: 'bg-sky-50 dark:bg-sky-900/30 border-sky-200 dark:border-sky-700 text-sky-900 dark:text-sky-100',
  QA: 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700 text-amber-900 dark:text-amber-100',
  DevOps: 'bg-violet-50 dark:bg-violet-900/30 border-violet-200 dark:border-violet-700 text-violet-900 dark:text-violet-100'
};

/**
 * Горизонтальный inset карточки в ячейке (с каждой стороны).
 * Зазор между соседними однодневными карточками = 2× — нужен, чтобы стрелки и крестик удаления не слипались с краями.
 * В паре с `SWIMLANE_DAY_CARD_WIDTH_PX`: ширина ячейки в full = карточка + 2× inset.
 */
export const CARD_MARGIN = 12;
/** Базовая ширина однодневной карточки в full; ячейку шире делаем за счёт inset, не карточки. */
export const SWIMLANE_DAY_CARD_WIDTH_PX = 250;

export { ZIndex } from './zIndex';
