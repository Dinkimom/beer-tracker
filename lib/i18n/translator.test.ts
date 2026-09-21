import { describe, expect, it } from 'vitest';

import { hasTranslation, translate } from '@/lib/i18n/translator';

describe('translate', () => {
  it('resolves nested keys for English and Russian', () => {
    expect(translate('en', 'common.loading')).toBe('Loading...');
    expect(translate('ru', 'common.loading')).toBe('Загрузка...');
  });

  it('supports interpolation placeholders', () => {
    expect(translate('en', 'burndown.remainingSp', { value: 12 })).toBe('Remaining: 12 SP');
    expect(translate('ru', 'burndown.remainingSp', { value: 12 })).toBe('Осталось: 12 SP');
  });

  it('returns a safe fallback string for unknown keys', () => {
    const text = translate('en', 'this.key.does.not.exist');
    expect(text).toBe('Translation unavailable');
    expect(text).not.toContain('this.key');
  });
});

describe('hasTranslation', () => {
  it('returns true when the selected language contains the key', () => {
    expect(hasTranslation('en', 'common.loading')).toBe(true);
  });

  it('returns false for unknown keys', () => {
    expect(hasTranslation('en', 'this.key.does.not.exist')).toBe(false);
  });
});
