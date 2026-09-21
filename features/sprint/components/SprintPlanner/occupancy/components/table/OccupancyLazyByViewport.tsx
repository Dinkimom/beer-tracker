'use client';

import type { ReactNode } from 'react';

import React, { forwardRef, useCallback, useEffect, useRef, useState } from 'react';

import { useOccupancyScroll } from '../../OccupancyScrollCtx';

/** Зона предзагрузки (px): контент рендерится до того, как строка войдёт в видимую область */
const ROOT_MARGIN_PX = 500;

interface OccupancyLazyByViewportProps {
  className?: string;
  style?: React.CSSProperties;
  children: (inView: boolean) => ReactNode;
}

/**
 * Рендерит контент только когда элемент попадает в viewport скролл-контейнера.
 * Большой rootMargin + короткий fade-in убирают эффект «травы» при скролле.
 */
export const OccupancyLazyByViewport = forwardRef<HTMLDivElement, OccupancyLazyByViewportProps>(
  function OccupancyLazyByViewport({ children, className, style }, ref) {
    const { scrollContainerRef } = useOccupancyScroll();
    const innerRef = useRef<HTMLDivElement>(null);
    const [isInView, setIsInView] = useState(false);
    const [opacityReady, setOpacityReady] = useState(false);

    const setRef = useCallback(
      (el: HTMLDivElement | null) => {
        (innerRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
        if (typeof ref === 'function') {
          ref(el);
        } else if (ref) {
          (ref as React.MutableRefObject<HTMLDivElement | null>).current = el;
        }
      },
      [ref]
    );

    useEffect(() => {
      const el = innerRef.current;
      const root = scrollContainerRef?.current ?? null;
      if (!el || !root) {
        const id = requestAnimationFrame(() => setIsInView(true));
        return () => cancelAnimationFrame(id);
      }

      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.target === el) {
              setIsInView(entry.isIntersecting);
              break;
            }
          }
        },
        {
          root,
          rootMargin: `${ROOT_MARGIN_PX}px 0px ${ROOT_MARGIN_PX}px 0px`,
          threshold: 0,
        }
      );

      observer.observe(el);
      return () => observer.disconnect();
    }, [scrollContainerRef]);

    useEffect(() => {
      if (!isInView) {
        const id = requestAnimationFrame(() => setOpacityReady(false));
        return () => cancelAnimationFrame(id);
      }
      const id = requestAnimationFrame(() => setOpacityReady(true));
      return () => cancelAnimationFrame(id);
    }, [isInView]);

    const content = children(isInView);

    return (
      <div ref={setRef} className={className} style={style}>
        {content && (
          <div
            className={`occupancy-lazy-fade-in ${opacityReady ? 'opacity-100' : 'opacity-0'}`}
          >
            {content}
          </div>
        )}
      </div>
    );
  }
);
