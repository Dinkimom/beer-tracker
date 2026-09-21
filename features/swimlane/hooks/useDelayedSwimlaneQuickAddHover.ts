'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

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
  const enabledRef = useRef(enabled);
  const onHoverChangeRef = useRef(onHoverChange);

  if (!enabled && isHovered) {
    setIsHovered(false);
  }

  useEffect(() => {
    if (!enabled && hoveredRef.current) {
      hoveredRef.current = false;
      onHoverChangeRef.current?.(false);
    }
    enabledRef.current = enabled;
    onHoverChangeRef.current = onHoverChange;
  }, [enabled, onHoverChange]);

  useEffect(
    () => () => {
      if (!hoveredRef.current) {
        return;
      }
      hoveredRef.current = false;
      onHoverChangeRef.current?.(false);
    },
    []
  );

  const onPointerEnter = useCallback(() => {
    if (!enabledRef.current || hoveredRef.current) {
      return;
    }
    hoveredRef.current = true;
    setIsHovered(true);
    onHoverChangeRef.current?.(true);
  }, []);

  const onPointerLeave = useCallback(() => {
    if (!hoveredRef.current) {
      return;
    }
    hoveredRef.current = false;
    setIsHovered(false);
    onHoverChangeRef.current?.(false);
  }, []);

  return { isHovered, onPointerEnter, onPointerLeave };
}
