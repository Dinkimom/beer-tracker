'use client';

import { useLayoutEffect, useState, type RefObject } from 'react';

import { plannerPatternOffsetWithin } from '@/features/sprint/components/SprintPlanner/layout/plannerPatternOffset';

const ORIGIN_SELECTOR = '[data-planner-pattern-origin]';

/** Сдвиг фонового листа: соседние строки и дни показывают продолжение одного узора. */
export function usePlannerPatternOffset(ref: RefObject<HTMLElement | null>): {
  x: number;
  y: number;
} {
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) {
      return undefined;
    }
    const origin = node.closest(ORIGIN_SELECTOR);
    if (!(origin instanceof HTMLElement)) {
      return undefined;
    }

    const measure = () => {
      const next = plannerPatternOffsetWithin(node, origin);
      setOffset((prev) => (prev.x === next.x && prev.y === next.y ? prev : next));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(origin);
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref]);

  return offset;
}
