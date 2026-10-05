'use client';

import type { CSSProperties } from 'react';

import { useLayoutEffect, useRef } from 'react';

import { ZIndex } from '@/constants';
import { FLOATING_TOOLBAR_GLASS } from '@/features/context-menu/contextMenuClasses';

interface PlannerParticipantsColumnGlassProps {
  className?: string;
  /** Занять видимую область скролла под шапкой, не раздвигая строки. */
  fillScrollport?: boolean;
  style?: CSSProperties;
  width: number;
}

/**
 * Одна стеклянная плашка на всю видимую колонку исполнителей.
 * Имена строк лежат выше и остаются резкими, карточки под колонкой блюрятся один раз.
 */
export function PlannerParticipantsColumnGlass({
  className = '',
  fillScrollport = false,
  style,
  width,
}: PlannerParticipantsColumnGlassProps) {
  const paneRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!fillScrollport) return undefined;
    const pane = paneRef.current;
    const scroller = pane?.closest('.planner-board-scroll');
    if (!pane || !(scroller instanceof HTMLElement)) return undefined;

    const apply = () => {
      const controls = Number.parseFloat(getComputedStyle(scroller).getPropertyValue('--planner-controls-h')) || 0;
      const paneHeight = Math.max(0, scroller.clientHeight - controls);
      pane.style.height = `${paneHeight}px`;
      pane.style.marginBottom = `${-paneHeight}px`;
    };

    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(scroller);
    return () => observer.disconnect();
  }, [fillScrollport]);

  return (
    <div
      ref={paneRef}
      aria-hidden
      className={`pointer-events-none ${FLOATING_TOOLBAR_GLASS} ${fillScrollport ? 'planner-lane-glass-fill' : ''} ${className}`}
      style={{
        minWidth: width,
        width,
        zIndex: ZIndex.plannerLaneGlass,
        ...style,
      }}
    />
  );
}
