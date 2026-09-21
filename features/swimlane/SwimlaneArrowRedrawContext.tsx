'use client';

import { createContext, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useXarrow } from 'react-xarrows';

import { PLANNER_LOADING_OVERLAY_HIDDEN_EVENT } from '@/components/plannerLoadingOverlayEvents';
import { DELAYS } from '@/utils/constants';

/** Один useXarrow на свимлейны внутри Xwrapper. */
export const SwimlaneArrowRedrawContext = createContext<(() => void) | null>(null);

/**
 * Инкремент при каждом requestRedraw — чтобы стрелки пересчитали стороны
 * по DOM (updateXarrow сам по себе не ре-рендерит React).
 */
export const SwimlaneArrowRedrawGenerationContext = createContext(0);

export function SwimlaneXarrowRedrawProvider({ children }: { children: ReactNode }) {
  const rawRedraw = useXarrow();
  const rawRef = useRef(rawRedraw);
  const layoutRef = useRef<HTMLDivElement>(null);
  const [redrawGeneration, setRedrawGeneration] = useState(0);
  useEffect(() => {
    rawRef.current = rawRedraw;
  });
  const stableRedraw = useCallback(() => {
    rawRef.current();
    setRedrawGeneration((g) => g + 1);
  }, []);

  useEffect(() => {
    window.addEventListener(PLANNER_LOADING_OVERLAY_HIDDEN_EVENT, stableRedraw);
    return () => {
      window.removeEventListener(PLANNER_LOADING_OVERLAY_HIDDEN_EVENT, stableRedraw);
    };
  }, [stableRedraw]);

  useEffect(() => {
    const el = layoutRef.current;
    if (!el) return;
    let timer = 0;
    const observer = new ResizeObserver(() => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => stableRedraw(), DELAYS.ARROW_UPDATE);
    });
    observer.observe(el);
    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, [stableRedraw]);

  return (
    <SwimlaneArrowRedrawContext.Provider value={stableRedraw}>
      <SwimlaneArrowRedrawGenerationContext.Provider value={redrawGeneration}>
        <div ref={layoutRef}>{children}</div>
      </SwimlaneArrowRedrawGenerationContext.Provider>
    </SwimlaneArrowRedrawContext.Provider>
  );
}
