'use client';

import { Fragment } from 'react';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { pageHeaderMainPageButtonClass } from '@/components/pageHeaderMainPageButtonClass';
import { SingleTooltipGroupProvider } from '@/components/SingleTooltipGroupContext';
import { TextTooltip } from '@/components/TextTooltip';

export interface PageHeaderMainPageTabItem<T extends string = string> {
  icon?: string;
  id: T;
  label: string;
  shortLabel?: string;
}

interface PageHeaderMainPageTabsProps<T extends string> {
  activeId: T;
  ariaLabel: string;
  items: Array<PageHeaderMainPageTabItem<T>>;
  onChange: (id: T) => void;
}

function tabShowsTooltip(item: PageHeaderMainPageTabItem<string>): boolean {
  const visibleLabel = item.shortLabel ?? item.label;
  return visibleLabel !== item.label;
}

export function PageHeaderMainPageTabs<T extends string>({
  activeId,
  ariaLabel,
  items,
  onChange,
}: PageHeaderMainPageTabsProps<T>) {
  return (
    <SingleTooltipGroupProvider>
      <nav aria-label={ariaLabel} className="flex shrink-0 items-center gap-1.5">
        {items.map((item) => {
          const isActive = activeId === item.id;
          const visibleLabel = item.shortLabel ?? item.label;
          const button = (
            <Button
              aria-current={isActive ? 'page' : undefined}
              aria-label={visibleLabel === item.label ? undefined : item.label}
              className={`relative flex h-8 min-h-0 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap !rounded-md !border-0 !px-2.5 !py-0 text-sm shadow-none ${pageHeaderMainPageButtonClass(isActive)}`}
              type="button"
              variant="ghost"
              onClick={() => onChange(item.id)}
            >
              {item.icon ? <Icon className="h-4 w-4 shrink-0" name={item.icon} /> : null}
              {visibleLabel}
            </Button>
          );

          if (!tabShowsTooltip(item)) {
            return <Fragment key={item.id}>{button}</Fragment>;
          }

          return (
            <TextTooltip
              key={item.id}
              content={item.label}
              delayDuration={250}
              side="bottom"
              singleInGroupId={item.id}
            >
              {button}
            </TextTooltip>
          );
        })}
      </nav>
    </SingleTooltipGroupProvider>
  );
}
