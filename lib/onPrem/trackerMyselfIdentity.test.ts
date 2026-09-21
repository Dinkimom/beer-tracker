import { describe, expect, it } from 'vitest';

import {
  trackerDisplayNameFromMyself,
  trackerIdentityCandidatesFromMyself,
  trackerWorkEmailFromMyself,
} from './trackerMyselfIdentity';

describe('trackerWorkEmailFromMyself', () => {
  it('returns normalized email', () => {
    expect(trackerWorkEmailFromMyself({ email: '  User@Example.COM  ' })).toBe('user@example.com');
  });

  it('prefers email over emailAddress', () => {
    expect(
      trackerWorkEmailFromMyself({ email: 'a@example.com', emailAddress: 'b@example.com' })
    ).toBe('a@example.com');
  });

  it('reads Jira emailAddress when email is absent', () => {
    expect(trackerWorkEmailFromMyself({ emailAddress: '  Ada@Jira.EXAMPLE  ' })).toBe(
      'ada@jira.example'
    );
  });

  it('returns null when missing or empty', () => {
    expect(trackerWorkEmailFromMyself(null)).toBeNull();
    expect(trackerWorkEmailFromMyself({})).toBeNull();
    expect(trackerWorkEmailFromMyself({ email: '   ' })).toBeNull();
    expect(trackerWorkEmailFromMyself({ email: 1 })).toBeNull();
    expect(trackerWorkEmailFromMyself({ emailAddress: '   ' })).toBeNull();
  });
});

describe('trackerDisplayNameFromMyself', () => {
  it('prefers display, then first+last, then email local part', () => {
    expect(trackerDisplayNameFromMyself({ display: '  Ada  ' }, 'ada@example.com')).toBe('Ada');
    expect(
      trackerDisplayNameFromMyself({ displayName: 'Ada Lovelace', firstName: 'A' }, 'x@y.z')
    ).toBe('Ada Lovelace');
    expect(
      trackerDisplayNameFromMyself({ firstName: 'Ada', lastName: 'Lovelace' }, 'x@y.z')
    ).toBe('Ada Lovelace');
    expect(trackerDisplayNameFromMyself({}, 'ada@example.com')).toBe('ada');
  });
});

describe('trackerIdentityCandidatesFromMyself', () => {
  it('returns string uid from numeric uid', () => {
    expect(trackerIdentityCandidatesFromMyself({ uid: 12345 })).toEqual(['12345']);
  });

  it('prefers uid over trackerUid when both present', () => {
    expect(trackerIdentityCandidatesFromMyself({ trackerUid: 9, uid: 42 })).toEqual(['42']);
  });

  it('returns trimmed string id', () => {
    expect(trackerIdentityCandidatesFromMyself({ id: '  y-user-1  ' })).toEqual(['y-user-1']);
  });

  it('returns empty for invalid input', () => {
    expect(trackerIdentityCandidatesFromMyself(null)).toEqual([]);
    expect(trackerIdentityCandidatesFromMyself({})).toEqual([]);
  });
});
