'use client';

import type { AnimationEvent } from 'react';

import { useCallback, useEffect, useState } from 'react';

export const SIDE_PANEL_ENTER_CLASS = 'task-info-sidebar-enter';
export const SIDE_PANEL_EXIT_CLASS = 'task-info-sidebar-exit';
export const SIDE_PANEL_EXIT_ANIMATION = 'task-info-sidebar-exit';
export const SIDE_PANEL_EXIT_DURATION_MS = 220;

type SidePanelPhase = 'closed' | 'exiting' | 'open';

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function nextSidePanelPhase(
  open: boolean,
  phase: SidePanelPhase,
  reducedMotion: boolean
): SidePanelPhase {
  if (open) {
    return 'open';
  }
  if (phase === 'closed' || reducedMotion) {
    return 'closed';
  }
  if (phase === 'open') {
    return 'exiting';
  }
  return phase;
}

export function isSidePanelExitAnimationFinished(
  animationName: string,
  eventTarget: EventTarget | null,
  currentTarget: EventTarget | null,
  phase: SidePanelPhase
): boolean {
  return (
    phase === 'exiting' &&
    animationName === SIDE_PANEL_EXIT_ANIMATION &&
    eventTarget === currentTarget
  );
}

export function useSidePanelPresence(open: boolean): {
  className: string;
  isExiting: boolean;
  mounted: boolean;
  onAnimationEnd: (event: AnimationEvent<HTMLElement>) => void;
} {
  const [phase, setPhase] = useState<SidePanelPhase>(open ? 'open' : 'closed');
  const nextPhase = nextSidePanelPhase(open, phase, prefersReducedMotion());
  if (nextPhase !== phase) {
    setPhase(nextPhase);
  }

  useEffect(() => {
    if (phase !== 'exiting') {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      setPhase((current) => (current === 'exiting' ? 'closed' : current));
    }, SIDE_PANEL_EXIT_DURATION_MS);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [phase]);

  const onAnimationEnd = useCallback(
    (event: AnimationEvent<HTMLElement>) => {
      if (
        !isSidePanelExitAnimationFinished(
          event.animationName,
          event.target,
          event.currentTarget,
          phase
        )
      ) {
        return;
      }
      setPhase('closed');
    },
    [phase]
  );

  return {
    className: phase === 'exiting' ? SIDE_PANEL_EXIT_CLASS : SIDE_PANEL_ENTER_CLASS,
    isExiting: phase === 'exiting',
    mounted: phase !== 'closed',
    onAnimationEnd,
  };
}
