import toast from 'react-hot-toast';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { copyTextToClipboard } from './copyToClipboard';

vi.mock('react-hot-toast', () => ({
  default: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe('copyTextToClipboard', () => {
  const writeText = vi.fn();

  beforeEach(() => {
    writeText.mockReset();
    vi.mocked(toast.success).mockReset();
    vi.mocked(toast.error).mockReset();
    vi.stubGlobal('navigator', { clipboard: { writeText } });
  });

  it('copies without a success toast when no message is passed', async () => {
    writeText.mockResolvedValue(undefined);

    await expect(copyTextToClipboard('hello')).resolves.toBe(true);

    expect(writeText).toHaveBeenCalledWith('hello');
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('shows a success toast when a message is passed', async () => {
    writeText.mockResolvedValue(undefined);

    await expect(copyTextToClipboard('hello', 'Copied')).resolves.toBe(true);

    expect(toast.success).toHaveBeenCalledWith('Copied');
  });

  it('shows an error toast and returns false when clipboard write fails', async () => {
    writeText.mockRejectedValue(new Error('denied'));

    await expect(copyTextToClipboard('hello')).resolves.toBe(false);

    expect(toast.error).toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });
});
