'use client';

import { useEffect, useState } from 'react';

/** Сначала пауза, чтобы была видна рукоятка, затем ширина ходит на одну часть туда и обратно. */
export function useOnboardingResizePulse(active: boolean): boolean {
  const [grown, setGrown] = useState(false);

  useEffect(() => {
    if (!active) {
      return;
    }
    let timer = 0;
    const tick = () => {
      setGrown((value) => !value);
      timer = window.setTimeout(tick, 1100);
    };
    timer = window.setTimeout(tick, 700);
    return () => window.clearTimeout(timer);
  }, [active]);

  return active && grown;
}
