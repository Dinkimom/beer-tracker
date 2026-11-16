'use client';

import { useEffect, useState } from 'react';

/** Длительность ухода поповера (`overlay-float-exit`) и превью полосы. */
const CLOSE_ANIMATION_MS = 200;

/**
 * Значение, которое после сброса в null ещё `CLOSE_ANIMATION_MS` остаётся на экране: поповер и превью
 * уходят с анимацией, а не пропадают разом. `open` — значение ещё задано; `shown` — что рисовать.
 */
export function useClosingValue<T>(value: T | null): { open: boolean; shown: T | null } {
  const [last, setLast] = useState<T | null>(value);
  if (value !== null && value !== last) setLast(value);
  useEffect(() => {
    if (value !== null) return undefined;
    const timer = window.setTimeout(() => setLast(null), CLOSE_ANIMATION_MS);
    return () => window.clearTimeout(timer);
  }, [value]);
  return { open: value !== null, shown: value ?? last };
}
