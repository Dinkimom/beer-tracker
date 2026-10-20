import { beforeEach, describe, expect, it, vi } from 'vitest';

const postMock = vi.fn();

vi.mock('../plannerBeerTrackerApiOverride', () => ({
  getPlannerBeerTrackerApi: () => ({
    post: postMock,
  }),
}));

import { fetchIssueLinksBatch } from './issues';

describe('fetchIssueLinksBatch', () => {
  beforeEach(() => {
    postMock.mockReset();
  });

  it('returns empty array without calling the API', async () => {
    await expect(fetchIssueLinksBatch([])).resolves.toEqual([]);
    expect(postMock).not.toHaveBeenCalled();
  });

  it('posts a single chunk when keys fit the API max', async () => {
    const keys = Array.from({ length: 80 }, (_, i) => `T-${i}`);
    postMock.mockResolvedValue({
      data: { links: [{ id: '1', fromIssueKey: 'T-0', toIssueKey: 'T-1' }] },
    });

    const links = await fetchIssueLinksBatch(keys);

    expect(postMock).toHaveBeenCalledTimes(1);
    expect(postMock).toHaveBeenCalledWith('/issues/links/batch', { issueKeys: keys });
    expect(links).toHaveLength(1);
  });

  it('chunks requests when keys exceed the API max of 80', async () => {
    const keys = Array.from({ length: 103 }, (_, i) => `T-${i}`);
    postMock
      .mockResolvedValueOnce({
        data: {
          links: [
            {
              id: 'a',
              fromIssueKey: 'T-0',
              toIssueKey: 'T-1',
              direction: 'outward',
              relationship: 'relates',
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          links: [
            {
              id: 'b',
              fromIssueKey: 'T-80',
              toIssueKey: 'T-81',
              direction: 'outward',
              relationship: 'blocks',
            },
          ],
        },
      });

    const links = await fetchIssueLinksBatch(keys);

    expect(postMock).toHaveBeenCalledTimes(2);
    expect(postMock).toHaveBeenNthCalledWith(1, '/issues/links/batch', {
      issueKeys: keys.slice(0, 80),
    });
    expect(postMock).toHaveBeenNthCalledWith(2, '/issues/links/batch', {
      issueKeys: keys.slice(80),
    });
    expect(links.map((link) => link.id)).toEqual(['a', 'b']);
  });
});
