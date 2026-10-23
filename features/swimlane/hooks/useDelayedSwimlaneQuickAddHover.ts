'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { SWIMLANE_HOVER_INTENT_MS } from '@/features/swimlane/utils/swimlaneHoverMotion';

/** «+» в ячейке появляется после hover-intent: проход курсором по пустым ячейкам не рисует превью. */
export function useDelayedSwimlaneQuickAddHover(
  enabled: boolean,
  onHoverChange?: (hovered: boolean) => void
): {
  isHovered: boolean;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
} {
  const [isHovered, setIsHovered] = useState(false);
  const hoveredRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enabledRef = useRef(enabled);
  const onHoverChangeRef = useRef(onHoverChange);

  if (!enabled && isHovered) {
    setIsHovered(false);
  }

  useEffect(() => {
    if (!enabled) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (hoveredRef.current) {
        hoveredRef.current = false;
        onHoverChangeRef.current?.(false);
      }
    }
    enabledRef.current = enabled;
    onHoverChangeRef.current = onHoverChange;
  }, [enabled, onHoverChange]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (!hoveredRef.current) {
        return;
      }
      hoveredRef.current = false;
      onHoverChangeRef.current?.(false);
    },
    []
  );

  const onPointerEnter = useCallback(() => {
    if (!enabledRef.current || hoveredRef.current || timerRef.current) {
      return;
    }
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      if (!enabledRef.current) return;
      hoveredRef.current = true;
      setIsHovered(true);
      onHoverChangeRef.current?.(true);
    }, SWIMLANE_HOVER_INTENT_MS);
  }, []);

  const onPointerLeave = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (!hoveredRef.current) {
      return;
    }
    hoveredRef.current = false;
    setIsHovered(false);
    onHoverChangeRef.current?.(false);
  }, []);

  return { isHovered, onPointerEnter, onPointerLeave };
}
