'use client';

import type { RectBox } from './plannerOnboardingGeometry';

import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';

function resolveAnchorElement(
  selector: string | null,
  node: HTMLElement | null | undefined
): Element | null {
  if (node) {
    return node;
  }
  if (selector == null || typeof document === 'undefined') {
    return null;
  }
  return document.querySelector(selector);
}

function readAnchorSnapshot(
  active: boolean,
  selector: string | null,
  node: HTMLElement | null | undefined
): string | null {
  if (!active) {
    return null;
  }
  const element = resolveAnchorElement(selector, node);
  if (!(element instanceof Element)) {
    return null;
  }
  const rect = element.getBoundingClientRect();
  return `${rect.top},${rect.left},${rect.width},${rect.height}`;
}

function parseAnchorSnapshot(snapshot: string | null): RectBox | null {
  if (snapshot == null) {
    return null;
  }
  const [top, left, width, height] = snapshot.split(',').map(Number);
  if (top == null || left == null || width == null || height == null) {
    return null;
  }
  return { height, left, top, width };
}

export function useOnboardingAnchorRect(input: {
  active: boolean;
  node?: HTMLElement | null;
  scrollContainerRef: { readonly current: HTMLElement | null };
  selector: string | null;
}): RectBox | null {
  const { active, node = null, scrollContainerRef, selector } = input;
  const subscribe = useCallback(
    (onChange: () => void) => {
      const element = active ? resolveAnchorElement(selector, node) : null;
      const observer = new ResizeObserver(onChange);
      if (element) {
        observer.observe(element);
      }
      const scrollContainer = scrollContainerRef.current;
      scrollContainer?.addEventListener('scroll', onChange, { passive: true });
      window.addEventListener('resize', onChange);
      window.addEventListener('scroll', onChange, true);
      const frame = requestAnimationFrame(onChange);
      return () => {
        cancelAnimationFrame(frame);
        observer.disconnect();
        scrollContainer?.removeEventListener('scroll', onChange);
        window.removeEventListener('resize', onChange);
        window.removeEventListener('scroll', onChange, true);
      };
    },
    [active, node, scrollContainerRef, selector]
  );
  const getSnapshot = useCallback(
    () => readAnchorSnapshot(active, selector, node),
    [active, node, selector]
  );
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => null);

  useEffect(() => {
    if (!active) {
      return;
    }
    resolveAnchorElement(selector, node)?.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
    });
  }, [active, node, selector]);

  return useMemo(() => parseAnchorSnapshot(snapshot), [snapshot]);
}
