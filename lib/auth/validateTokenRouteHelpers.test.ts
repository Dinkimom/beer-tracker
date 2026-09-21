import { describe, expect, it } from 'vitest';

import { validateTokenErrorResponse } from './validateTokenRouteHelpers';

describe('validateTokenErrorResponse', () => {
  it('maps tracker 403 to a Cloud Org ID hint instead of blaming only the token', async () => {
    const res = validateTokenErrorResponse({
      message: 'Request failed with status code 403',
      response: { data: { errorCode: 620345 }, status: 403 },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { error: string; valid: boolean };
    expect(body.valid).toBe(false);
    expect(body.error).toContain('Cloud Org ID');
  });
});
