import { describe, expect, it } from 'vitest';

import {
  memberDisplayName,
  memberInitials,
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
  it('prefers full_name then composed parts then email', () => {
    expect(memberDisplayName({ ...baseRow, full_name: 'Ada Lovelace' })).toBe('Ada Lovelace');
    expect(memberDisplayName({ ...baseRow, name: 'Ada', surname: 'Lovelace' })).toBe('Lovelace Ada');
    expect(memberDisplayName({ ...baseRow, email: 'ada@example.com' })).toBe('ada@example.com');
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
});
