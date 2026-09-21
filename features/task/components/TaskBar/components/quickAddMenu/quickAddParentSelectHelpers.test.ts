import { describe, expect, it } from 'vitest';

import {
  formatQuickAddParentOptionLabel,
  hasLocalParentSelectMatch,
  mergeParentSelectOptions,
  parentSelectOptionMatchesQuery,
  withCurrentQuickAddParentOption,
} from './quickAddParentSelectHelpers';

describe('formatQuickAddParentOptionLabel', () => {
  it('joins key and display when they differ', () => {
    expect(formatQuickAddParentOptionLabel({ key: 'ST-1', display: 'Story', id: '1' })).toBe(
      'ST-1 — Story'
    );
  });

  it('returns key when display equals key', () => {
    expect(formatQuickAddParentOptionLabel({ key: 'ST-1', display: 'ST-1', id: '1' })).toBe(
      'ST-1'
    );
  });

  it('shows only the draft feature name, not the raw row id', () => {
    expect(
      formatQuickAddParentOptionLabel({
        key: 'feature-draft:44e9e9a0-1',
        display: 'Пупи',
        id: 'feature-draft:44e9e9a0-1',
      })
    ).toBe('Пупи');
  });

  it('does not use a raw feature-draft id as the option label', () => {
    expect(
      formatQuickAddParentOptionLabel({
        key: 'feature-draft:1',
        display: 'feature-draft:1',
        id: 'feature-draft:1',
      })
    ).toBe('');
  });

  it('looks up the draft title when the stored display is the row id', () => {
    expect(
      formatQuickAddParentOptionLabel(
        {
          key: 'feature-draft:1',
          display: 'feature-draft:1',
          id: 'feature-draft:1',
        },
        new Map([['feature-draft:1', 'Пупи']])
      )
    ).toBe('Пупи');
  });
});

describe('parentSelectOptionMatchesQuery', () => {
  it('matches by label or value', () => {
    const option = { label: 'ST-1 — Story One', value: 'ST-1' };
    expect(parentSelectOptionMatchesQuery(option, 'story')).toBe(true);
    expect(parentSelectOptionMatchesQuery(option, 'st-1')).toBe(true);
    expect(parentSelectOptionMatchesQuery(option, 'missing')).toBe(false);
  });
});

describe('hasLocalParentSelectMatch', () => {
  const options = [
    { label: 'Без родителя', value: '' },
    { label: 'ST-1 — Story', value: 'ST-1' },
  ];

  it('is true for empty query', () => {
    expect(hasLocalParentSelectMatch(options, '  ')).toBe(true);
  });

  it('is true when local options match', () => {
    expect(hasLocalParentSelectMatch(options, 'ST-1')).toBe(true);
  });

  it('is false when nothing local matches', () => {
    expect(hasLocalParentSelectMatch(options, 'CM-999')).toBe(false);
  });
});

describe('mergeParentSelectOptions', () => {
  it('appends active remote options and keeps selected remote parent', () => {
    const remoteByKey = new Map([
      ['CM-1', { label: 'CM-1 — Remote', value: 'CM-1' }],
      ['CM-2', { label: 'CM-2 — Other', value: 'CM-2' }],
    ]);

    expect(
      mergeParentSelectOptions({
        activeRemoteKeys: ['CM-1'],
        baseOptions: [{ label: 'Без родителя', value: '' }],
        parentKey: 'CM-2',
        remoteByKey,
      })
    ).toEqual([
      { label: 'Без родителя', value: '' },
      { label: 'CM-1 — Remote', value: 'CM-1' },
      { label: 'CM-2 — Other', value: 'CM-2' },
    ]);
  });

  it('does not duplicate keys already present in base options', () => {
    expect(
      mergeParentSelectOptions({
        activeRemoteKeys: ['ST-1'],
        baseOptions: [
          { label: 'Без родителя', value: '' },
          { label: 'ST-1 — Local', value: 'ST-1' },
        ],
        parentKey: '',
        remoteByKey: new Map([['ST-1', { label: 'ST-1 — Remote', value: 'ST-1' }]]),
      })
    ).toEqual([
      { label: 'Без родителя', value: '' },
      { label: 'ST-1 — Local', value: 'ST-1' },
    ]);
  });

  it('does not inject a raw feature-draft row id without a display name', () => {
    expect(
      mergeParentSelectOptions({
        activeRemoteKeys: [],
        baseOptions: [{ label: 'Без родителя', value: '' }],
        parentKey: 'feature-draft:44e9e9a0-1',
        remoteByKey: new Map(),
      })
    ).toEqual([{ label: 'Без родителя', value: '' }]);
  });
});

describe('withCurrentQuickAddParentOption', () => {
  it('adds the current draft parent under its display name', () => {
    expect(
      withCurrentQuickAddParentOption([{ label: 'Без родителя', value: '' }], {
        display: 'Пупи',
        id: 'feature-draft:1',
        key: 'feature-draft:1',
      })
    ).toEqual([
      { label: 'Без родителя', value: '' },
      { label: 'Пупи', value: 'feature-draft:1' },
    ]);
  });

  it('does not add a nameless feature-draft parent', () => {
    expect(
      withCurrentQuickAddParentOption([{ label: 'Без родителя', value: '' }], {
        display: 'feature-draft:1',
        id: 'feature-draft:1',
        key: 'feature-draft:1',
      })
    ).toEqual([{ label: 'Без родителя', value: '' }]);
  });

  it('adds the current draft parent under the looked-up name', () => {
    expect(
      withCurrentQuickAddParentOption(
        [{ label: 'Без родителя', value: '' }],
        {
          display: 'feature-draft:1',
          id: 'feature-draft:1',
          key: 'feature-draft:1',
        },
        new Map([['feature-draft:1', 'Пупи']])
      )
    ).toEqual([
      { label: 'Без родителя', value: '' },
      { label: 'Пупи', value: 'feature-draft:1' },
    ]);
  });
});
