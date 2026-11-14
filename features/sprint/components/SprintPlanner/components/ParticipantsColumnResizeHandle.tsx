'use client';

import type { RefObject } from 'react';

import { SidebarResizeHandle } from '@/components/SidebarResizeHandle';
import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import { useFeatureLaneColumnUi } from '@/features/task/components/TaskCard/FeatureLaneCardUiContext';

import { useParticipantsColumnResizeGeometry } from '../hooks/useParticipantsColumnResizeGeometry';
import { useParticipantsColumnWidthResize } from '../hooks/useParticipantsColumnWidthResize';

interface ParticipantsColumnResizeHandleProps {
  columnWidth: number;
  scrollContainerRef: RefObject<HTMLElement | null>;
  /** Шапка и строки внутри скролла; по умолчанию — свимлейна. Квартальный план передаёт свои. */
  selectors?: { header: string; rows: string };
  /** Подсказка; по умолчанию — колонки исполнителей или фич. */
  title?: string;
  /** Пределы ширины; по умолчанию — колонки исполнителей. */
  clampWidth?: (width: number) => number;
  onWidthChange: (width: number) => void;
}

/**
 * Fixed hit-strip поверх sticky-колонки (иначе ячейки перехватывают pointer events),
 * визуал — тот же inline SidebarResizeHandle, что у сайдбара.
 */
export function ParticipantsColumnResizeHandle({
  clampWidth,
  columnWidth,
  onWidthChange,
  scrollContainerRef,
  selectors,
  title,
}: ParticipantsColumnResizeHandleProps) {
  const { t } = useI18n();
  const featureColumn = useFeatureLaneColumnUi();
  const geometry = useParticipantsColumnResizeGeometry(scrollContainerRef, true, selectors);
  const { isResizing, onResizeMouseDown } = useParticipantsColumnWidthResize(
    columnWidth,
    onWidthChange,
    clampWidth
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
      title={
        title ??
        t(
          featureColumn.isFeatureLane
            ? 'sprintPlanner.featureLanes.resizeColumn'
            : 'sprintPlanner.swimlane.resizeParticipantsColumn'
        )
      }
      zIndexClassName={ZIndex.class('floatingControls')}
      onMouseDown={onResizeMouseDown}
    />
  );
}
