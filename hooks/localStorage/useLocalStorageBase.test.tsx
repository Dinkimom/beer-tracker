/** @vitest-environment jsdom */

import { act, cleanup, render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { useLocalStorage } from './useLocalStorageBase';

const KEY = 'use-local-storage-base-test';

/** Как шапка с гирляндой: вложенный потребитель монтируется, только пока флаг включён. */
function Probe({ nested = false }: { nested?: boolean }) {
  const [enabled, setEnabled] = useLocalStorage(KEY, true);
  if (nested) return <span data-testid="reader">{String(enabled)}</span>;
  return (
    <>
      <button type="button" onClick={() => setEnabled(!enabled)}>
        toggle
      </button>
      <span data-testid="toggle">{String(enabled)}</span>
      {enabled ? <Probe nested /> : null}
    </>
  );
}

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('useLocalStorage', () => {
  it('turns a flag back on when a consumer mounts together with it', () => {
    render(
      <StrictMode>
        <Probe />
      </StrictMode>
    );

    act(() => screen.getByRole('button').click());
    expect(screen.getByTestId('toggle').textContent).toBe('false');
    expect(localStorage.getItem(KEY)).toBe('false');

    act(() => screen.getByRole('button').click());
    expect(screen.getByTestId('toggle').textContent).toBe('true');
    expect(screen.getByTestId('reader').textContent).toBe('true');
    expect(localStorage.getItem(KEY)).toBe('true');
  });

  it('does not write the default on mount', () => {
    render(<Probe nested />);
    expect(localStorage.getItem(KEY)).toBeNull();
  });
});
