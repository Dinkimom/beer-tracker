'use client';

import type { AnimationEvent, ReactNode } from 'react';

import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

interface IconActionMotionProps {
  /**
   * Жест только когда клик переводит состояние из выключенного во включённое.
   * Без `active` жест играет на каждый клик.
   */
  active?: boolean;
  children: ReactNode;
  /** Ключ кадра в CSS (`data-icon-motion`). */
  name: string;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function restartIconMotion(icon: HTMLElement): void {
  icon.classList.remove('icon-action-motion');
  icon.getBoundingClientRect();
  icon.classList.add('icon-action-motion');
}

export function IconActionMotion({ active, children, name }: IconActionMotionProps) {
  const iconRef = useRef<HTMLSpanElement>(null);
  const activeRef = useRef(Boolean(active));
  const clickedRef = useRef(false);
  const armedByClick = active !== undefined;

  const play = useCallback(() => {
    const icon = iconRef.current;
    if (!icon || prefersReducedMotion()) {
      return;
    }
    restartIconMotion(icon);
  }, []);

  useLayoutEffect(() => {
    if (active === undefined) {
      return;
    }
    const wasActive = activeRef.current;
    activeRef.current = active;
    const shouldPlay = clickedRef.current && !wasActive && active;
    clickedRef.current = false;
    if (shouldPlay) {
      play();
    }
  }, [active, play]);

  useEffect(() => {
    const button = iconRef.current?.closest('button');
    if (!button) {
      return;
    }
    const onClick = () => {
      if (armedByClick) {
        clickedRef.current = true;
        requestAnimationFrame(() => {
          clickedRef.current = false;
        });
        return;
      }
      play();
    };
    button.addEventListener('click', onClick);
    return () => button.removeEventListener('click', onClick);
  }, [armedByClick, play]);

  const handleAnimationEnd = (event: AnimationEvent<HTMLSpanElement>) => {
    if (event.target !== event.currentTarget) {
      return;
    }
    event.currentTarget.classList.remove('icon-action-motion');
  };

  return (
    <span
      ref={iconRef}
      className="inline-flex shrink-0"
      data-icon-motion={name}
      onAnimationEnd={handleAnimationEnd}
    >
      {children}
    </span>
  );
}
