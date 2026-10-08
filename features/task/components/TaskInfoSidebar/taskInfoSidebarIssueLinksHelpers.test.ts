import { describe, expect, it } from 'vitest';

import {
  groupIssueLinksByRelationship,
  issueLinkRelationshipI18nKey,
} from './taskInfoSidebarIssueLinksHelpers';

describe('taskInfoSidebarIssueLinksHelpers', () => {
  it('groups links in canonical relationship order', () => {
    const groups = groupIssueLinksByRelationship([
      {
        id: '1',
        direction: 'outward',
        relationship: 'duplicates',
        linkedIssueKey: 'A-1',
      },
      {
        id: '2',
        direction: 'outward',
        relationship: 'blocks',
        linkedIssueKey: 'A-2',
      },
      {
        id: '3',
        direction: 'outward',
        relationship: 'relates',
        linkedIssueKey: 'A-3',
      },
    ]);

    expect(groups.map((group) => group.relationship)).toEqual([
      'relates',
      'blocks',
      'duplicates',
    ]);
  });

  it('builds i18n keys for relationship labels', () => {
    expect(issueLinkRelationshipI18nKey('blocked_by')).toBe(
      'sprintPlanner.taskInfo.issueLinks.types.blocked_by'
    );
  });
});
