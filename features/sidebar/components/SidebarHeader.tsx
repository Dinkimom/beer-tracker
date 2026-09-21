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
    variant: 'amber' | 'blue' | 'emerald' | 'purple' | 'red' | 'violet';
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
    <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0">
      <div className="relative bg-white dark:bg-gray-800">
        <div
          ref={scrollRef}
          className="flex h-[40px] overflow-x-auto scrollbar-hide"
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
                variant={tab.variant}
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
