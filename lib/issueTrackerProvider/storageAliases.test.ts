import { describe, expect, it } from 'vitest';

import {
  readIssueTrackerExternalOrgId,
  readIssueTrackerTeamBoardId,
  readIssueTrackerTeamQueueKey,
  toIssueTrackerOrganizationConnection,
  toIssueTrackerTeamBinding,
  mergeIssueTrackerQueueKeys,
  normalizeIssueTrackerQueueKeys,
  uniqueIssueTrackerQueueKeysFromTeams,
} from './storageAliases';

describe('issueTrackerProvider storageAliases', () => {
  it('reads organization external org id from legacy column', () => {
    expect(readIssueTrackerExternalOrgId({ tracker_org_id: '  cloud-42  ' })).toBe('cloud-42');
    expect(toIssueTrackerOrganizationConnection({ tracker_org_id: 'cloud-42' })).toEqual({
      externalOrgId: 'cloud-42',
    });
  });

  it('reads team board and queue bindings', () => {
    const team = {
      tracker_board_id: '15',
      tracker_queue_key: ' TEAM ',
    };
    expect(toIssueTrackerTeamBinding(team)).toEqual({
      boardId: '15',
      queueKey: 'TEAM',
    });
    expect(readIssueTrackerTeamBoardId(team)).toBe('15');
    expect(readIssueTrackerTeamQueueKey(team)).toBe('TEAM');
  });

  it('collects unique queue keys from teams', () => {
    expect(
      uniqueIssueTrackerQueueKeysFromTeams([
        { tracker_queue_key: 'ST' },
        { tracker_queue_key: 'BT' },
        { tracker_queue_key: 'ST' },
        { tracker_queue_key: '  ' },
      ])
    ).toEqual(['ST', 'BT']);
  });

  it('merges team queues with extra queues', () => {
    expect(mergeIssueTrackerQueueKeys(['RND', ' PAY '], ['PAY', 'OPS', 'RND'])).toEqual([
      'RND',
      'PAY',
      'OPS',
    ]);
    expect(normalizeIssueTrackerQueueKeys([' OPS ', 'OPS', ''])).toEqual(['OPS']);
  });
});
