import { describe, expect, it } from 'vitest';

import {
  DEFAULT_LANGUAGE,
  resolveLanguageForHydration,
} from '@/lib/i18n/model';

describe('resolveLanguageForHydration', () => {
  it('uses the default language before hydration so SSR matches the first client pass', () => {
    expect(resolveLanguageForHydration('en', false)).toBe(DEFAULT_LANGUAGE);
  });

  it('uses the stored language after hydration', () => {
    expect(resolveLanguageForHydration('en', true)).toBe('en');
    expect(resolveLanguageForHydration('ru', true)).toBe('ru');
  });
});
