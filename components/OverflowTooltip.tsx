'use client';

import { cloneElement, useCallback, useRef, useState, type ReactElement, type Ref } from 'react';

import { TextTooltip } from './TextTooltip';

interface OverflowTooltipProps {
  children: ReactElement<{ ref?: Ref<HTMLElement> }>;
  /** Полный текст. Показывается, только если элемент реально обрезан. */
  content: string;
}

/**
 * Тултип для обрезанной строки. Пока текст влезает, подсказки нет.
 */
export function OverflowTooltip({ children, content }: OverflowTooltipProps) {
  const observerRef = useRef<ResizeObserver | null>(null);
  const [overflow, setOverflow] = useState(false);

  const setNode = useCallback((node: HTMLElement | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (!node) {
      return;
    }
    const measure = () => {
      const next =
        node.scrollWidth > node.clientWidth + 1 || node.scrollHeight > node.clientHeight + 1;
      setOverflow((prev) => (prev === next ? prev : next));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') {
      return;
    }
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    observerRef.current = observer;
  }, []);

  return (
    <TextTooltip content={content} disabled={!overflow}>
      {/* callback ref measures the truncated node; it is not read during render */}
      {/* eslint-disable-next-line react-hooks/refs -- cloneElement attaches the measure callback */}
      {cloneElement(children, { ref: setNode })}
    </TextTooltip>
  );
}
