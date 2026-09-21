/** @vitest-environment jsdom */

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { COPY_FEEDBACK_MS, useCopyFeedback } from './useCopyFeedback';

vi.mock('@/utils/copyToClipboard', () => ({
  copyTextToClipboard: vi.fn(),
}));

import { copyTextToClipboard } from '@/utils/copyToClipboard';

const copyTextToClipboardMock = vi.mocked(copyTextToClipboard);

describe('useCopyFeedback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    copyTextToClipboardMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sets copied after a successful copy and clears after the timeout', async () => {
    copyTextToClipboardMock.mockResolvedValue(true);
    const { result } = renderHook(() => useCopyFeedback());

    expect(result.current.copied).toBe(false);

    await act(async () => {
      await expect(result.current.copy('https://example.com/task')).resolves.toBe(true);
    });

    expect(result.current.copied).toBe(true);

    act(() => {
      vi.advanceTimersByTime(COPY_FEEDBACK_MS);
    });

    expect(result.current.copied).toBe(false);
  });

  it('does not show copied state when clipboard write fails', async () => {
    copyTextToClipboardMock.mockResolvedValue(false);
    const { result } = renderHook(() => useCopyFeedback());

    await act(async () => {
      await expect(result.current.copy('fail')).resolves.toBe(false);
    });

    expect(result.current.copied).toBe(false);
  });
});
