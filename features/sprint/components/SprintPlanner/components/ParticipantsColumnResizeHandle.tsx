'use client';

import type { RefObject } from 'react';

import { SidebarResizeHandle } from '@/components/SidebarResizeHandle';
import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';

import { useParticipantsColumnResizeGeometry } from '../hooks/useParticipantsColumnResizeGeometry';
import { useParticipantsColumnWidthResize } from '../hooks/useParticipantsColumnWidthResize';

interface ParticipantsColumnResizeHandleProps {
  columnWidth: number;
  scrollContainerRef: RefObject<HTMLElement | null>;
  onWidthChange: (width: number) => void;
}

/**
 * Fixed hit-strip поверх sticky-колонки (иначе ячейки перехватывают pointer events),
 * визуал — тот же inline SidebarResizeHandle, что у сайдбара.
 */
export function ParticipantsColumnResizeHandle({
  columnWidth,
  onWidthChange,
  scrollContainerRef,
}: ParticipantsColumnResizeHandleProps) {
  const { t } = useI18n();
  const geometry = useParticipantsColumnResizeGeometry(scrollContainerRef, true);
  const { isResizing, onResizeMouseDown } = useParticipantsColumnWidthResize(
    columnWidth,
    onWidthChange
  );

  if (!geometry || geometry.height <= 0) return null;

  return (
    <SidebarResizeHandle
      columnHeight={geometry.height}
      columnLeft={geometry.left}
      columnTop={geometry.top}
      columnWidth={columnWidth}
      fixedIconInViewport
      isResizing={isResizing}
      revealOnHover
      side="right"
      title={t('sprintPlanner.swimlane.resizeParticipantsColumn')}
      zIndexClassName={ZIndex.class('floatingControls')}
      onMouseDown={onResizeMouseDown}
    />
  );
}
