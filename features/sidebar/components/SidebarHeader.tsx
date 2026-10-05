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

/** Высота ряда вкладок. Список под стеклом начинается ниже этой плашки. */
export const SIDEBAR_TAB_HEADER_HEIGHT_PX = 56;

/** Маска вместо белой заливки: на стекле градиент from-white рисует чужую плашку. */
function sidebarTabsEdgeMask(showLeft: boolean, showRight: boolean): string | undefined {
  if (!showLeft && !showRight) {
    return undefined;
  }
  const left = showLeft ? 'transparent' : '#000';
  const right = showRight ? 'transparent' : '#000';
  return `linear-gradient(to right, ${left} 0, #000 2.75rem, #000 calc(100% - 2.75rem), ${right} 100%)`;
}

export function SidebarHeader({
  mainTab,
  setMainTab,
  tabs,
}: TaskSidebarHeaderProps) {
  const tabsKey = tabs.map(tab => tab.id).join('|');
  const { scrollRef, showLeft, showRight } = useSidebarTabsScrollFade(tabsKey);

  return (
    // h-14 совпадает с шапкой планера (py-3 + контролы h-8). Верхнюю границу не рисуем: её уже даёт рамка острова.
    <div className="flex h-14 shrink-0 border-b border-black/10 dark:border-white/10">
      <div className="relative min-w-0 flex-1">
        <div
          ref={scrollRef}
          className="flex h-full overflow-x-auto scrollbar-hide"
          style={{
            maskImage: sidebarTabsEdgeMask(showLeft, showRight),
            WebkitMaskImage: sidebarTabsEdgeMask(showLeft, showRight),
          }}
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
      </div>
    </div>
  );
}
