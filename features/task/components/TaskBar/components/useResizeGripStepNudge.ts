'use client';

import { useEffect, useRef } from 'react';

const NUDGE_MS = 180;
const NUDGE_PX = 2;

/**
 * Толчок грипа рукоятки, когда кромка переходит на новую ячейку сетки: «щелчок» шага под рукой.
 * Web Animations API, а не remount/класс — не перезапускает анимацию хвата на полосках.
 * Первое значение жеста (null → шаг) толчка не даёт.
 * `growDirection` — куда едет кромка при росте шага: справа/снизу +1, слева/сверху −1.
 */
export function useResizeGripStepNudge(
  step: number | null | undefined,
  axis: 'x' | 'y',
  growDirection: -1 | 1
) {
  const gripRef = useRef<HTMLDivElement | null>(null);
  const prevStepRef = useRef<number | null>(null);

  useEffect(() => {
    const prev = prevStepRef.current;
    const next = step ?? null;
    prevStepRef.current = next;
    const el = gripRef.current;
    if (prev == null || next == null || prev === next || !el || typeof el.animate !== 'function') {
      return;
    }
    if (globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    const shift = (next > prev ? 1 : -1) * growDirection * NUDGE_PX;
    const offset = (px: number) => (axis === 'x' ? `translateX(${px}px)` : `translateY(${px}px)`);
    el.animate(
      [
        { transform: offset(0) },
        { transform: offset(shift) },
        { transform: offset(-shift / 2) },
        { transform: offset(0) },
      ],
      { duration: NUDGE_MS, easing: 'ease-out' }
    );
  }, [axis, growDirection, step]);

  return gripRef;
}
