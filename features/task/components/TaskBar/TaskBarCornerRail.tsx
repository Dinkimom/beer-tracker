'use client';

import type { ReactNode } from 'react';

/** Общий вид значка в углу карточки: одна высота и форма для всех реек. */
export const TASK_BAR_CORNER_BADGE_CLASS =
  'task-card-swimlane-corner-badge inline-flex h-[18px] min-w-[18px] shrink-0 cursor-default items-center justify-center rounded-md border px-1 text-[9px] font-semibold leading-none tabular-nums shadow-sm hover:scale-125';

interface TaskBarCornerRailItem {
  key: string;
  node: ReactNode;
}

interface TaskBarCornerRailProps {
  /** По приоритету: первый значок стоит в самом углу и не сворачивается. */
  items: TaskBarCornerRailItem[];
  side: 'left' | 'right';
}

/**
 * Рейка значков на верхнем углу карточки: центр на верхней кромке, общий отступ и зазор.
 * На узкой карточке (container query по обёртке реек в TaskBarCornerBadges) видно только первый
 * значок и «+N»; при наведении на карточку (`group/taskbar`) рейка раскрывается.
 */
export function TaskBarCornerRail({ items, side }: TaskBarCornerRailProps) {
  if (items.length === 0) return null;
  const [primary, ...rest] = items;
  return (
    <span
      className={`absolute top-0 flex -translate-y-1/2 items-center gap-0.5 ${
        side === 'left' ? '-left-2' : '-right-2 flex-row-reverse'
      }`}
    >
      {primary.node}
      {rest.map((item) => (
        <span
          key={item.key}
          className="inline-flex @max-[120px]:hidden @max-[120px]:group-hover/taskbar:inline-flex"
        >
          {item.node}
        </span>
      ))}
      {rest.length > 0 ? (
        <span
          aria-hidden
          className={`${TASK_BAR_CORNER_BADGE_CLASS} pointer-events-none hidden border-ds-border-subtle bg-ds-canvas text-ds-text-muted @max-[120px]:inline-flex @max-[120px]:group-hover/taskbar:hidden`}
        >
          +{rest.length}
        </span>
      ) : null}
    </span>
  );
}
