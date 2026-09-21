import { describe, expect, it } from 'vitest';

import {
  decodeMultiUserFieldValue,
  encodeMultiUserFieldValue,
  mergeLoadedMultiUsers,
  toggleMultiUserSelection,
} from './multiUserSelectorHelpers';

describe('multiUserSelectorHelpers', () => {
  it('encodes and decodes tracker ids', () => {
    expect(encodeMultiUserFieldValue(['a', 'b'])).toBe('a,b');
    expect(decodeMultiUserFieldValue('a,b,a, ,c')).toEqual(['a', 'b', 'c']);
    expect(decodeMultiUserFieldValue('')).toEqual([]);
  });

  it('toggles selection', () => {
    expect(toggleMultiUserSelection(['a'], 'b')).toEqual(['a', 'b']);
    expect(toggleMultiUserSelection(['a', 'b'], 'a')).toEqual(['b']);
  });

  it('merges loaded users in selected order', () => {
    expect(
      mergeLoadedMultiUsers(
        [{ trackerId: 'a', displayName: 'A' }],
        [{ trackerId: 'b', displayName: 'B' }, null],
        ['b', 'a']
      )
    ).toEqual([
      { trackerId: 'b', displayName: 'B' },
      { trackerId: 'a', displayName: 'A' },
    ]);
  });
});
