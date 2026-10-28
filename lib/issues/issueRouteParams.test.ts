import { describe, expect, it } from 'vitest';

import { resolveIssueRouteParams } from './issueRouteParams';

async function errorOf(result: Awaited<ReturnType<typeof resolveIssueRouteParams>>) {
  if (!('response' in result)) throw new Error('expected 400');
  expect(result.response.status).toBe(400);
  return ((await result.response.json()) as { error: string }).error;
}

describe('resolveIssueRouteParams', () => {
  it('returns the issue key and the other segments', async () => {
    const result = await resolveIssueRouteParams(Promise.resolve({ issueKey: 'BT-1', itemId: '7' }), ['itemId']);
    expect(result).toEqual({ issueKey: 'BT-1', params: { issueKey: 'BT-1', itemId: '7' } });
  });

  it('rejects an empty or too long issue key', async () => {
    expect(await errorOf(await resolveIssueRouteParams({ issueKey: '' }))).toBe('issueKey is required');
    expect(await errorOf(await resolveIssueRouteParams({ issueKey: 'X'.repeat(51) }))).toBe('issueKey is required');
  });

  it('names every required segment when one is missing', async () => {
    const result = await resolveIssueRouteParams({ issueKey: 'BT-1', linkId: '' }, ['linkId']);
    expect(await errorOf(result)).toBe('issueKey and linkId are required');
  });
});
