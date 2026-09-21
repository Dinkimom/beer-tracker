import { describe, expect, it } from 'vitest';

import { TrackerApiConfigError } from '@/lib/trackerRequestConfig';

import { onPremRegisterIdentityFromMyself } from './onPremRegisterTrackerIdentity';

describe('onPremRegisterIdentityFromMyself', () => {
  it('maps tracker /myself to staff identity', () => {
    expect(
      onPremRegisterIdentityFromMyself({
        display: 'Ada Lovelace',
        email: '  Ada@Example.com  ',
        uid: 42,
      })
    ).toEqual({
      displayName: 'Ada Lovelace',
      email: 'ada@example.com',
      trackerUserId: '42',
    });
  });

  it('throws when email is missing', () => {
    expect(() => onPremRegisterIdentityFromMyself({ uid: 1 })).toThrow(TrackerApiConfigError);
  });

  it('falls back to the form Atlassian email when /myself hides emailAddress', () => {
    expect(onPremRegisterIdentityFromMyself({ uid: 1 }, ' Ada@example.com ')).toEqual({
      displayName: 'ada',
      email: 'ada@example.com',
      trackerUserId: '1',
    });
  });
});
