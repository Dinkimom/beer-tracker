'use client';

import type { AnimationEvent } from 'react';

import { useCallback, useEffect, useState } from 'react';

export const OVERLAY_EXIT_DURATION_MS = 200;

const OVERLAY_EXIT_ANIMATION_NAMES = new Set([
  'overlay-dialog-exit',
  'overlay-fade-exit',
  'overlay-float-exit',
]);

type OverlayPhase = 'closed' | 'exiting' | 'open';

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function nextOverlayPhase(
  open: boolean,
  phase: OverlayPhase,
  reducedMotion: boolean
): OverlayPhase {
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

export function isOverlayExitAnimationFinished(
  animationName: string,
  eventTarget: EventTarget | null,
  currentTarget: EventTarget | null,
  phase: OverlayPhase
): boolean {
  return (
    phase === 'exiting' &&
    OVERLAY_EXIT_ANIMATION_NAMES.has(animationName) &&
    eventTarget === currentTarget
  );
}

export function overlayPresenceState(isExiting: boolean): 'closed' | 'open' {
  return isExiting ? 'closed' : 'open';
}

export function useOverlayPresence(open: boolean): {
  isExiting: boolean;
  mounted: boolean;
  onAnimationEnd: (event: AnimationEvent<HTMLElement>) => void;
  state: 'closed' | 'open';
} {
  const [phase, setPhase] = useState<OverlayPhase>(open ? 'open' : 'closed');
  const nextPhase = nextOverlayPhase(open, phase, prefersReducedMotion());
  if (nextPhase !== phase) {
    setPhase(nextPhase);
  }

  useEffect(() => {
    if (phase !== 'exiting') {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      setPhase((current) => (current === 'exiting' ? 'closed' : current));
    }, OVERLAY_EXIT_DURATION_MS);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [phase]);

  const onAnimationEnd = useCallback(
    (event: AnimationEvent<HTMLElement>) => {
      if (
        !isOverlayExitAnimationFinished(
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

  const isExiting = phase === 'exiting';
  return {
    isExiting,
    mounted: phase !== 'closed',
    onAnimationEnd,
    state: overlayPresenceState(isExiting),
  };
}

export function useDeferredOverlayClose(onClose: () => void): {
  isExiting: boolean;
  onAnimationEnd: (event: AnimationEvent<HTMLElement>) => void;
  requestClose: () => void;
  state: 'closed' | 'open';
} {
  const [open, setOpen] = useState(true);
  const presence = useOverlayPresence(open);

  const requestClose = useCallback(() => {
    setOpen(false);
  }, []);

  useEffect(() => {
    if (presence.mounted) {
      return;
    }
    onClose();
  }, [onClose, presence.mounted]);

  return {
    isExiting: presence.isExiting,
    onAnimationEnd: presence.onAnimationEnd,
    requestClose,
    state: presence.state,
  };
}
