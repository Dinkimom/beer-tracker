import { describe, expect, it } from 'vitest';

import { issueChangelogBatchRecordFromCacheMap } from './issueChangelogResolve';

describe('issueChangelogBatchRecordFromCacheMap', () => {
  it('fills empty for missing keys; object keys dedupe duplicates in input order', () => {
    const cache = new Map([
      [
        'A',
        {
          changelog: [{ id: '1', type: 'IssueCreated', updatedAt: 't' }],
          comments: [],
        },
      ],
    ]);
    const out = issueChangelogBatchRecordFromCacheMap(['B', 'A', 'B'], cache);
    expect(Object.keys(out)).toEqual(['B', 'A']);
    expect(out.A.changelog).toHaveLength(1);
    expect(out.B).toEqual({ changelog: [], comments: [] });
  });
});
