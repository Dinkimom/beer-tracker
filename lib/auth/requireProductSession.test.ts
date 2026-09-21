import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getProductUserIdFromRequest } from './productSession';
import { requireProductSession } from './requireProductSession';

vi.mock('./productSession', () => ({
  getProductUserIdFromRequest: vi.fn(),
}));

describe('requireProductSession', () => {
  beforeEach(() => {
    vi.mocked(getProductUserIdFromRequest).mockReset();
  });

  it('returns 401 response when unauthenticated', () => {
    vi.mocked(getProductUserIdFromRequest).mockReturnValue(null);
    const r = requireProductSession(new Request('http://localhost/'));
    if ('userId' in r) {
      expect.fail('expected error response');
    }
    expect(r.response.status).toBe(401);
  });

  it('returns userId when authenticated', () => {
    vi.mocked(getProductUserIdFromRequest).mockReturnValue('user-1');
    const r = requireProductSession(new Request('http://localhost/'));
    expect('userId' in r && r.userId).toBe('user-1');
  });
});
