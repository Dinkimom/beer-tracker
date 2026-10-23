/** @vitest-environment jsdom */

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SWIMLANE_HOVER_INTENT_MS } from '@/features/swimlane/utils/swimlaneHoverMotion';

import { useDelayedSwimlaneQuickAddHover } from './useDelayedSwimlaneQuickAddHover';

function enterAndWait(hover: { onPointerEnter: () => void }): void {
  act(() => {
    hover.onPointerEnter();
    vi.advanceTimersByTime(SWIMLANE_HOVER_INTENT_MS);
  });
}

describe('useDelayedSwimlaneQuickAddHover', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not show the plus when the pointer only passes through the cell', () => {
    const onHoverChange = vi.fn();
    const { result } = renderHook(() => useDelayedSwimlaneQuickAddHover(true, onHoverChange));

    act(() => {
      result.current.onPointerEnter();
      vi.advanceTimersByTime(SWIMLANE_HOVER_INTENT_MS - 1);
      result.current.onPointerLeave();
      vi.advanceTimersByTime(SWIMLANE_HOVER_INTENT_MS);
    });
    expect(result.current.isHovered).toBe(false);
    expect(onHoverChange).not.toHaveBeenCalled();
  });

  it('shows hover after the intent delay and clears it when the pointer leaves', () => {
    const onHoverChange = vi.fn();
    const { result } = renderHook(() => useDelayedSwimlaneQuickAddHover(true, onHoverChange));

    act(() => {
      result.current.onPointerEnter();
    });
    expect(result.current.isHovered).toBe(false);

    act(() => {
      vi.advanceTimersByTime(SWIMLANE_HOVER_INTENT_MS);
    });
    expect(result.current.isHovered).toBe(true);
    expect(onHoverChange).toHaveBeenCalledTimes(1);
    expect(onHoverChange).toHaveBeenCalledWith(true);

    act(() => {
      result.current.onPointerLeave();
    });
    expect(result.current.isHovered).toBe(false);
    expect(onHoverChange).toHaveBeenLastCalledWith(false);
  });

  it('does not fire when the control is disabled', () => {
    const onHoverChange = vi.fn();
    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) => useDelayedSwimlaneQuickAddHover(enabled, onHoverChange),
      { initialProps: { enabled: false } }
    );

    enterAndWait(result.current);
    expect(result.current.isHovered).toBe(false);
    expect(onHoverChange).not.toHaveBeenCalled();

    rerender({ enabled: true });
    enterAndWait(result.current);
    expect(result.current.isHovered).toBe(true);
    expect(onHoverChange).toHaveBeenCalledWith(true);
  });

  it('notifies hover end when the control is disabled after the plus is shown', () => {
    const onHoverChange = vi.fn();
    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) => useDelayedSwimlaneQuickAddHover(enabled, onHoverChange),
      { initialProps: { enabled: true } }
    );

    enterAndWait(result.current);
    expect(onHoverChange).toHaveBeenLastCalledWith(true);

    rerender({ enabled: false });
    expect(onHoverChange).toHaveBeenLastCalledWith(false);
  });

  it('clears hover with the last listener when disable also drops the callback', () => {
    const onHoverChange = vi.fn();
    const { result, rerender } = renderHook<
      ReturnType<typeof useDelayedSwimlaneQuickAddHover>,
      { enabled: boolean; onHoverChange?: (hovered: boolean) => void }
    >(
      ({ enabled, onHoverChange: onChange }) =>
        useDelayedSwimlaneQuickAddHover(enabled, onChange),
      { initialProps: { enabled: true, onHoverChange } }
    );

    enterAndWait(result.current);
    expect(onHoverChange).toHaveBeenLastCalledWith(true);

    rerender({ enabled: false, onHoverChange: undefined });
    expect(onHoverChange).toHaveBeenLastCalledWith(false);
  });

  it('notifies hover end when the hovered cell unmounts', () => {
    const onHoverChange = vi.fn();
    const { result, unmount } = renderHook(() =>
      useDelayedSwimlaneQuickAddHover(true, onHoverChange)
    );

    enterAndWait(result.current);
    expect(onHoverChange).toHaveBeenLastCalledWith(true);

    unmount();
    expect(onHoverChange).toHaveBeenLastCalledWith(false);
  });
});
