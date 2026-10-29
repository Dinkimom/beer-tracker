import { describe, expect, it } from 'vitest';

import { customFieldDisplayMap, customFieldDisplayValue, customFieldTaskFields } from './customFieldDisplayValue';

describe('customFieldDisplayValue', () => {
  it('reads strings, numbers and named objects', () => {
    expect(customFieldDisplayValue(' Northwind ')).toBe('Northwind');
    expect(customFieldDisplayValue(8)).toBe('8');
    expect(customFieldDisplayValue({ display: 'Booking' })).toBe('Booking');
    expect(customFieldDisplayValue({ key: 'high' })).toBe('high');
    expect(customFieldDisplayValue({ id: '1', value: 'Yes' })).toBe('Yes');
  });

  it('reads Jira users by display name, also in arrays', () => {
    expect(customFieldDisplayValue({ accountId: 'acc-1', displayName: 'Ada Lovelace' })).toBe('Ada Lovelace');
    expect(customFieldDisplayValue({ displayName: 'Grace Hopper', name: 'ghopper' })).toBe('Grace Hopper');
    expect(
      customFieldDisplayValue([
        { accountId: 'acc-1', displayName: 'Ada Lovelace' },
        { accountId: 'acc-2', displayName: 'Grace Hopper' },
      ])
    ).toBe('Ada Lovelace, Grace Hopper');
  });

  it('joins arrays and skips empty values', () => {
    expect(customFieldDisplayValue([{ display: 'Ada' }, { name: 'Grace' }])).toBe('Ada, Grace');
    expect(customFieldDisplayValue('')).toBeNull();
    expect(customFieldDisplayValue({})).toBeNull();
    expect(customFieldDisplayValue(null)).toBeNull();
  });
});

describe('customFieldDisplayMap', () => {
  it('keeps only fields that have a display value', () => {
    expect(
      customFieldDisplayMap({
        customer: { display: 'Northwind' },
        empty: '',
        points: 3,
      })
    ).toEqual({
      customer: 'Northwind',
      points: '3',
    });
    expect(customFieldDisplayMap(undefined)).toBeUndefined();
  });
});

describe('customFieldTaskFields', () => {
  it('keeps users of Jira and Yandex user fields next to their text', () => {
    expect(
      customFieldTaskFields({
        customer: { display: 'Northwind' },
        reviewers: [
          { accountId: 'acc-1', displayName: 'Ada Lovelace' },
          { accountId: 'acc-2', displayName: 'Grace Hopper' },
        ],
        watcher: { display: 'Alan Turing', id: '42', self: 'https://api.tracker.yandex.net/v3/users/42' },
      })
    ).toEqual({
      customFieldUsers: {
        reviewers: [
          { id: 'acc-1', name: 'Ada Lovelace' },
          { id: 'acc-2', name: 'Grace Hopper' },
        ],
        watcher: [{ id: '42', name: 'Alan Turing' }],
      },
      customFieldValues: {
        customer: 'Northwind',
        reviewers: 'Ada Lovelace, Grace Hopper',
        watcher: 'Alan Turing',
      },
    });
  });

  it('treats a list with anything but users as plain text', () => {
    expect(
      customFieldTaskFields({ mixed: [{ accountId: 'acc-1', displayName: 'Ada' }, { value: 'Yes' }] })
    ).toEqual({ customFieldValues: { mixed: 'Ada, Yes' } });
    expect(customFieldTaskFields(undefined)).toEqual({});
  });
});
