'use client';

import { useCallback, useRef } from 'react';

import { resolveStickyNoteTiltDegrees } from '@/features/comments/utils/stickyNoteTilt';

function readLayoutSize(entry: ResizeObserverEntry): { height: number; width: number } {
  const box = entry.borderBoxSize[0];
  if (box) {
    return { height: box.blockSize, width: box.inlineSize };
  }
  return { height: entry.contentRect.height, width: entry.contentRect.width };
}

function stickyNoteTiltHost(node: HTMLElement): HTMLElement {
  const parent = node.parentElement;
  if (parent?.classList.contains('task-bar-opacity-layer')) return parent;
  return node;
}

function bindStickyNoteTilt(node: HTMLElement, cardId: string): () => void {
  const host = stickyNoteTiltHost(node);
  const apply = (width: number, height: number) => {
    host.style.setProperty(
      '--sticky-note-tilt',
      `${resolveStickyNoteTiltDegrees(width, height, cardId)}deg`
    );
  };
  apply(node.offsetWidth, node.offsetHeight);
  const observer = new ResizeObserver((entries) => {
    const entry = entries[0];
    if (!entry) return;
    const size = readLayoutSize(entry);
    apply(size.width, size.height);
  });
  observer.observe(node);
  return () => {
    observer.disconnect();
    host.style.removeProperty('--sticky-note-tilt');
    if (host !== node) node.style.removeProperty('--sticky-note-tilt');
  };
}

/** Следит за рамкой листа и пишет --sticky-note-tilt. Размер — layout, не повёрнутый bbox. */
export function useStickyNoteTilt(
  enabled: boolean,
  cardId: string
): (node: HTMLElement | null) => void {
  const cleanupRef = useRef<(() => void) | null>(null);
  return useCallback(
    (node: HTMLElement | null) => {
      cleanupRef.current?.();
      cleanupRef.current = null;
      if (!enabled || node == null) return;
      cleanupRef.current = bindStickyNoteTilt(node, cardId);
    },
    [cardId, enabled]
  );
}
