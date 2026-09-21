'use client';

import type { BoardViewMode } from '@/hooks/useLocalStorage';
import type { SprintPresenceBoardView, SprintPresenceViewer } from '@/lib/realtime/sprintRealtimeTypes';

import { useCallback, useEffect, useRef, useState } from 'react';

import { applySprintPresenceBoardView, toSprintPresenceBoardView } from '@/lib/realtime/sprintPresenceBoardView';
import {
  clearSprintPresenceRevealClass,
  querySprintPresenceTargetElement,
  revealSprintPresenceTargetElement,
  SPRINT_PRESENCE_REVEAL_HIGHLIGHT_MS,
  SPRINT_PRESENCE_REVEAL_RETRY_MS,
  SPRINT_PRESENCE_REVEAL_TIMEOUT_MS,
} from '@/lib/realtime/sprintPresenceReveal';

function clearHighlighted(element: HTMLElement | null): void {
  if (element) {
    clearSprintPresenceRevealClass(element);
  }
}

export function useSprintPresenceReveal(input: {
  setViewMode: (value: BoardViewMode | ((prev: BoardViewMode) => BoardViewMode)) => void;
  viewMode: BoardViewMode;
}): (viewer: SprintPresenceViewer) => void {
  const [revealNonce, setRevealNonce] = useState(0);
  const pendingRef = useRef<{ boardView?: SprintPresenceBoardView; targetId: string | null } | null>(
    null
  );
  const highlightedRef = useRef<HTMLElement | null>(null);
  const highlightTimerRef = useRef<number | null>(null);

  const revealViewer = useCallback(
    (viewer: SprintPresenceViewer) => {
      const boardView = viewer.boardView;
      const targetId = viewer.focus?.targetId ?? null;
      if (!boardView && !targetId) {
        return;
      }
      pendingRef.current = { boardView, targetId };
      if (boardView) {
        applySprintPresenceBoardView(boardView, input.setViewMode);
      }
      setRevealNonce((current) => current + 1);
    },
    [input.setViewMode]
  );

  useEffect(() => {
    const pending = pendingRef.current;
    if (!pending) {
      return;
    }
    if (pending.boardView && toSprintPresenceBoardView(input.viewMode) !== pending.boardView) {
      return;
    }
    if (!pending.targetId) {
      pendingRef.current = null;
      return;
    }
    const targetId = pending.targetId;
    let cancelled = false;
    const startedAt = Date.now();
    const highlight = (element: HTMLElement) => {
      clearHighlighted(highlightedRef.current);
      revealSprintPresenceTargetElement(element);
      highlightedRef.current = element;
      if (highlightTimerRef.current) {
        window.clearTimeout(highlightTimerRef.current);
      }
      highlightTimerRef.current = window.setTimeout(() => {
        clearHighlighted(highlightedRef.current);
        highlightedRef.current = null;
      }, SPRINT_PRESENCE_REVEAL_HIGHLIGHT_MS);
    };
    const tick = () => {
      if (cancelled) {
        return;
      }
      const element = querySprintPresenceTargetElement(document, targetId);
      if (element) {
        highlight(element);
        pendingRef.current = null;
        return;
      }
      if (Date.now() - startedAt < SPRINT_PRESENCE_REVEAL_TIMEOUT_MS) {
        window.setTimeout(tick, SPRINT_PRESENCE_REVEAL_RETRY_MS);
      } else {
        pendingRef.current = null;
      }
    };
    tick();
    return () => {
      cancelled = true;
    };
  }, [input.viewMode, revealNonce]);

  useEffect(
    () => () => {
      if (highlightTimerRef.current) {
        window.clearTimeout(highlightTimerRef.current);
      }
      clearHighlighted(highlightedRef.current);
    },
    []
  );

  return revealViewer;
}
