/** @vitest-environment jsdom */

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SearchInput } from './SearchInput';

vi.mock('@/contexts/LanguageContext', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

afterEach(cleanup);

describe('SearchInput', () => {
  it('keeps the md clear control smaller than the field', () => {
    render(<SearchInput size="md" value="TTT" onChange={() => undefined} />);
    const clear = screen.getByRole('button', { name: 'common.clearSearch' });
    expect(clear.className).toContain('h-6');
    expect(clear.className).toContain('w-6');
    expect(clear.className).not.toMatch(/\bh-8\b/);
    expect(clear.className).not.toMatch(/\bw-8\b/);
  });

  it('keeps the sm clear control smaller than the field', () => {
    render(<SearchInput size="sm" value="TTT" onChange={() => undefined} />);
    const clear = screen.getByRole('button', { name: 'common.clearSearch' });
    expect(clear.className).toContain('h-5');
    expect(clear.className).toContain('w-5');
    expect(clear.className).not.toMatch(/\bh-8\b/);
  });

  it('hides the clear control when the field is empty', () => {
    render(<SearchInput value="" onChange={() => undefined} />);
    expect(screen.queryByRole('button', { name: 'common.clearSearch' })).toBeNull();
  });

  it('uses a lens fill on glass and a solid fill otherwise', () => {
    const { rerender } = render(<SearchInput surface="glass" value="" onChange={() => undefined} />);
    const glass = screen.getByRole('textbox');
    expect(glass.className).toContain('bg-black/[0.03]');
    expect(glass.className).not.toContain('bg-white/90');
    expect(glass.className).not.toContain('dark:bg-gray-700');

    rerender(<SearchInput value="" onChange={() => undefined} />);
    expect(screen.getByRole('textbox').className).toContain('dark:bg-gray-700');
  });
});
