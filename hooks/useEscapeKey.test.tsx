/** @vitest-environment jsdom */

import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useEscapeKey } from '@/hooks/useEscapeKey';

function pressKey(key: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key });
  document.body.dispatchEvent(event);
  return event;
}

describe('useEscapeKey', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('calls back on Escape only', () => {
    const onEscape = vi.fn();
    renderHook(() => useEscapeKey(onEscape));
    pressKey('Enter');
    expect(onEscape).not.toHaveBeenCalled();
    const event = pressKey('Escape');
    expect(onEscape).toHaveBeenCalledWith(event);
    expect(event.defaultPrevented).toBe(false);
  });

  it('does not listen while disabled', () => {
    const onEscape = vi.fn();
    const { rerender } = renderHook(({ enabled }) => useEscapeKey(onEscape, { enabled }), {
      initialProps: { enabled: false },
    });
    pressKey('Escape');
    expect(onEscape).not.toHaveBeenCalled();
    rerender({ enabled: true });
    pressKey('Escape');
    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it('prevents default and keeps a document listener from reaching window', () => {
    const onWindow = vi.fn();
    const onDocument = vi.fn();
    renderHook(() => useEscapeKey(onWindow));
    renderHook(() =>
      useEscapeKey(onDocument, { preventDefault: true, stopPropagation: true, target: 'document' })
    );
    const event = pressKey('Escape');
    expect(onDocument).toHaveBeenCalledTimes(1);
    expect(onWindow).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
  });

  it('uses the latest callback without resubscribing', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(({ cb }) => useEscapeKey(cb), { initialProps: { cb: first } });
    const remove = vi.spyOn(window, 'removeEventListener');
    rerender({ cb: second });
    expect(remove).not.toHaveBeenCalled();
    pressKey('Escape');
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
