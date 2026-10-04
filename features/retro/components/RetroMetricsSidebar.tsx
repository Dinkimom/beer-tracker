'use client';

import type { ReactNode } from 'react';

import { ResizableSidebar } from '@/components/ResizableSidebar';

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
  return (
    <ResizableSidebar
      chrome="island"
      contentClassName="overflow-y-auto"
      isOpen={open}
      maxWidth={520}
      minWidth={280}
      resizeHandleSide="left"
      width={width}
      onToggle={() => onOpenChange(!open)}
      onWidthChange={onWidthChange}
    >
      {children}
    </ResizableSidebar>
  );
}
