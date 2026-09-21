import { describe, expect, it } from 'vitest';

import { pickScreenFieldOptions } from './yandexTrackerProviderScreenFieldEnrichment';

describe('pickScreenFieldOptions', () => {
  it('prefers FixedList options when present', () => {
    expect(
      pickScreenFieldOptions({
        fieldId: 'priority',
        schema: {
          id: 'priority',
          optionsProvider: {
            type: 'FixedListOptionsProvider',
            values: ['normal', 'urgent'],
          },
          schema: { type: 'string' },
        },
        schemaType: 'string',
        resolutionOptions: [{ label: 'Решен', value: 'fixed' }],
      })
    ).toEqual(['normal', 'urgent']);
  });

  it('uses workflow resolutions for resolution fields', () => {
    expect(
      pickScreenFieldOptions({
        fieldId: 'resolution',
        schema: {
          id: 'resolution',
          schema: { type: 'resolution' },
        },
        schemaType: 'resolution',
        resolutionOptions: [
          { label: 'Решен', value: 'fixed' },
          { label: 'Не будет исправлено', value: 'wontFix' },
        ],
      })
    ).toEqual([
      { label: 'Решен', value: 'fixed' },
      { label: 'Не будет исправлено', value: 'wontFix' },
    ]);
  });
});
