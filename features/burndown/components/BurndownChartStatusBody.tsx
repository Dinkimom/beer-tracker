'use client';

/** Пустой спринт, загрузка, ошибка: сообщение по центру холста под селектором спринта. */
export function BurndownChartStatusBody({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-0 flex-1 items-center justify-center">{children}</div>;
}
