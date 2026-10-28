import { useEffect, useEffectEvent } from 'react';

interface UseEscapeKeyOptions {
  /** Фаза capture: раньше обработчиков на вложенных элементах. */
  capture?: boolean;
  /** `false` — не слушать (окно закрыто, идёт операция). */
  enabled?: boolean;
  /** Safari: без `preventDefault` Escape выходит из полноэкранного режима. */
  preventDefault?: boolean;
  stopPropagation?: boolean;
  /** `document` в фазе всплытия срабатывает раньше `window` — и его `stopPropagation` до `window` не пускает. */
  target?: 'document' | 'window';
}

/**
 * Escape на `window` / `document`. Флаги применяются к каждому Escape; если гасить событие нужно
 * по условию, колбэк получает его и решает сам. Колбэк берётся свежий, подписка меняется
 * только вместе с опциями.
 */
export function useEscapeKey(
  onEscape: (event: KeyboardEvent) => void,
  {
    capture = false,
    enabled = true,
    preventDefault = false,
    stopPropagation = false,
    target = 'window',
  }: UseEscapeKeyOptions = {}
): void {
  const handleEscape = useEffectEvent(onEscape);
  useEffect(() => {
    if (!enabled) {
      return;
    }
    const node = target === 'document' ? document : window;
    const onKeyDown = (event: Event) => {
      if (!(event instanceof KeyboardEvent) || event.key !== 'Escape') {
        return;
      }
      if (preventDefault) {
        event.preventDefault();
      }
      if (stopPropagation) {
        event.stopPropagation();
      }
      handleEscape(event);
    };
    node.addEventListener('keydown', onKeyDown, capture);
    return () => node.removeEventListener('keydown', onKeyDown, capture);
  }, [capture, enabled, preventDefault, stopPropagation, target]);
}
