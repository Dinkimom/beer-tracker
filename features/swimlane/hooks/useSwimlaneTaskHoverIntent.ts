'use client';

import { useCallback, useEffect, useRef } from 'react';

import {
  SWIMLANE_HOVER_INTENT_MS,
  SWIMLANE_HOVER_RELEASE_MS,
} from '@/features/swimlane/utils/swimlaneHoverMotion';

/**
 * Hover-intent для карточек доски: hover карточки затемняет несвязанные задачи и подсвечивает стрелки,
 * поэтому проход курсором по доске не должен переключать его на каждой карточке.
 * `immediate` — применить сразу (начало drag и т.п.).
 */
export function useSwimlaneTaskHoverIntent(
  getCurrent: () => string | null,
  apply: (taskId: string | null) => void
): (taskId: string | null, immediate?: boolean) => void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const getCurrentRef = useRef(getCurrent);
  const applyRef = useRef(apply);

  useEffect(() => {
    getCurrentRef.current = getCurrent;
    applyRef.current = apply;
  }, [apply, getCurrent]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  return useCallback((taskId: string | null, immediate = false) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (immediate) {
      applyRef.current(taskId);
      return;
    }
    if (getCurrentRef.current() === taskId) return;
    timerRef.current = setTimeout(
      () => {
        timerRef.current = null;
        applyRef.current(taskId);
      },
      taskId == null ? SWIMLANE_HOVER_RELEASE_MS : SWIMLANE_HOVER_INTENT_MS
    );
  }, []);
}
