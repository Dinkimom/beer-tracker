import { describe, expect, it } from 'vitest';

import {
  COMMENT_AUTHOR_DISPLAY_NAME_SQL,
  STAFF_AUTHOR_DISPLAY_NAME_SQL,
  collectCommentAuthorIds,
  formatCommentAuthorDisplayName,
  mergeCommentAuthorNames,
  parseCommentAuthorName,
} from './commentAuthor';

describe('formatCommentAuthorDisplayName', () => {
  it('prefers first and last name without patronymic', () => {
    expect(
      formatCommentAuthorDisplayName({
        email: 'a@example.com',
        fullName: 'Иванов Иван Иванович',
        name: 'Иван',
        surname: 'Иванов',
      })
    ).toBe('Иван Иванов');
  });

  it('falls back to full name, then email', () => {
    expect(
      formatCommentAuthorDisplayName({
        email: 'a@example.com',
        fullName: 'Иван Иванов',
        name: '  ',
        surname: null,
      })
    ).toBe('Иван Иванов');
    expect(
      formatCommentAuthorDisplayName({
        email: 'a@example.com',
        fullName: '  ',
        name: null,
        surname: null,
      })
    ).toBe('a@example.com');
  });

  it('returns null when nothing usable is present', () => {
    expect(formatCommentAuthorDisplayName({})).toBeNull();
    expect(formatCommentAuthorDisplayName({ email: '  ', fullName: '' })).toBeNull();
  });

  it('keeps the SQL projection aligned with first+last, then fullname, then email', () => {
    expect(COMMENT_AUTHOR_DISPLAY_NAME_SQL).toContain('re.name');
    expect(COMMENT_AUTHOR_DISPLAY_NAME_SQL).toContain('re.surname');
    expect(COMMENT_AUTHOR_DISPLAY_NAME_SQL).toContain('re.fullname');
    expect(COMMENT_AUTHOR_DISPLAY_NAME_SQL).toContain('re.email');
  });

  it('keeps native staff author SQL on display_name then email', () => {
    expect(STAFF_AUTHOR_DISPLAY_NAME_SQL).toContain('s.display_name');
    expect(STAFF_AUTHOR_DISPLAY_NAME_SQL).toContain('s.email');
  });
});

describe('parseCommentAuthorName', () => {
  it('trims a non-empty name and drops blanks', () => {
    expect(parseCommentAuthorName('  Иван  ')).toBe('Иван');
    expect(parseCommentAuthorName('   ')).toBeUndefined();
    expect(parseCommentAuthorName(null)).toBeUndefined();
  });
});

describe('collectCommentAuthorIds', () => {
  it('returns unique trimmed created_by values', () => {
    expect(
      collectCommentAuthorIds([
        { created_by: '  user-1  ' },
        { created_by: 'user-1' },
        { created_by: null },
        { created_by: 'user-2' },
        {},
      ])
    ).toEqual(['user-1', 'user-2']);
  });
});

describe('mergeCommentAuthorNames', () => {
  it('fills author_name from created_by and leaves others null', () => {
    expect(
      mergeCommentAuthorNames(
        [
          { created_by: 'user-1', id: 'c1' },
          { created_by: 'user-missing', id: 'c2' },
          { created_by: null, id: 'c3' },
        ],
        { 'user-1': 'Иван Иванов' }
      )
    ).toEqual([
      { author_name: 'Иван Иванов', created_by: 'user-1', id: 'c1' },
      { author_name: null, created_by: 'user-missing', id: 'c2' },
      { author_name: null, created_by: null, id: 'c3' },
    ]);
  });
});
