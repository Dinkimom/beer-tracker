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

function tabButtonWidthClass(hasIcon: boolean, isActive: boolean): string {
  if (hasIcon && !isActive) {
    return 'w-8 !px-0';
  }
  return 'px-2.5';
}

function tabShowsTooltip(item: PageHeaderMainPageTabItem<string>, isActive: boolean): boolean {
  if (!item.icon) {
    return false;
  }
  const visibleLabel = item.shortLabel ?? item.label;
  return !(isActive && visibleLabel === item.label);
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
              aria-label={item.icon ? item.label : undefined}
              className={`relative flex h-8 min-h-0 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap !rounded-md !border-0 !py-0 text-sm shadow-none ${tabButtonWidthClass(Boolean(item.icon), isActive)} ${pageHeaderMainPageButtonClass(isActive)}`}
              type="button"
              variant="ghost"
              onClick={() => onChange(item.id)}
            >
              {item.icon ? <Icon className="h-4 w-4 shrink-0" name={item.icon} /> : null}
              {!item.icon || isActive ? visibleLabel : null}
            </Button>
          );

          if (!tabShowsTooltip(item, isActive)) {
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
