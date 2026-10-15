'use client';

import type { SprintPresenceAttention } from '@/lib/realtime/sprintRealtimeTypes';

import { useEffect, useState } from 'react';

import { resolveSprintPresenceAttention } from '@/lib/realtime/sprintPresenceAttention';

const ACTIVITY_THROTTLE_MS = 1_000;
const IDLE_POLL_MS = 5_000;

function readVisibilityState(): 'hidden' | 'visible' {
  if (typeof document === 'undefined') {
    return 'visible';
  }
  return document.visibilityState === 'hidden' ? 'hidden' : 'visible';
}

/**
 * active — вкладка видна и недавно была активность / фокус окна / фокус на карточке;
 * idle — вкладка в фоне или давно без действий.
 * Выход из idle: visibility, focus окна, pointer, keyboard — по аналогии с Google Docs.
 */
export function useSprintPresenceAttention(hasFocus: boolean): SprintPresenceAttention {
  const [attention, setAttention] = useState<SprintPresenceAttention>('active');

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    let lastActivityAt = Date.now();
    let lastBumpAt = 0;
    let cancelled = false;

    const recompute = () => {
      if (cancelled) {
        return;
      }
      const next = resolveSprintPresenceAttention({
        hasFocus,
        lastActivityAt,
        now: Date.now(),
        visibilityState: readVisibilityState(),
      });
      setAttention((prev) => (prev === next ? prev : next));
    };

    const bumpActivity = () => {
      if (readVisibilityState() === 'hidden') {
        return;
      }
      const now = Date.now();
      lastActivityAt = now;
      if (now - lastBumpAt < ACTIVITY_THROTTLE_MS) {
        return;
      }
      lastBumpAt = now;
      recompute();
    };

    const onVisibility = () => {
      if (readVisibilityState() === 'visible') {
        lastActivityAt = Date.now();
        lastBumpAt = lastActivityAt;
      }
      recompute();
    };

    /** Как в Google Docs: фокус окна сразу выводит из idle, даже без движения мыши. */
    const onWindowFocus = () => {
      if (readVisibilityState() === 'hidden') {
        return;
      }
      lastActivityAt = Date.now();
      lastBumpAt = lastActivityAt;
      recompute();
    };

    window.addEventListener('pointerdown', bumpActivity);
    window.addEventListener('pointermove', bumpActivity, { passive: true });
    window.addEventListener('keydown', bumpActivity);
    window.addEventListener('focus', onWindowFocus);
    document.addEventListener('visibilitychange', onVisibility);
    const poll = window.setInterval(recompute, IDLE_POLL_MS);
    recompute();

    return () => {
      cancelled = true;
      window.removeEventListener('pointerdown', bumpActivity);
      window.removeEventListener('pointermove', bumpActivity);
      window.removeEventListener('keydown', bumpActivity);
      window.removeEventListener('focus', onWindowFocus);
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearInterval(poll);
    };
  }, [hasFocus]);

  return attention;
}
