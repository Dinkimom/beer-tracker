import type { ChangelogEntry } from '@/types/tracker';

import { describe, expect, it } from 'vitest';

import { processChangelog } from './processChangelog';

function statusChange(
  id: string,
  updatedAt: string,
  fromKey: string | null,
  toKey: string
): ChangelogEntry {
  return {
    fields: [
      {
        field: { display: 'status', id: 'status' },
        from: fromKey ? { display: fromKey, id: fromKey, key: fromKey } : null,
        to: { display: toKey, id: toKey, key: toKey },
      },
    ],
    id,
    type: 'IssueUpdate',
    updatedAt,
  };
}

describe('processChangelog', () => {
  it('starts the fact history when Jira already has a from status', () => {
    const durations = processChangelog([
      statusChange('1', '2026-09-22T10:00:00.000+0700', 'research', 'inprogress'),
      statusChange('2', '2026-09-23T12:00:00.000+0700', 'inprogress', 'inreview'),
    ]);
    expect(durations.map((duration) => duration.statusKey)).toEqual(['inprogress', 'inreview']);
    expect(durations[1]?.endTime).toBeNull();
  });

  it('still accepts a Tracker entry whose first status has no from', () => {
    const durations = processChangelog([
      statusChange('1', '2026-09-22T10:00:00.000Z', null, 'inprogress'),
    ]);
    expect(durations.map((duration) => duration.statusKey)).toEqual(['inprogress']);
  });

  it('drops a later transition that does not continue the chain', () => {
    const durations = processChangelog([
      statusChange('1', '2026-09-22T10:00:00.000Z', 'research', 'inprogress'),
      statusChange('2', '2026-09-23T12:00:00.000Z', 'review', 'closed'),
    ]);
    expect(durations.map((duration) => duration.statusKey)).toEqual(['inprogress']);
  });
});
