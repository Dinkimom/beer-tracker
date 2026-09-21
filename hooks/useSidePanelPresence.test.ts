/** @vitest-environment jsdom */

import type { AnimationEvent } from 'react';

import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  isSidePanelExitAnimationFinished,
  nextSidePanelPhase,
  SIDE_PANEL_ENTER_CLASS,
  SIDE_PANEL_EXIT_ANIMATION,
  SIDE_PANEL_EXIT_CLASS,
  SIDE_PANEL_EXIT_DURATION_MS,
  useSidePanelPresence,
} from './useSidePanelPresence';

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

describe('nextSidePanelPhase', () => {
  it('opens from any phase', () => {
    expect(nextSidePanelPhase(true, 'closed', false)).toBe('open');
    expect(nextSidePanelPhase(true, 'exiting', false)).toBe('open');
  });

  it('starts the exit animation when closing', () => {
    expect(nextSidePanelPhase(false, 'open', false)).toBe('exiting');
  });

  it('unmounts immediately when motion is reduced', () => {
    expect(nextSidePanelPhase(false, 'open', true)).toBe('closed');
  });

  it('stays exiting until the animation finishes', () => {
    expect(nextSidePanelPhase(false, 'exiting', false)).toBe('exiting');
  });
});

describe('isSidePanelExitAnimationFinished', () => {
  const panel = {} as EventTarget;
  const child = {} as EventTarget;

  it('accepts the panel exit animation', () => {
    expect(isSidePanelExitAnimationFinished(SIDE_PANEL_EXIT_ANIMATION, panel, panel, 'exiting')).toBe(
      true
    );
  });

  it('ignores nested animations and the enter animation', () => {
    expect(isSidePanelExitAnimationFinished(SIDE_PANEL_EXIT_ANIMATION, child, panel, 'exiting')).toBe(
      false
    );
    expect(isSidePanelExitAnimationFinished('task-info-sidebar-enter', panel, panel, 'exiting')).toBe(
      false
    );
    expect(isSidePanelExitAnimationFinished(SIDE_PANEL_EXIT_ANIMATION, panel, panel, 'open')).toBe(
      false
    );
  });
});

describe('useSidePanelPresence', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('keeps the panel mounted with the exit class until animationend', () => {
    const { result, rerender } = renderHook(({ open }: { open: boolean }) => useSidePanelPresence(open), {
      initialProps: { open: true },
    });

    expect(result.current.mounted).toBe(true);
    expect(result.current.className).toBe(SIDE_PANEL_ENTER_CLASS);

    rerender({ open: false });
    expect(result.current.mounted).toBe(true);
    expect(result.current.isExiting).toBe(true);
    expect(result.current.className).toBe(SIDE_PANEL_EXIT_CLASS);

    const panel = document.createElement('div');
    act(() => {
      result.current.onAnimationEnd(animationEvent(SIDE_PANEL_EXIT_ANIMATION, panel, panel));
    });
    expect(result.current.mounted).toBe(false);
  });

  it('cancels exit when the panel is opened again', () => {
    const { result, rerender } = renderHook(({ open }: { open: boolean }) => useSidePanelPresence(open), {
      initialProps: { open: true },
    });

    rerender({ open: false });
    expect(result.current.isExiting).toBe(true);

    rerender({ open: true });
    expect(result.current.isExiting).toBe(false);
    expect(result.current.className).toBe(SIDE_PANEL_ENTER_CLASS);
    expect(result.current.mounted).toBe(true);
  });

  it('unmounts after the exit duration if animationend does not fire', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ open }: { open: boolean }) => useSidePanelPresence(open), {
      initialProps: { open: true },
    });

    rerender({ open: false });
    expect(result.current.mounted).toBe(true);

    act(() => {
      vi.advanceTimersByTime(SIDE_PANEL_EXIT_DURATION_MS);
    });
    expect(result.current.mounted).toBe(false);
  });
});
