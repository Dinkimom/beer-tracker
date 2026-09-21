import { describe, expect, it } from 'vitest';

import { wrapIssueSnapshotForStorage } from '@/lib/issueTrackerProvider/snapshotEnvelope';

import { issueDataSprintContains, sprintArrayContainsSprint } from './sprintMembership';

describe('sprintArrayContainsSprint', () => {
  it('принимает один объект спринта, не только массив', () => {
    expect(sprintArrayContainsSprint({ display: 'Sprint A', id: '7' }, 'Sprint A', undefined)).toBe(true);
  });
});

describe('issueDataSprintContains', () => {
  it('true если в issue_data.sprint есть наш спринт', () => {
    const raw = {
      key: 'X-1',
      sprint: [{ display: 'My Sprint', id: '10' }],
    };
    expect(issueDataSprintContains(raw, 'My Sprint', '10')).toBe(true);
  });

  it('false если спринт уже убран из задачи', () => {
    const raw = {
      key: 'X-1',
      sprint: [{ display: 'Other', id: '2' }],
    };
    expect(issueDataSprintContains(raw, 'My Sprint', '10')).toBe(false);
  });

  it('true для envelope с тем же inner sprint', () => {
    const raw = {
      key: 'X-1',
      sprint: [{ display: 'My Sprint', id: '10' }],
    };
    expect(
      issueDataSprintContains(wrapIssueSnapshotForStorage('yandex-tracker', raw), 'My Sprint', '10')
    ).toBe(true);
  });
});
