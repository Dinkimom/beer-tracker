'use client';

import { createContext, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useXarrow } from 'react-xarrows';

import { PLANNER_LOADING_OVERLAY_HIDDEN_EVENT } from '@/components/plannerLoadingOverlayEvents';

/** Один useXarrow на дерево занятости внутри Xwrapper; стабильный колбэк для детей. */
export const OccupancyArrowRedrawContext = createContext<(() => void) | null>(null);

/**
 * Инкремент при каждом requestRedraw — чтобы стрелки пересчитали стороны
 * по DOM (updateXarrow сам по себе не ре-рендерит React).
 */
export const OccupancyArrowRedrawGenerationContext = createContext(0);

export function OccupancyXarrowRedrawProvider({ children }: { children: ReactNode }) {
  const rawRedraw = useXarrow();
  const rawRef = useRef(rawRedraw);
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

  return (
    <OccupancyArrowRedrawContext.Provider value={stableRedraw}>
      <OccupancyArrowRedrawGenerationContext.Provider value={redrawGeneration}>
        {children}
      </OccupancyArrowRedrawGenerationContext.Provider>
    </OccupancyArrowRedrawContext.Provider>
  );
}
