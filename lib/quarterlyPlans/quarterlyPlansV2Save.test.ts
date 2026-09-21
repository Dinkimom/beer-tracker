import { describe, expect, it } from 'vitest';

import { dedupeEpicKeysForSave } from './quarterlyPlansV2Save';

describe('dedupeEpicKeysForSave', () => {
  it('preserves order and removes duplicates', () => {
    expect(dedupeEpicKeysForSave(['NW-1', 'NW-2', 'NW-1', '  ', 'NW-3', 'NW-2'])).toEqual([
      'NW-1',
      'NW-2',
      'NW-3',
    ]);
  });

  it('trims keys', () => {
    expect(dedupeEpicKeysForSave(['  NW-6932  ', 'NW-6932'])).toEqual(['NW-6932']);
  });

  it('dedupes case-insensitively', () => {
    expect(dedupeEpicKeysForSave(['nw-6932', 'NW-6932'])).toEqual(['nw-6932']);
  });
});
