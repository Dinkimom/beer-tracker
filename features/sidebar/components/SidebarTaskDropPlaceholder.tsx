'use client';

interface SidebarTaskDropPlaceholderProps {
  /** Высота соседней карточки в списке (px), чтобы слот совпадал с рядом */
  heightPx?: number | null;
}

/**
 * Слот-плейсхолдер в списке неназначенных: «раздвигает» список при дропе в сайдбар.
 */
export function SidebarTaskDropPlaceholder({ heightPx }: SidebarTaskDropPlaceholderProps) {
  return (
    <div
      aria-hidden
      className="w-full min-h-[4.5rem] rounded-lg border-2 border-dashed border-blue-400/90 dark:border-blue-500/80 bg-blue-50/40 dark:bg-blue-950/30 box-border shrink-0"
      style={heightPx != null && heightPx > 0 ? { height: heightPx, minHeight: heightPx } : undefined}
    />
  );
}
