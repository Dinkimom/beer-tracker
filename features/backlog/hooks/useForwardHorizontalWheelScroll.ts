'use client';

import { useEffect, type RefObject } from 'react';

import {
  applyHorizontalWheelDelta,
  resolveHorizontalWheelDelta,
  shouldPreventHorizontalWheelDefault,
} from '@/features/backlog/utils/forwardHorizontalWheelScroll';

/**
 * Пробрасывает горизонтальный wheel/trackpad с вложенных overflow-y колонок
 * на родительский overflow-x контейнер.
 */
export function useForwardHorizontalWheelScroll(
  scrollerRef: RefObject<HTMLElement | null>
): void {
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) {
      return;
    }

    const onWheel = (event: WheelEvent) => {
      const deltaX = resolveHorizontalWheelDelta(event);
      if (deltaX === 0) {
        return;
      }

      const applied = applyHorizontalWheelDelta(scroller, deltaX);
      if (!applied) {
        return;
      }

      if (shouldPreventHorizontalWheelDefault(event)) {
        event.preventDefault();
      }
    };

    scroller.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      scroller.removeEventListener('wheel', onWheel);
    };
  }, [scrollerRef]);
}
