/** @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { bindPointerResizeGesture } from './bindPointerResizeGesture';

describe('bindPointerResizeGesture', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('commits on mouseup after the cancel window', () => {
    const onCancel = vi.fn();
    const onCommit = vi.fn();
    const onMove = vi.fn();

    bindPointerResizeGesture({ onCancel, onCommit, onMove });

    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 10 }));
    document.dispatchEvent(new MouseEvent('mouseup'));
    expect(onCommit).not.toHaveBeenCalled();

    vi.runAllTimers();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(onMove).toHaveBeenCalledOnce();
    expect(onCommit).toHaveBeenCalledOnce();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('cancels a mouseup when Escape arrives before the commit', () => {
    const onCancel = vi.fn();
    const onCommit = vi.fn();

    bindPointerResizeGesture({ onCancel, onCommit, onMove: () => {} });

    document.dispatchEvent(new MouseEvent('mouseup'));
    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    document.dispatchEvent(event);
    vi.runAllTimers();

    expect(event.defaultPrevented).toBe(true);
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('cancels on Escape and does not commit on the following mouseup', () => {
    const onCancel = vi.fn();
    const onCommit = vi.fn();
    const onMove = vi.fn();

    bindPointerResizeGesture({ onCancel, onCommit, onMove });

    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    document.dispatchEvent(event);
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 10 }));
    document.dispatchEvent(new MouseEvent('mouseup'));
    vi.runAllTimers();

    expect(event.defaultPrevented).toBe(true);
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onCommit).not.toHaveBeenCalled();
    expect(onMove).not.toHaveBeenCalled();
  });

  it('ignores keys other than Escape', () => {
    const onCancel = vi.fn();
    const onCommit = vi.fn();

    bindPointerResizeGesture({ onCancel, onCommit, onMove: () => {} });

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(onCancel).not.toHaveBeenCalled();
    expect(onCommit).not.toHaveBeenCalled();

    document.dispatchEvent(new MouseEvent('mouseup'));
    vi.runAllTimers();
    expect(onCommit).toHaveBeenCalledOnce();
  });
});
