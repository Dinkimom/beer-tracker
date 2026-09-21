import { describe, expect, it } from 'vitest';

import { handleLinkPreviewGet } from './linkPreviewRouteHelpers';

describe('handleLinkPreviewGet', () => {
  it('returns 400 for a blocked url without fetching', async () => {
    const response = await handleLinkPreviewGet(`https://${[127, 0, 0, 1].join('.')}/`);
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Url host is not allowed' });
  });
});
