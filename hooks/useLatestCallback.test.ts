/** @vitest-environment jsdom */

import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useLatestCallback } from './useLatestCallback';

describe('useLatestCallback', () => {
  it('keeps one reference across renders and calls the latest callback', () => {
    const first = vi.fn(() => 'first');
    const second = vi.fn(() => 'second');
    const { result, rerender } = renderHook(({ callback }) => useLatestCallback(callback), {
      initialProps: { callback: first },
    });
    const initial = result.current;

    rerender({ callback: second });

    expect(result.current).toBe(initial);
    expect(result.current()).toBe('second');
    expect(first).not.toHaveBeenCalled();
  });
});
