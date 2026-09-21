/** @vitest-environment jsdom */

import type { AnimationEvent } from 'react';

import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  isOverlayExitAnimationFinished,
  nextOverlayPhase,
  OVERLAY_EXIT_DURATION_MS,
  overlayPresenceState,
  useDeferredOverlayClose,
  useOverlayPresence,
} from './useOverlayPresence';

function animationEvent(
  animationName: string,
  target: EventTarget,
  currentTarget: EventTarget
): AnimationEvent<HTMLElement> {
  return {
    animationName,
    currentTarget,
    target,
  } as AnimationEvent<HTMLElement>;
}

describe('nextOverlayPhase', () => {
  it('opens from any phase', () => {
    expect(nextOverlayPhase(true, 'closed', false)).toBe('open');
    expect(nextOverlayPhase(true, 'exiting', false)).toBe('open');
  });

  it('starts the exit animation when closing', () => {
    expect(nextOverlayPhase(false, 'open', false)).toBe('exiting');
  });

  it('unmounts immediately when motion is reduced', () => {
    expect(nextOverlayPhase(false, 'open', true)).toBe('closed');
  });

  it('stays exiting until the animation finishes', () => {
    expect(nextOverlayPhase(false, 'exiting', false)).toBe('exiting');
  });
});

describe('isOverlayExitAnimationFinished', () => {
  const panel = {} as EventTarget;
  const child = {} as EventTarget;

  it('accepts overlay exit animations', () => {
    expect(isOverlayExitAnimationFinished('overlay-float-exit', panel, panel, 'exiting')).toBe(
      true
    );
    expect(isOverlayExitAnimationFinished('overlay-fade-exit', panel, panel, 'exiting')).toBe(true);
    expect(
      isOverlayExitAnimationFinished('overlay-tooltip-exit-down', panel, panel, 'exiting')
    ).toBe(true);
    expect(isOverlayExitAnimationFinished('overlay-tooltip-exit-up', panel, panel, 'exiting')).toBe(
      true
    );
  });

  it('ignores nested animations and the enter animation', () => {
    expect(isOverlayExitAnimationFinished('overlay-float-exit', child, panel, 'exiting')).toBe(
      false
    );
    expect(isOverlayExitAnimationFinished('overlay-float-enter', panel, panel, 'exiting')).toBe(
      false
    );
    expect(isOverlayExitAnimationFinished('overlay-float-exit', panel, panel, 'open')).toBe(false);
  });
});

describe('overlayPresenceState', () => {
  it('maps exiting to the closed data-state', () => {
    expect(overlayPresenceState(true)).toBe('closed');
    expect(overlayPresenceState(false)).toBe('open');
  });
});

describe('useOverlayPresence', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('keeps the overlay mounted until animationend', () => {
    const { result, rerender } = renderHook(
      ({ open }: { open: boolean }) => useOverlayPresence(open),
      { initialProps: { open: true } }
    );

    expect(result.current.mounted).toBe(true);
    expect(result.current.state).toBe('open');

    rerender({ open: false });
    expect(result.current.mounted).toBe(true);
    expect(result.current.isExiting).toBe(true);
    expect(result.current.state).toBe('closed');

    const panel = document.createElement('div');
    act(() => {
      result.current.onAnimationEnd(animationEvent('overlay-float-exit', panel, panel));
    });
    expect(result.current.mounted).toBe(false);
  });

  it('cancels exit when the overlay is opened again', () => {
    const { result, rerender } = renderHook(
      ({ open }: { open: boolean }) => useOverlayPresence(open),
      { initialProps: { open: true } }
    );

    rerender({ open: false });
    expect(result.current.isExiting).toBe(true);

    rerender({ open: true });
    expect(result.current.isExiting).toBe(false);
    expect(result.current.state).toBe('open');
    expect(result.current.mounted).toBe(true);
  });

  it('unmounts after the exit duration if animationend does not fire', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ open }: { open: boolean }) => useOverlayPresence(open),
      { initialProps: { open: true } }
    );

    rerender({ open: false });
    expect(result.current.mounted).toBe(true);

    act(() => {
      vi.advanceTimersByTime(OVERLAY_EXIT_DURATION_MS);
    });
    expect(result.current.mounted).toBe(false);
  });
});

describe('useDeferredOverlayClose', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls onClose only after the exit animation', () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    const { result } = renderHook(() => useDeferredOverlayClose(onClose));

    expect(result.current.state).toBe('open');
    expect(onClose).not.toHaveBeenCalled();

    act(() => {
      result.current.requestClose();
    });
    expect(result.current.state).toBe('closed');
    expect(onClose).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(OVERLAY_EXIT_DURATION_MS);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
