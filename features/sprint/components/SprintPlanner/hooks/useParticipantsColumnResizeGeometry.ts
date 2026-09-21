'use client';

import { useEffect, useState, type RefObject } from 'react';

import {
  intersectParticipantsColumnResizeGeometry,
  type ParticipantsColumnResizeGeometry,
} from '../utils/participantsColumnResizeGeometry';

const DAYS_HEADER_SELECTOR = '[data-planner-days-header]';
const SWIMLANES_LANES_SELECTOR = '[data-planner-swimlanes-lanes]';

/**
 * Геометрия ручки: sticky left колонки × пересечение шапки+строк с scrollport
 * (без пустого футера под последней строкой).
 */
export function useParticipantsColumnResizeGeometry(
  scrollContainerRef: RefObject<HTMLElement | null>,
  enabled: boolean
): ParticipantsColumnResizeGeometry | null {
  const [geometry, setGeometry] = useState<ParticipantsColumnResizeGeometry | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const scrollEl = scrollContainerRef.current;
    if (!scrollEl) return;

    const update = () => {
      const scrollRect = scrollEl.getBoundingClientRect();
      const headerEl = scrollEl.querySelector(DAYS_HEADER_SELECTOR);
      const lanesEl = scrollEl.querySelector(SWIMLANES_LANES_SELECTOR);

      if (!(headerEl instanceof HTMLElement) || !(lanesEl instanceof HTMLElement)) {
        setGeometry({
          left: scrollRect.left,
          top: scrollRect.top,
          height: scrollRect.height,
        });
        return;
      }

      const headerRect = headerEl.getBoundingClientRect();
      const lanesRect = lanesEl.getBoundingClientRect();
      setGeometry(
        intersectParticipantsColumnResizeGeometry(
          scrollRect,
          headerRect.top,
          Math.max(headerRect.bottom, lanesRect.bottom)
        )
      );
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(scrollEl);
    const headerEl = scrollEl.querySelector(DAYS_HEADER_SELECTOR);
    const lanesEl = scrollEl.querySelector(SWIMLANES_LANES_SELECTOR);
    if (headerEl instanceof HTMLElement) observer.observe(headerEl);
    if (lanesEl instanceof HTMLElement) observer.observe(lanesEl);

    scrollEl.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);

    return () => {
      observer.disconnect();
      scrollEl.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [enabled, scrollContainerRef]);

  return enabled ? geometry : null;
}
