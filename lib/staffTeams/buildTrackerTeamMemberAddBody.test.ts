import { describe, expect, it } from 'vitest';

import {
  buildTeamMemberAddRequestBody,
  buildTrackerTeamMemberAddBody,
} from './buildTrackerTeamMemberAddBody';

describe('buildTrackerTeamMemberAddBody', () => {
  it('returns null without tracker id or email', () => {
    expect(
      buildTrackerTeamMemberAddBody({
        trackerUserId: '',
        email: 'a@b.c',
      })
    ).toBeNull();
    expect(
      buildTrackerTeamMemberAddBody({
        trackerUserId: 'uid-1',
        email: '  ',
      })
    ).toBeNull();
    expect(
      buildTrackerTeamMemberAddBody({
        trackerUserId: 'uid-1',
        email: null,
      })
    ).toBeNull();
  });

  it('builds body like admin on-prem add', () => {
    expect(
      buildTrackerTeamMemberAddBody({
        trackerUserId: '  uid-1  ',
        email: '  user@example.com  ',
        displayName: '  Alice  ',
        roleSlug: '',
      })
    ).toEqual({
      tracker_user_id: 'uid-1',
      email: 'user@example.com',
      display_name: 'Alice',
      role_slug: null,
    });
  });

  it('omits display_name when empty and keeps role_slug', () => {
    expect(
      buildTrackerTeamMemberAddBody({
        trackerUserId: 'uid-1',
        email: 'user@example.com',
        displayName: '  ',
        roleSlug: 'developer',
      })
    ).toEqual({
      tracker_user_id: 'uid-1',
      email: 'user@example.com',
      role_slug: 'developer',
    });
  });
});

describe('buildTeamMemberAddRequestBody', () => {
  it('prefers staffUid for overseer.staff_teams', () => {
    expect(
      buildTeamMemberAddRequestBody({
        staffUid: '  22222222-2222-4222-8222-222222222222  ',
        trackerUserId: '1000000000000001',
        email: null,
      })
    ).toEqual({ staffUid: '22222222-2222-4222-8222-222222222222' });
  });

  it('falls back to tracker+email without staffUid', () => {
    expect(
      buildTeamMemberAddRequestBody({
        trackerUserId: 'uid-1',
        email: 'user@example.com',
      })
    ).toEqual({
      tracker_user_id: 'uid-1',
      email: 'user@example.com',
      role_slug: null,
    });
  });
});
