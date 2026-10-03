'use client';

import type { ReactNode } from 'react';

import { Icon } from '@/components/Icon';
import { ResizableSidebar } from '@/components/ResizableSidebar';
import { useI18n } from '@/contexts/LanguageContext';

import { retroIconButtonClass } from './retroUi';

interface RetroMetricsSidebarProps {
  children: ReactNode;
  open: boolean;
  width: number;
  onOpenChange: (open: boolean) => void;
  onWidthChange: (width: number) => void;
}

export function RetroMetricsSidebar({
  children,
  open,
  width,
  onOpenChange,
  onWidthChange,
}: RetroMetricsSidebarProps) {
  const { t } = useI18n();

  return (
    <ResizableSidebar
      isOpen={open}
      maxWidth={520}
      minWidth={280}
      resizeHandleSide="left"
      width={width}
      onToggle={() => onOpenChange(!open)}
      onWidthChange={onWidthChange}
    >
      <div className="relative h-full min-h-0 overflow-y-auto">
        <button
          aria-label={t('retro.hideMetrics')}
          className={`${retroIconButtonClass} absolute top-2 right-2 z-10`}
          type="button"
          onClick={() => onOpenChange(false)}
        >
          <Icon className="h-4 w-4" name="chevron-right" />
        </button>
        {children}
      </div>
    </ResizableSidebar>
  );
}
