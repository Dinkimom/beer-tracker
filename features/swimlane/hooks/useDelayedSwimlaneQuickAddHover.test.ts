/** @vitest-environment jsdom */

import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useDelayedSwimlaneQuickAddHover } from './useDelayedSwimlaneQuickAddHover';

describe('useDelayedSwimlaneQuickAddHover', () => {
  it('shows hover immediately and clears it when the pointer leaves', () => {
    const onHoverChange = vi.fn();
    const { result } = renderHook(() => useDelayedSwimlaneQuickAddHover(true, onHoverChange));

    act(() => {
      result.current.onPointerEnter();
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

    act(() => {
      result.current.onPointerEnter();
    });
    expect(result.current.isHovered).toBe(false);
    expect(onHoverChange).not.toHaveBeenCalled();

    rerender({ enabled: true });
    act(() => {
      result.current.onPointerEnter();
    });
    expect(result.current.isHovered).toBe(true);
    expect(onHoverChange).toHaveBeenCalledWith(true);
  });

  it('notifies hover end when the control is disabled after the plus is shown', () => {
    const onHoverChange = vi.fn();
    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) => useDelayedSwimlaneQuickAddHover(enabled, onHoverChange),
      { initialProps: { enabled: true } }
    );

    act(() => {
      result.current.onPointerEnter();
    });
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

    act(() => {
      result.current.onPointerEnter();
    });
    expect(onHoverChange).toHaveBeenLastCalledWith(true);

    rerender({ enabled: false, onHoverChange: undefined });
    expect(onHoverChange).toHaveBeenLastCalledWith(false);
  });

  it('notifies hover end when the hovered cell unmounts', () => {
    const onHoverChange = vi.fn();
    const { result, unmount } = renderHook(() =>
      useDelayedSwimlaneQuickAddHover(true, onHoverChange)
    );

    act(() => {
      result.current.onPointerEnter();
    });
    expect(onHoverChange).toHaveBeenLastCalledWith(true);

    unmount();
    expect(onHoverChange).toHaveBeenLastCalledWith(false);
  });
});
