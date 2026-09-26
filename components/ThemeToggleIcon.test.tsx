/** @vitest-environment jsdom */

import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ThemeToggleIcon } from './ThemeToggleIcon';

function renderIcon(theme: 'dark' | 'light') {
  return (
    <button type="button">
      <ThemeToggleIcon theme={theme} />
    </button>
  );
}

describe('ThemeToggleIcon', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('crossfades both glyphs when the theme changes', () => {
    const { container, rerender } = render(renderIcon('light'));
    const icon = () => container.querySelector('.theme-toggle-icon');
    expect(icon()?.querySelectorAll('svg')).toHaveLength(2);
    expect(icon()?.classList.contains('theme-toggle-icon--play')).toBe(false);

    rerender(renderIcon('dark'));
    expect(icon()?.classList.contains('theme-toggle-icon--play')).toBe(true);
    expect(icon()?.getAttribute('data-theme')).toBe('dark');
  });

  it('swaps without motion when reduced motion is requested', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    const { container, rerender } = render(renderIcon('light'));
    rerender(renderIcon('dark'));
    expect(container.querySelector('.theme-toggle-icon')?.classList.contains('theme-toggle-icon--play')).toBe(
      false
    );
  });
});
