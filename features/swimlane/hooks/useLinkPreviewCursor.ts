import { useEffect, useState } from 'react';

export function useLinkPreviewCursor(enabled: boolean): { x: number; y: number } | null {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let frame = 0;
    let latest = { x: 0, y: 0 };
    const onMove = (e: PointerEvent) => {
      latest = { x: e.clientX, y: e.clientY };
      if (frame !== 0) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        setPos(latest);
      });
    };
    window.addEventListener('pointermove', onMove);
    return () => {
      window.removeEventListener('pointermove', onMove);
      if (frame !== 0) cancelAnimationFrame(frame);
    };
  }, [enabled]);

  return enabled ? pos : null;
}
