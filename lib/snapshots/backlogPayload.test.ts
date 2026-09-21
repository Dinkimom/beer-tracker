import { describe, expect, it } from 'vitest';

import { wrapIssueSnapshotForStorage } from '@/lib/issueTrackerProvider/snapshotEnvelope';

import {
  issuePayloadHasActiveSprintField,
  issuePayloadIsBacklogBySprint,
  issuePayloadMatchesBacklogFilters,
  issuePayloadMatchesQueueFilter,
  issuePayloadMatchesStatusExclusion,
  issuePayloadMatchesTypeKeys,
} from './backlogPayload';

describe('issuePayloadIsBacklogBySprint', () => {
  it('treats missing sprint as backlog', () => {
    expect(issuePayloadIsBacklogBySprint({ key: 'X-1' })).toBe(true);
  });

  it('treats null sprint as backlog', () => {
    expect(issuePayloadIsBacklogBySprint({ sprint: null })).toBe(true);
  });

  it('treats empty array as backlog', () => {
    expect(issuePayloadIsBacklogBySprint({ sprint: [] })).toBe(true);
  });

  it('treats non-empty array as not backlog', () => {
    expect(
      issuePayloadIsBacklogBySprint({
        sprint: [{ id: '1', display: 'S1' }],
      })
    ).toBe(false);
  });

  it('treats non-empty trimmed string as not backlog', () => {
    expect(issuePayloadIsBacklogBySprint({ sprint: '  foo  ' })).toBe(false);
  });

  it('treats blank string as backlog', () => {
    expect(issuePayloadIsBacklogBySprint({ sprint: '   ' })).toBe(true);
  });

  it('treats object with id as not backlog', () => {
    expect(
      issuePayloadIsBacklogBySprint({ sprint: { id: 's', display: 'S' } })
    ).toBe(false);
  });

  it('treats empty object as backlog', () => {
    expect(issuePayloadIsBacklogBySprint({ sprint: {} })).toBe(true);
  });

  it('treats object with only unrelated keys as backlog', () => {
    expect(issuePayloadIsBacklogBySprint({ sprint: { foo: 1 } })).toBe(true);
  });
});

describe('issuePayloadHasActiveSprintField', () => {
  it('is inverse of backlog for common shapes', () => {
    const samples = [
      {},
      { sprint: null },
      { sprint: [] },
      { sprint: [{ id: '1', display: 'A' }] },
      { sprint: 'x' },
    ];
    for (const p of samples) {
      expect(issuePayloadHasActiveSprintField(p)).toBe(
        !issuePayloadIsBacklogBySprint(p)
      );
    }
  });
});

describe('issuePayloadMatchesQueueFilter', () => {
  it('matches queue.key', () => {
    expect(
      issuePayloadMatchesQueueFilter({ queue: { key: 'DEV', id: '99' } }, 'DEV')
    ).toBe(true);
  });

  it('matches queue.id', () => {
    expect(
      issuePayloadMatchesQueueFilter({ queue: { key: 'DEV', id: '99' } }, '99')
    ).toBe(true);
  });

  it('matches flat queue string', () => {
    expect(issuePayloadMatchesQueueFilter({ queue: 'DEV' }, 'DEV')).toBe(true);
  });

  it('skips filter when key empty', () => {
    expect(issuePayloadMatchesQueueFilter({ queue: 'OTHER' }, '')).toBe(true);
    expect(issuePayloadMatchesQueueFilter({ queue: 'OTHER' }, null)).toBe(true);
  });
});

describe('issuePayloadMatchesTypeKeys', () => {
  it('accepts task and bug by default', () => {
    expect(
      issuePayloadMatchesTypeKeys({ type: { key: 'task', display: 't' } })
    ).toBe(true);
    expect(
      issuePayloadMatchesTypeKeys({ type: { key: 'bug', display: 'b' } })
    ).toBe(true);
    expect(
      issuePayloadMatchesTypeKeys({ type: { key: 'story', display: 's' } })
    ).toBe(false);
  });
});

describe('issuePayloadMatchesStatusExclusion', () => {
  it('excludes closed by default', () => {
    expect(
      issuePayloadMatchesStatusExclusion({
        status: { key: 'closed', display: 'c' },
      })
    ).toBe(false);
    expect(
      issuePayloadMatchesStatusExclusion({
        status: { key: 'open', display: 'o' },
      })
    ).toBe(true);
  });

  it('allows missing status', () => {
    expect(issuePayloadMatchesStatusExclusion({})).toBe(true);
  });
});

describe('issuePayloadMatchesBacklogFilters', () => {
  const base = {
    key: 'X-1',
    summary: 't',
    self: 'u',
    type: { key: 'task', display: 'Task' },
    status: { key: 'open', display: 'Open' },
    queue: { key: 'Q1', id: '1' },
    sprint: [] as const,
  };

  it('matches full backlog row', () => {
    expect(
      issuePayloadMatchesBacklogFilters(base, { trackerQueueKey: 'Q1' })
    ).toBe(true);
  });

  it('fails queue mismatch', () => {
    expect(
      issuePayloadMatchesBacklogFilters(base, { trackerQueueKey: 'OTHER' })
    ).toBe(false);
  });

  it('fails when sprint active', () => {
    expect(
      issuePayloadMatchesBacklogFilters(
        { ...base, sprint: [{ id: '1', display: 'S' }] },
        { trackerQueueKey: 'Q1' }
      )
    ).toBe(false);
  });

  it('allows in-sprint when onlyWithoutSprint false', () => {
    expect(
      issuePayloadMatchesBacklogFilters(
        { ...base, sprint: [{ id: '1', display: 'S' }] },
        { trackerQueueKey: 'Q1', onlyWithoutSprint: false }
      )
    ).toBe(true);
  });

  it('matches the same backlog row when stored as a snapshot envelope', () => {
    expect(
      issuePayloadMatchesBacklogFilters(wrapIssueSnapshotForStorage('yandex-tracker', base), {
        trackerQueueKey: 'Q1',
      })
    ).toBe(true);
  });
});
