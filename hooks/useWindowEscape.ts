import { useEffect } from 'react';

/**
 * Escape на window. `capture: true` — фаза capture: клавиша перехватывается раньше вложенных
 * обработчиков и гасится (`preventDefault` + `stopPropagation`).
 */
export function useWindowEscape(onEscape: () => void, options: { capture?: boolean } = {}): void {
  const capture = options.capture === true;
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }
      if (capture) {
        event.preventDefault();
        event.stopPropagation();
      }
      onEscape();
    };
    window.addEventListener('keydown', onKeyDown, capture);
    return () => window.removeEventListener('keydown', onKeyDown, capture);
  }, [capture, onEscape]);
}
