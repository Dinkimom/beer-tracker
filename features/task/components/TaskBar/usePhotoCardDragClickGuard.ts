import { useCallback, useEffect, useRef, useState } from 'react';

import { photoPointerExceededDragThreshold } from './taskBarPhotoGestureHelpers';

export function usePhotoCardDragClickGuard(isPhotoCard: boolean, effectiveIsDragging: boolean) {
  const suppressOpenRef = useRef(false);
  const gestureStartRef = useRef<{ x: number; y: number } | null>(null);
  const [gestureToken, setGestureToken] = useState(0);

  useEffect(() => {
    if (isPhotoCard && effectiveIsDragging) {
      suppressOpenRef.current = true;
    }
  }, [effectiveIsDragging, isPhotoCard]);

  const beginGesture = useCallback(
    (clientX: number, clientY: number) => {
      if (!isPhotoCard) {
        return;
      }
      suppressOpenRef.current = false;
      gestureStartRef.current = { x: clientX, y: clientY };
      setGestureToken((token) => token + 1);
    },
    [isPhotoCard]
  );

  useEffect(() => {
    if (!isPhotoCard || gestureToken === 0) {
      return undefined;
    }

    const onMove = (event: PointerEvent) => {
      const start = gestureStartRef.current;
      if (!start) {
        return;
      }
      if (photoPointerExceededDragThreshold(start, event.clientX, event.clientY)) {
        suppressOpenRef.current = true;
      }
    };

    const end = () => {
      gestureStartRef.current = null;
      window.removeEventListener('pointermove', onMove);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', end, { once: true });
    window.addEventListener('pointercancel', end, { once: true });
    return end;
  }, [gestureToken, isPhotoCard]);

  return { beginGesture, suppressOpenRef };
}
