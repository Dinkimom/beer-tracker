import { describe, expect, it } from 'vitest';

import { pickAtlassianSite } from './tokenExchange';

describe('pickAtlassianSite', () => {
  it('returns the first site cloudId and address', () => {
    expect(
      pickAtlassianSite([
        { id: ' cloud-1 ', name: 'Acme', url: ' https://acme.atlassian.net ' },
        { id: 'cloud-2', url: 'https://other.atlassian.net' },
      ])
    ).toEqual({ cloudId: 'cloud-1', siteUrl: 'https://acme.atlassian.net' });
  });

  it('keeps the cloudId when Atlassian omits the site address', () => {
    expect(pickAtlassianSite([{ id: 'cloud-1' }])).toEqual({ cloudId: 'cloud-1', siteUrl: '' });
  });

  it('returns null when the account has no Jira sites', () => {
    expect(pickAtlassianSite([])).toBeNull();
  });
});
