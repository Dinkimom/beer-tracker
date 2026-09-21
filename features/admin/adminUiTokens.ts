/** Centralised Tailwind class tokens for the admin panel UI.
 *
 * Elevation (same gray scale as the planner):
 *   light: canvas `gray-50` → chrome/cards `white` → fields `white` + `border-gray-200`
 *   dark:  canvas `background` → chrome/cards `gray-800` → fields `gray-700`
 */

export const pageStack = 'space-y-6';

export const cardShell =
  'overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800';
export const cardHeader =
  'border-b border-gray-200 px-5 py-4 dark:border-gray-700';
export const cardBody = 'px-5 py-5';

/** Список в карточке: без второй рамки, строки на всю ширину. */
export const adminListShell = 'divide-y divide-gray-100 dark:divide-gray-700';

/** Строка списка: тот же фон, что у карточки; отступ совпадает с шапкой. */
export const adminListRow =
  'px-5 py-3.5 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50';

/** Строка с развёрнутым блоком слева и панелью действий справа (команды) */
export const adminListRowLayoutGrid =
  'grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-6';

/**
 * Табличная сетка состава команды: сотрудник | роль в команде | удалить.
 */
export const adminTeamRosterGrid =
  'grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,16rem)_minmax(3.25rem,3.75rem)] sm:gap-x-5 sm:gap-y-0 sm:items-center';

/** Заголовок над списком состава (те же колонки, что у adminTeamRosterGrid). */
export const adminTeamRosterTableHeader =
  'hidden border-b border-gray-200 px-5 py-2.5 text-xs font-medium text-gray-500 dark:border-gray-700 dark:text-gray-400 sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(12rem,16rem)_minmax(3.25rem,3.75rem)] sm:gap-x-5 sm:items-center';

export const hPage = 'text-xl font-semibold tracking-tight text-gray-900 dark:text-gray-50';
export const hCard = 'text-sm font-semibold text-gray-900 dark:text-gray-100';
/** Вторичный текст (описания, подсказки); в тёмной теме чуть выше контраст для чтения. */
export const muted = 'text-sm leading-relaxed text-gray-500 dark:text-gray-400';
export const label = 'mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400';
export const field =
  'h-10 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-900 transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-blue-400 dark:focus:ring-blue-400/20';

/** Чекбокс в формах админки: без классов в тёмной теме контроль почти не виден. */
export const adminFormCheckbox =
  'h-4 w-4 shrink-0 cursor-pointer rounded border-2 border-gray-300 bg-white accent-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:border-gray-500 dark:bg-gray-700 dark:accent-blue-400 dark:focus:ring-blue-400 dark:focus:ring-offset-gray-800';

export const tabList =
  'inline-flex flex-wrap gap-1 rounded-xl bg-gray-100/90 p-1 dark:bg-gray-900/50';
export const tabBtnBase =
  'cursor-pointer rounded-lg border-0 px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-0';
export const tabBtnIdle =
  'text-gray-600 hover:bg-white/70 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700/60 dark:hover:text-gray-100';
export const tabBtnActive =
  'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white dark:shadow-none';

/** Статусный бейдж-пилюля. Пример: <span className={badgeSuccess}>Токен сохранён</span> */
export const badgeSuccess =
  'inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-200';

/** Предупредительный бейдж-пилюля. Пример: <span className={badgeWarning}>Не настроен</span> */
export const badgeWarning =
  'inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-400/10 dark:text-amber-100';

/** Нейтральный/приглушённый бейдж-пилюля. Пример: <span className={badgeMuted}>org_admin</span> */
export const badgeMuted =
  'inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300';
