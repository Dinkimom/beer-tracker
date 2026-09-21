'use client';

import { Button } from '@/components/Button';
import { pageHeaderMainPageButtonClass } from '@/components/pageHeaderMainPageButtonClass';

interface PageHeaderMainPageTabsProps<T extends string> {
  activeId: T;
  ariaLabel: string;
  items: Array<{ id: T; label: string }>;
  onChange: (id: T) => void;
}

export function PageHeaderMainPageTabs<T extends string>({
  activeId,
  ariaLabel,
  items,
  onChange,
}: PageHeaderMainPageTabsProps<T>) {
  return (
    <nav
      aria-label={ariaLabel}
      className="flex shrink-0 items-center gap-1 rounded-lg border border-gray-200/80 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-900/50"
    >
      {items.map((item) => {
        const isActive = activeId === item.id;
        return (
          <Button
            key={item.id}
            aria-current={isActive ? 'page' : undefined}
            className={`relative flex h-9 min-h-0 items-center justify-center gap-1.5 whitespace-nowrap !rounded-md border px-3 !py-0 text-sm ${pageHeaderMainPageButtonClass(isActive)}`}
            type="button"
            variant="ghost"
            onClick={() => onChange(item.id)}
          >
            {item.label}
          </Button>
        );
      })}
    </nav>
  );
}
