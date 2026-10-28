/** @vitest-environment jsdom */

import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { usePopoverDismiss } from '@/hooks/usePopoverDismiss';

function press(target: Element, type: 'mousedown' | 'pointerdown' = 'pointerdown', button = 0): void {
  target.dispatchEvent(new MouseEvent(type, { bubbles: true, button }));
}

describe('usePopoverDismiss', () => {
  let inside: HTMLDivElement;
  let outside: HTMLDivElement;
  let submenu: HTMLDivElement;

  beforeEach(() => {
    inside = document.createElement('div');
    outside = document.createElement('div');
    submenu = document.createElement('div');
    submenu.dataset.submenu = 'true';
    submenu.appendChild(document.createElement('span'));
    document.body.append(inside, outside, submenu);
  });

  afterEach(() => {
    cleanup();
    document.body.replaceChildren();
  });

  it('dismisses on a press outside the refs and the ignored selector', () => {
    const onDismiss = vi.fn();
    renderHook(() =>
      usePopoverDismiss(onDismiss, {
        enabled: true,
        ignoreSelector: '[data-submenu="true"]',
        refs: [{ current: inside }],
      })
    );
    press(inside);
    press(submenu.firstElementChild!);
    expect(onDismiss).not.toHaveBeenCalled();
    press(outside);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('listens to the configured event only and skips non-primary buttons when asked', () => {
    const onDismiss = vi.fn();
    renderHook(() =>
      usePopoverDismiss(onDismiss, {
        enabled: true,
        event: 'mousedown',
        primaryButtonOnly: true,
        refs: [{ current: inside }],
      })
    );
    press(outside, 'pointerdown');
    press(outside, 'mousedown', 2);
    expect(onDismiss).not.toHaveBeenCalled();
    press(outside, 'mousedown');
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('does nothing while disabled and handles Escape only when enabled by option', () => {
    const onDismiss = vi.fn();
    const { rerender } = renderHook(
      ({ enabled, escape }: { enabled: boolean; escape: object | false }) =>
        usePopoverDismiss(onDismiss, { enabled, escape, refs: [{ current: inside }] }),
      { initialProps: { enabled: false, escape: {} as object | false } }
    );
    press(outside);
    document.body.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }));
    expect(onDismiss).not.toHaveBeenCalled();

    rerender({ enabled: true, escape: false });
    document.body.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }));
    expect(onDismiss).not.toHaveBeenCalled();

    rerender({ enabled: true, escape: {} });
    document.body.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
