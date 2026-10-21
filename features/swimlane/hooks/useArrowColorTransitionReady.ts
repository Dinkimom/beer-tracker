import { useEffect, useState } from 'react';

/**
 * `false`, пока стрелка не отрисовала первый кадр со своим цветом; затем `true`.
 * Двойной rAF: passive-эффект после дискретного события может выполниться до paint.
 */
export function useArrowColorTransitionReady(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setReady(true));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, []);
  return ready;
}
