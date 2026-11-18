/**
 * Цвета команд (Web, Back, QA, DevOps) для инициалов в `Avatar` — единственный потребитель.
 * Тона тёмные, чтобы белые инициалы проходили AA (контраст ≥ 4.5:1): на -500 axe помечал
 * их `color-contrast`.
 */

export const TEAM_TAG_BG: Record<string, string> = {
  Back: 'bg-emerald-700',
  Web: 'bg-sky-700',
  QA: 'bg-amber-700',
  DevOps: 'bg-violet-600',
};

export const TEAM_TAG_BORDER: Record<string, string> = {
  Back: 'border-emerald-800',
  Web: 'border-sky-800',
  QA: 'border-amber-800',
  DevOps: 'border-violet-700',
};
