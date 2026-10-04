'use client';

import type { SidebarMainTab } from '@/features/sidebar/hooks/useSidebarTabsState';
import type { ReactNode } from 'react';

import { SidebarTabButton } from '@/features/sidebar/components/SidebarHeader/SidebarTabButton';
import { useSidebarTabsScrollFade } from '@/features/sidebar/hooks/useSidebarTabsScrollFade';

interface TaskSidebarHeaderProps {
  mainTab: SidebarMainTab;
  tabs: Array<{
    id: SidebarMainTab;
    label: string;
    badge?: ReactNode;
    title?: string;
  }>;
  setMainTab: (tab: SidebarMainTab) => void;
}

/** Шире + плотный via: у края почти непрозрачно, обрезка таба читается сразу. */
const FADE_BASE =
  'pointer-events-none absolute inset-y-0 w-12 transition-opacity duration-150';
const FADE_LEFT =
  `${FADE_BASE} left-1.5 bg-gradient-to-r from-white from-20% via-white/85 to-transparent dark:from-gray-800 dark:via-gray-800/85`;
const FADE_RIGHT =
  `${FADE_BASE} right-0 bg-gradient-to-l from-white from-20% via-white/85 to-transparent dark:from-gray-800 dark:via-gray-800/85`;

export function SidebarHeader({
  mainTab,
  setMainTab,
  tabs,
}: TaskSidebarHeaderProps) {
  const tabsKey = tabs.map(tab => tab.id).join('|');
  const { scrollRef, showLeft, showRight } = useSidebarTabsScrollFade(tabsKey);

  return (
    // h-14 совпадает с шапкой планера (py-3 + контролы h-8). Верхнюю границу не рисуем: её уже даёт рамка острова.
    <div className="flex h-14 shrink-0 border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <div className="relative min-w-0 flex-1 bg-white dark:bg-gray-800">
        <div
          ref={scrollRef}
          className="flex h-full overflow-x-auto scrollbar-hide"
        >
          {/* Inner wrapper: ResizeObserver видит рост scrollWidth при смене бейджей/подписей */}
          <div className="flex h-full min-w-min">
            {tabs.map(tab => (
              <SidebarTabButton
                key={tab.id}
                badge={tab.badge}
                isActive={mainTab === tab.id}
                label={tab.label}
                title={tab.title}
                onClick={() => setMainTab(tab.id)}
              />
            ))}
          </div>
        </div>
        <div
          aria-hidden
          className={`${FADE_LEFT} ${showLeft ? 'opacity-100' : 'opacity-0'}`}
        />
        <div
          aria-hidden
          className={`${FADE_RIGHT} ${showRight ? 'opacity-100' : 'opacity-0'}`}
        />
      </div>
    </div>
  );
}
