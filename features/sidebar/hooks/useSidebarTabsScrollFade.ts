'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';

import {
  computeHorizontalScrollFadeEdges,
  type HorizontalScrollFadeEdges,
} from './sidebarTabsScrollFadeHelpers';

const NO_FADE: HorizontalScrollFadeEdges = { showLeft: false, showRight: false };

/**
 * Следит за горизонтальным overflow контейнера табов и отдаёт, какие edge-fade показывать.
 */
export function useSidebarTabsScrollFade(
  /** Пересчёт при смене набора табов (длина / подписи / бейджи). */
  contentKey: number | string
): {
  scrollRef: RefObject<HTMLDivElement | null>;
  showLeft: boolean;
  showRight: boolean;
} {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [edges, setEdges] = useState<HorizontalScrollFadeEdges>(NO_FADE);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let rafId: number | null = null;

    const measure = () => {
      setEdges(
        computeHorizontalScrollFadeEdges({
          clientWidth: el.clientWidth,
          scrollLeft: el.scrollLeft,
          scrollWidth: el.scrollWidth,
        })
      );
    };

    const schedule = () => {
      if (rafId != null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        measure();
      });
    };

    measure();
    el.addEventListener('scroll', schedule, { passive: true });
    const ro = new ResizeObserver(schedule);
    ro.observe(el);
    const firstChild = el.firstElementChild;
    if (firstChild instanceof HTMLElement) {
      ro.observe(firstChild);
    }

    return () => {
      el.removeEventListener('scroll', schedule);
      ro.disconnect();
      if (rafId != null) cancelAnimationFrame(rafId);
    };
  }, [contentKey]);

  return {
    scrollRef,
    showLeft: edges.showLeft,
    showRight: edges.showRight,
  };
}
