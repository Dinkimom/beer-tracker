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
});
