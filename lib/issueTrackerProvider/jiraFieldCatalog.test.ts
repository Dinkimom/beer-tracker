import { afterEach, describe, expect, it, vi } from 'vitest';

import { clearJiraFieldCatalogCacheForTests, loadJiraFieldCatalog } from './jiraFieldCatalog';

afterEach(() => {
  clearJiraFieldCatalogCacheForTests();
});

function apiWithGet(get: ReturnType<typeof vi.fn>, baseURL = 'https://jira.example.com/rest/api/2') {
  return { defaults: { baseURL }, get } as never;
}

describe('loadJiraFieldCatalog', () => {
  it('fetches /field once per base URL, sharing in-flight and cached results', async () => {
    const catalog = [{ id: 'customfield_10016', name: 'Story Points' }];
    const get = vi.fn().mockResolvedValue({ data: catalog });
    const api = apiWithGet(get);

    const [first, second] = await Promise.all([loadJiraFieldCatalog(api), loadJiraFieldCatalog(api)]);
    const third = await loadJiraFieldCatalog(api);

    expect(first).toEqual(catalog);
    expect(second).toEqual(catalog);
    expect(third).toEqual(catalog);
    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith('/field');
  });

  it('keeps separate entries per Jira site', async () => {
    const get = vi.fn().mockResolvedValue({ data: [] });

    await loadJiraFieldCatalog(apiWithGet(get, 'https://a.example.com/rest/api/2'));
    await loadJiraFieldCatalog(apiWithGet(get, 'https://b.example.com/rest/api/2'));

    expect(get).toHaveBeenCalledTimes(2);
  });

  it('does not cache failures', async () => {
    const get = vi
      .fn()
      .mockRejectedValueOnce(new Error('503'))
      .mockResolvedValueOnce({ data: [{ id: 'duedate' }] });
    const api = apiWithGet(get);

    await expect(loadJiraFieldCatalog(api)).rejects.toThrow('503');
    await expect(loadJiraFieldCatalog(api)).resolves.toEqual([{ id: 'duedate' }]);
  });
});
