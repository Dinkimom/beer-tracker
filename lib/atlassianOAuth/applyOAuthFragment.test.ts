import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  clearAtlassianOAuthFragmentFromLocation,
  peekAtlassianOAuthFragmentFromLocation,
} from './applyOAuthFragment';
import { encodeAtlassianOAuthFragment } from './fragmentPayload';

describe('peekAtlassianOAuthFragmentFromLocation', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('reads tokens without calling history.replaceState', () => {
    const fragment = encodeAtlassianOAuthFragment({
      accessToken: 'access',
      cloudId: 'cloud-1',
      expiresAt: Date.now() + 60_000,
      refreshToken: 'refresh',
    });
    const replaceState = vi.fn();
    vi.stubGlobal('window', {
      history: { replaceState },
      location: {
        hash: `#${fragment}`,
        href: `https://app.example/auth-setup#${fragment}`,
        pathname: '/auth-setup',
        search: '',
      },
    });

    const tokens = peekAtlassianOAuthFragmentFromLocation();
    expect(tokens?.accessToken).toBe('access');
    expect(tokens?.cloudId).toBe('cloud-1');
    expect(replaceState).not.toHaveBeenCalled();

    clearAtlassianOAuthFragmentFromLocation();
    expect(replaceState).toHaveBeenCalledWith(null, '', '/auth-setup');
  });
});
