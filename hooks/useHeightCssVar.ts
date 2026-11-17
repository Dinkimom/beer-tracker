import { useLayoutEffect } from 'react';

/**
 * Пишет высоту `source` в CSS-переменную на `target` и обновляет её при ресайзе. Так стеклянная панель
 * контролов лежит поверх доски, а доска отступает под неё и липнет к её нижнему краю.
 */
export function useHeightCssVar(target: HTMLElement | null, source: HTMLElement | null, name: string) {
  useLayoutEffect(() => {
    if (!target || !source) return undefined;
    const apply = () => {
      target.style.setProperty(name, `${source.offsetHeight}px`);
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(source);
    return () => observer.disconnect();
  }, [name, source, target]);
}
