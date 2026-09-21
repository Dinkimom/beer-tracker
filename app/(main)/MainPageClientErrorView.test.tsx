/** @vitest-environment jsdom */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MainPageClientErrorView } from './MainPageClientErrorView';

const messages: Record<string, string> = {
  'sprint.errors.loadFailedPrefix': 'Loading error:',
  'sprint.errors.retry': 'Reload',
  'sprint.errors.retryHint': 'Check your connection, then reload.',
};

function t(key: string) {
  return messages[key] ?? key;
}

describe('MainPageClientErrorView', () => {
  it('reloads when the user clicks the retry button', () => {
    const onRetry = vi.fn();
    render(<MainPageClientErrorView error="timeout exceeded" t={t} onRetry={onRetry} />);

    fireEvent.click(screen.getByRole('button', { name: 'Reload' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Loading error: timeout exceeded')).toBeTruthy();
  });

  it('reloads when the network comes back', () => {
    const onRetry = vi.fn();
    render(<MainPageClientErrorView error="timeout exceeded" t={t} onRetry={onRetry} />);

    fireEvent(window, new Event('online'));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
