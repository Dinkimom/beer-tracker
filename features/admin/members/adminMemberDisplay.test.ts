import { describe, expect, it } from 'vitest';

import {
  memberDisplayName,
  memberInitials,
  memberMatchesListQuery,
  sortMembersByDisplayName,
} from './adminMemberDisplay';

const baseRow = {
  avatar_link: null,
  email: null,
  employee_id: 'id-1',
  fired_date: null,
  full_name: null,
  is_org_admin: false,
  name: null,
  patronymic: null,
  staff_uid: 'id-1',
  status: null,
  surname: null,
  teams: [],
  tracker_id: null,
};

describe('adminMemberDisplay', () => {
  it('prefers full_name then composed parts then tracker id', () => {
    expect(memberDisplayName({ ...baseRow, full_name: 'Ada Lovelace' })).toBe('Ada Lovelace');
    expect(memberDisplayName({ ...baseRow, name: 'Ada', surname: 'Lovelace' })).toBe('Lovelace Ada');
    expect(memberDisplayName({ ...baseRow, tracker_id: 'jira-acc-1' })).toBe('jira-acc-1');
    expect(memberDisplayName({ ...baseRow, email: 'ada@example.com' })).toBe('id-1');
  });

  it('builds initials from the display name', () => {
    expect(memberInitials({ ...baseRow, full_name: 'Ada Lovelace' })).toBe('AL');
    expect(memberInitials({ ...baseRow, full_name: 'Ada' })).toBe('A');
  });

  it('sorts by display name', () => {
    const sorted = sortMembersByDisplayName([
      { ...baseRow, staff_uid: 'b', employee_id: 'b', full_name: 'Борис' },
      { ...baseRow, staff_uid: 'a', employee_id: 'a', full_name: 'Анна' },
    ]);
    expect(sorted.map((row) => row.staff_uid)).toEqual(['a', 'b']);
  });

  it('matches list query by display name tokens and tracker id', () => {
    const row = {
      ...baseRow,
      full_name: 'Полина Наконечная',
      tracker_id: 'acc-polina-1',
    };
    expect(memberMatchesListQuery(row, '')).toBe(true);
    expect(memberMatchesListQuery(row, 'Наконечная')).toBe(true);
    expect(memberMatchesListQuery(row, 'Полина Наконечная')).toBe(true);
    expect(memberMatchesListQuery(row, 'наконечная полина')).toBe(true);
    expect(memberMatchesListQuery(row, 'acc-polina')).toBe(true);
    expect(memberMatchesListQuery(row, 'Иванов')).toBe(false);
  });
});
